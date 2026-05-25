// SalesSync v5.2 — Backend Node.js
// Magalu corrigido com estrutura real da API
const express = require('express');
const { Pool } = require('pg');
const axios   = require('axios');
const crypto  = require('crypto');
const cors    = require('cors');
const jwt     = require('jsonwebtoken');
let PDFDocument = null;
let bwipjs = null;
let PDFLib = null;
try { PDFDocument = require('pdfkit'); } catch {}
try { bwipjs = require('bwip-js'); } catch {}
try { PDFLib = require('pdf-lib'); } catch {}
require('dotenv').config();

const app = express();
app.use(cors());
app.use(express.json());

const db = new Pool({ connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false } });
db.connect()
  .then(async () => {
    console.log('✅ Supabase conectado!');
    await ensureProductSchema();
  })
  .catch(e => console.error('❌ Erro DB:', e.message));

const CACHE = {};
const CACHE_TTL = 15 * 60 * 1000;

// CPFs de teste do ambiente Magalu — filtrar fora
const MAGALU_TEST_DOCUMENTS = ['39743407006', '00000000000', '12345678909'];


async function ensureProductSchema() {
  try {
    await db.query(`ALTER TABLE products ADD COLUMN IF NOT EXISTS platform TEXT DEFAULT 'geral'`);
    await db.query(`ALTER TABLE products ADD COLUMN IF NOT EXISTS tax_pct NUMERIC(10,4)`);
    await db.query(`ALTER TABLE products ADD COLUMN IF NOT EXISTS fee_pct NUMERIC(10,4)`);
    await db.query(`ALTER TABLE products ADD COLUMN IF NOT EXISTS shipping_fee NUMERIC(12,2)`);

    // Se existia UNIQUE(user_id, sku), ele impede o mesmo SKU em plataformas diferentes.
    // Remove somente constraints únicas antigas que não possuem a coluna platform.
    const { rows } = await db.query(`
      SELECT con.conname
      FROM pg_constraint con
      JOIN pg_class rel ON rel.oid = con.conrelid
      JOIN pg_namespace nsp ON nsp.oid = rel.relnamespace
      WHERE rel.relname = 'products'
        AND con.contype = 'u'
        AND pg_get_constraintdef(con.oid) ILIKE '%user_id%'
        AND pg_get_constraintdef(con.oid) ILIKE '%sku%'
        AND pg_get_constraintdef(con.oid) NOT ILIKE '%platform%'
    `);
    for (const r of rows) {
      await db.query(`ALTER TABLE products DROP CONSTRAINT IF EXISTS ${r.conname}`);
      console.log('[Products] constraint antiga removida:', r.conname);
    }

    await db.query(`CREATE UNIQUE INDEX IF NOT EXISTS products_user_platform_sku_uidx ON products(user_id, platform, sku)`);
    await db.query(`UPDATE products SET platform='geral' WHERE platform IS NULL OR platform=''`);
    console.log('✅ Products schema OK: custo/imposto/tarifa/frete por plataforma + SKU');
  } catch (e) {
    console.error('[Products schema]', e.message);
  }
}

function auth(req, res, next) {
  // Aceita token pelo header Authorization ou pela query string.
  // A query é necessária para abrir PDF direto em nova aba via window.open(),
  // porque o navegador não envia header Authorization nesse caso.
  const headerToken = req.headers.authorization?.startsWith('Bearer ')
    ? req.headers.authorization.split(' ')[1]
    : null;
  const queryToken = req.query?.token ? String(req.query.token) : null;
  const token = headerToken || queryToken;

  if (!token) return res.status(401).json({ error: 'Token não fornecido' });

  try {
    req.user = jwt.verify(token, process.env.JWT_SECRET);
    next();
  } catch {
    res.status(401).json({ error: 'Token inválido' });
  }
}

// ── AUTH ──
app.post('/api/auth/register', async (req, res) => {
  const { name, email, password, cnpj } = req.body;
  if (!name || !email || !password) return res.status(400).json({ error: 'name, email e password são obrigatórios' });
  try {
    const { rows } = await db.query(
      `INSERT INTO users (name,email,password_hash,cnpj) VALUES ($1,$2,crypt($3,gen_salt('bf')),$4) RETURNING id,name,email,plan`,
      [name, email, password, cnpj || null]
    );
    const token = jwt.sign({ id: rows[0].id, email }, process.env.JWT_SECRET, { expiresIn: '30d' });
    res.json({ success: true, token, user: rows[0] });
  } catch (e) {
    if (e.code === '23505') return res.status(409).json({ error: 'E-mail já cadastrado' });
    res.status(500).json({ error: e.message });
  }
});

app.post('/api/auth/login', async (req, res) => {
  const { email, password } = req.body;
  try {
    const { rows } = await db.query(
      `SELECT id,name,email,plan FROM users WHERE email=$1 AND password_hash=crypt($2,password_hash) AND is_active=true`,
      [email, password]
    );
    if (!rows.length) return res.status(401).json({ error: 'E-mail ou senha incorretos' });
    const token = jwt.sign({ id: rows[0].id, email }, process.env.JWT_SECRET, { expiresIn: '30d' });
    res.json({ success: true, token, user: rows[0] });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// ── CONTAS ──
app.get('/api/accounts', auth, async (req, res) => {
  try {
    const { rows } = await db.query(
      `SELECT id,platform,shop_name,seller_email,platform_shop_id,mode,is_active,last_sync_at,
              (access_token IS NOT NULL) AS is_connected
       FROM marketplace_accounts WHERE user_id=$1 AND is_active=true ORDER BY platform`,
      [req.user.id]
    );
    res.json({ success: true, data: rows });
  } catch(e) { res.status(500).json({ error: e.message }); }
});

app.post('/api/accounts/:platform/disconnect', auth, async (req, res) => {
  try {
    await db.query(
      `UPDATE marketplace_accounts SET access_token=NULL,refresh_token=NULL,token_expires_at=NULL,is_active=false,updated_at=NOW() WHERE user_id=$1 AND platform=$2`,
      [req.user.id, req.params.platform]
    );
    Object.keys(CACHE).forEach(k => { if (k.startsWith(req.user.id)) delete CACHE[k]; });
    res.json({ success: true });
  } catch(e) { res.status(500).json({ error: e.message }); }
});

// ── PRODUTOS ──
function normPlatform(v) {
  return String(v || 'geral').trim().toLowerCase();
}
function normSku(v) {
  return String(v || '').trim();
}

app.get('/api/products', auth, async (req, res) => {
  try {
    const { rows } = await db.query(
      `SELECT id, sku, name, cost, COALESCE(platform,'geral') AS platform, tax_pct, fee_pct, shipping_fee, description, updated_at
       FROM products
       WHERE user_id=$1 AND is_active=true
       ORDER BY platform, sku`,
      [req.user.id]
    );
    res.json({ success: true, data: rows });
  } catch(e) { res.status(500).json({ error: e.message }); }
});

app.post('/api/products', auth, async (req, res) => {
  const sku = normSku(req.body.sku);
  const platform = normPlatform(req.body.platform);
  const { name, description } = req.body;
  const cost = Number(req.body.cost || 0);
  const taxPct = req.body.tax_pct === '' || req.body.tax_pct === undefined || req.body.tax_pct === null
    ? null
    : Number(req.body.tax_pct || 0);
  const feePct = req.body.fee_pct === '' || req.body.fee_pct === undefined || req.body.fee_pct === null
    ? null
    : Number(req.body.fee_pct || 0);
  const shippingFee = req.body.shipping_fee === '' || req.body.shipping_fee === undefined || req.body.shipping_fee === null
    ? null
    : Number(req.body.shipping_fee || 0);

  if (!sku || !name) return res.status(400).json({ error: 'SKU e nome são obrigatórios' });

  try {
    const { rows } = await db.query(
      `INSERT INTO products (user_id, platform, sku, name, cost, tax_pct, fee_pct, shipping_fee, description)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)
       ON CONFLICT (user_id, platform, sku) DO UPDATE SET
         name=EXCLUDED.name,
         cost=EXCLUDED.cost,
         tax_pct=EXCLUDED.tax_pct,
         fee_pct=EXCLUDED.fee_pct,
         shipping_fee=EXCLUDED.shipping_fee,
         description=EXCLUDED.description,
         is_active=true,
         updated_at=NOW()
       RETURNING *`,
      [req.user.id, platform, sku, name, cost, taxPct, feePct, shippingFee, description || null]
    );
    Object.keys(CACHE).forEach(k => { if (k.startsWith(req.user.id)) delete CACHE[k]; });
    res.json({ success: true, data: rows[0] });
  } catch(e) { res.status(500).json({ error: e.message }); }
});

// Compatível com o frontend antigo: PUT /api/products/:sku/cost com platform no body/query
app.put('/api/products/:sku/cost', auth, async (req, res) => {
  const sku = normSku(req.params.sku);
  const platform = normPlatform(req.body.platform || req.query.platform);
  const cost = Number(req.body.cost || 0);
  const taxPct = req.body.tax_pct === '' || req.body.tax_pct === undefined || req.body.tax_pct === null ? null : Number(req.body.tax_pct || 0);
  const feePct = req.body.fee_pct === '' || req.body.fee_pct === undefined || req.body.fee_pct === null ? null : Number(req.body.fee_pct || 0);
  const shippingFee = req.body.shipping_fee === '' || req.body.shipping_fee === undefined || req.body.shipping_fee === null ? null : Number(req.body.shipping_fee || 0);
  try {
    const { rows } = await db.query(
      `INSERT INTO products (user_id, platform, sku, name, cost, tax_pct, fee_pct, shipping_fee)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8)
       ON CONFLICT (user_id, platform, sku) DO UPDATE SET
         cost=EXCLUDED.cost,
         tax_pct=EXCLUDED.tax_pct,
         fee_pct=EXCLUDED.fee_pct,
         shipping_fee=EXCLUDED.shipping_fee,
         is_active=true,
         updated_at=NOW()
       RETURNING *`,
      [req.user.id, platform, sku, sku, cost, taxPct, feePct, shippingFee]
    );

    Object.keys(CACHE).forEach(k => { if (k.startsWith(req.user.id)) delete CACHE[k]; });
    res.json({ success: true, data: rows[0] });
  } catch(e) { res.status(500).json({ error: e.message }); }
});


// Apaga um SKU específico da aba de custos
app.delete('/api/products/:id', auth, async (req, res) => {
  const id = Number(req.params.id);
  if (!Number.isFinite(id)) return res.status(400).json({ error: 'ID inválido' });
  try {
    const { rowCount } = await db.query(
      `DELETE FROM products WHERE id=$1 AND user_id=$2`,
      [id, req.user.id]
    );
    Object.keys(CACHE).forEach(k => { if (k.startsWith(req.user.id)) delete CACHE[k]; });
    res.json({ success: true, deleted: rowCount });
  } catch(e) { res.status(500).json({ error: e.message }); }
});

// Limpa todos os custos/configurações do usuário logado
app.delete('/api/products', auth, async (req, res) => {
  try {
    const { rowCount } = await db.query(
      `DELETE FROM products WHERE user_id=$1`,
      [req.user.id]
    );
    Object.keys(CACHE).forEach(k => { if (k.startsWith(req.user.id)) delete CACHE[k]; });
    res.json({ success: true, deleted: rowCount });
  } catch(e) { res.status(500).json({ error: e.message }); }
});

// Zera valores, mas mantém SKUs cadastrados
app.post('/api/products/reset-values', auth, async (req, res) => {
  try {
    const { rowCount } = await db.query(
      `UPDATE products
       SET cost=0, tax_pct=NULL, fee_pct=NULL, shipping_fee=NULL, updated_at=NOW()
       WHERE user_id=$1`,
      [req.user.id]
    );
    Object.keys(CACHE).forEach(k => { if (k.startsWith(req.user.id)) delete CACHE[k]; });
    res.json({ success: true, updated: rowCount });
  } catch(e) { res.status(500).json({ error: e.message }); }
});

// ── DEBUG MAGALU ──

// Debug por token na query string (para abrir direto no browser)
app.get('/debug/:platform', async (req, res, next) => {
  const token = req.query.token;
  if (!token) return next();
  try {
    req.user = require('jsonwebtoken').verify(token, process.env.JWT_SECRET);
    next();
  } catch { res.status(401).send('Token inválido'); }
});
app.get('/debug/magalu', auth, async (req, res) => {
  const days = parseInt(req.query.days || '30');
  try {
    const { rows } = await db.query(
      `SELECT * FROM marketplace_accounts WHERE user_id=$1 AND platform='magalu' AND is_active=true AND access_token IS NOT NULL LIMIT 1`,
      [req.user.id]
    );
    if (!rows.length) return res.send('<h2 style="font-family:sans-serif;padding:20px;color:red">Magalu não conectado</h2>');
    const acc   = rows[0];
    const since = new Date(Date.now() - days * 86400000).toISOString();
    let rawData = null, endpoint = '', error = '';
    try {
      const { data } = await axios.get('https://api.magalu.com/seller/v1/orders', {
        params: { created_at__gte: since, _limit: 50, _sort: "created_at:desc" },
        headers: { Authorization: `Bearer ${acc.access_token}` }
      });
      rawData = data; endpoint = 'https://api.magalu.com/seller/v1/orders';
    } catch(e) { error = e.response?.status + ' ' + JSON.stringify(e.response?.data||e.message); }
    const orders = rawData?.results || [];
    const html = `<!DOCTYPE html><html lang="pt-BR"><head><meta charset="UTF-8"/>
<title>Debug Magalu</title>
<style>*{box-sizing:border-box;margin:0;padding:0;}body{font-family:'Segoe UI',sans-serif;background:#0D1117;color:#e6edf3;padding:20px;}
h1{color:#A855F7;margin-bottom:4px;}.sub{color:#64748B;font-size:13px;margin-bottom:20px;}
.section{background:#161B26;border:1px solid rgba(255,255,255,.08);border-radius:10px;padding:16px;margin-bottom:16px;}
.section h2{font-size:13px;color:#94A3B8;text-transform:uppercase;letter-spacing:.6px;margin-bottom:12px;}
pre{background:#0D1117;border-radius:8px;padding:12px;overflow-x:auto;font-size:11px;color:#38BDF8;border:1px solid rgba(255,255,255,.06);}
.order-card{background:#1E2535;border-radius:8px;padding:12px;margin-bottom:10px;display:flex;gap:12px;}
.order-img{width:60px;height:60px;border-radius:6px;object-fit:cover;flex-shrink:0;}
.badge{display:inline-block;padding:2px 8px;border-radius:12px;font-size:11px;font-weight:700;}
.green{background:rgba(16,185,129,.15);color:#10B981;}.red{background:rgba(244,63,94,.12);color:#F43F5E;}
.yellow{background:rgba(251,191,36,.12);color:#FBBF24;}.gray{background:rgba(100,116,139,.12);color:#64748B;}
.info-row{display:flex;justify-content:space-between;font-size:12px;padding:4px 0;border-bottom:1px solid rgba(255,255,255,.04);}
.l{color:#64748B;}.v{color:#F8FAFC;font-weight:600;}</style></head><body>
<h1>⚡ Debug Magalu</h1>
<div class="sub">Endpoint: ${endpoint} · Últimos ${days} dias · ${new Date().toLocaleString('pt-BR')}</div>
${error ? `<div style="background:rgba(244,63,94,.1);border:1px solid rgba(244,63,94,.3);border-radius:8px;padding:12px;color:#F43F5E;margin-bottom:16px">${error}</div>` : ''}
<div class="section"><h2>Conta</h2>
<div class="info-row"><span class="l">Shop ID</span><span class="v">${acc.platform_shop_id}</span></div>
<div class="info-row"><span class="l">Nome</span><span class="v">${acc.shop_name}</span></div>
<div class="info-row"><span class="l">Token expira</span><span class="v">${acc.token_expires_at ? new Date(acc.token_expires_at).toLocaleString('pt-BR') : '—'}</span></div>
</div>
<div class="section"><h2>${orders.length} pedidos retornados</h2>
${orders.map(o => {
  const d    = o.deliveries?.[0] || {};
  const item = d.items?.[0] || {};
  const info = item.info || {};
  const img  = info.images?.[0]?.url || null;
  const norm = o.amounts?.normalizer || 100;
  const total= (o.amounts?.total || 0) / norm;
  const comm = (o.amounts?.commission?.total || 0) / norm;
  const fret = (o.amounts?.freight?.total || 0) / norm;
  const isTest = MAGALU_TEST_DOCUMENTS.includes(o.customer?.document_number);
  const sc = {cancelled:'red',canceled:'red',finished:'green',approved:'yellow',shipped:'yellow',delivered:'green'}[o.status]||'gray';
  return `<div class="order-card" style="${isTest?'border:1px solid #F43F5E;opacity:.6':''}">
    ${img ? `<img class="order-img" src="${img}" onerror="this.src='data:image/svg+xml,<svg xmlns=%22http://www.w3.org/2000/svg%22 viewBox=%220 0 1 1%22/>'"/>` : '<div style="width:60px;height:60px;border-radius:6px;background:#0D1117;display:flex;align-items:center;justify-content:center;font-size:24px;flex-shrink:0">📦</div>'}
    <div style="flex:1">
      <div style="font-weight:600;margin-bottom:4px">${info.name || info.description || '—'} ${isTest?'<span class="badge red">⚠ TESTE</span>':''}</div>
      <div style="font-size:11px;color:#64748B;display:flex;gap:8px;flex-wrap:wrap;margin-top:4px">
        <span>ID: ${o.code || o.id}</span>
        <span>SKU: <strong style="color:#A855F7">${info.sku || '—'}</strong></span>
        <span class="badge ${sc}">${o.status}</span>
        <span>R$ ${total.toFixed(2)}</span>
        <span>Comissão: R$ ${comm.toFixed(2)}</span>
        <span>Frete: R$ ${fret.toFixed(2)}</span>
        <span>${new Date(o.created_at).toLocaleDateString('pt-BR')}</span>
        <span>Cliente: ${o.customer?.name}</span>
      </div>
    </div>
  </div>`;
}).join('')}
</div>
<div class="section"><h2>JSON do primeiro pedido</h2><pre>${JSON.stringify(orders[0], null, 2)}</pre></div>
</body></html>`;
    res.send(html);
  } catch(e) { res.send(`<pre style="padding:20px;color:red">${e.message}\n${e.stack}</pre>`); }
});


// ── REFRESH TOKEN ML ──
async function refreshMLToken(account) {
  try {
    const { data } = await axios.post('https://api.mercadolibre.com/oauth/token',
      new URLSearchParams({
        grant_type: 'refresh_token',
        client_id: process.env.ML_CLIENT_ID,
        client_secret: process.env.ML_CLIENT_SECRET,
        refresh_token: account.refresh_token
      }),
      { headers: { 'Content-Type': 'application/x-www-form-urlencoded' } }
    );
    await db.query(
      `UPDATE marketplace_accounts SET access_token=$1, refresh_token=$2, token_expires_at=$3, updated_at=NOW() WHERE id=$4`,
      [data.access_token, data.refresh_token, new Date(Date.now() + data.expires_in * 1000), account.id]
    );
    console.log('[ML] 🔄 Token renovado para', account.shop_name);
    return data.access_token;
  } catch(e) {
    console.error('[ML Refresh]', e.response?.data || e.message);
    return null;
  }
}

// ── FETCH ML ──
function mlShippingStatus(o, shipment) {
  const tags = Array.isArray(o.tags) ? o.tags : [];
  const st = String(shipment?.status || o.shipping?.status || '').toLowerCase();
  const sub = String(shipment?.substatus || '').toLowerCase();

  if (o.status === 'cancelled' || tags.includes('cancelled') || st === 'cancelled') return 'cancelled';
  if (tags.includes('delivered') || st === 'delivered') return 'delivered';
  if (tags.includes('not_delivered')) {
    if (st === 'ready_to_ship') return 'ready_to_ship';
    if (st === 'handling') return 'handling';
    if (st === 'shipped') return 'shipped';
    return 'not_delivered';
  }
  if (st) return st;
  if (tags.includes('paid')) return 'paid_not_shipped';
  return 'unknown';
}

function mlShippingStatusLabel(status) {
  const map = {
    ready_to_ship: 'Pronto p/ enviar',
    handling: 'Preparando',
    not_delivered: 'Pago · não enviado',
    paid_not_shipped: 'Pago · não enviado',
    shipped: 'Enviado',
    delivered: 'Entregue',
    cancelled: 'Cancelado',
    pending: 'Pendente',
    unknown: '—'
  };
  return map[status] || status || '—';
}

async function fetchMLShipmentDetails(token, shipmentId) {
  if (!shipmentId) return null;
  const headers = { Authorization: `Bearer ${token}` };
  try {
    const { data } = await axios.get(`https://api.mercadolibre.com/shipments/${shipmentId}`, { headers });
    return data || null;
  } catch (e) {
    console.error('[ML shipment]', shipmentId, e.response?.status || '', e.response?.data || e.message);
    return null;
  }
}

async function fetchML(acc, days) {
  let token = acc.access_token;
  if (acc.token_expires_at && new Date(acc.token_expires_at) <= new Date(Date.now() + 5*60*1000)) {
    console.log('[ML] Token expirando, renovando...');
    const newToken = await refreshMLToken(acc);
    if (newToken) token = newToken;
  }

  const safeDays = Math.max(1, Math.min(parseInt(days || 30, 10), 90));
  const since = new Date(Date.now() - safeDays * 86400000).toISOString();
  const headers = { Authorization: `Bearer ${token}` };

  // ML retorna no máximo uma página por chamada. Antes estava buscando só limit=50,
  // então, se houvesse muitas vendas, parava no dia 17 ou em qualquer data onde a primeira página acabasse.
  const results = [];
  const limit = 50;
  const maxPages = 20; // até 1000 pedidos por sincronização

  for (let page = 0; page < maxPages; page++) {
    const offset = page * limit;
    const { data } = await axios.get('https://api.mercadolibre.com/orders/search', {
      params: {
        seller: acc.platform_shop_id,
        sort: 'date_desc',
        'order.date_created.from': since,
        limit,
        offset
      },
      headers
    });

    const pageResults = Array.isArray(data.results) ? data.results : [];
    results.push(...pageResults);

    const total = Number(data.paging?.total || 0);
    const returned = Number(data.paging?.limit || limit);
    const currentOffset = Number(data.paging?.offset || offset);

    if (!pageResults.length) break;
    if (total && currentOffset + returned >= total) break;
    if (pageResults.length < limit) break;
  }

  // Segurança contra duplicidade entre páginas.
  const seenOrders = new Set();
  const uniqueResults = results.filter(o => {
    const id = String(o?.id || '');
    if (!id || seenOrders.has(id)) return false;
    seenOrders.add(id);
    return true;
  });

  // Puxa detalhes de envio em lote leve. Se der 403/erro, o pedido continua funcionando.
  const shipmentIds = [...new Set(uniqueResults.map(o => o.shipping?.id).filter(Boolean))];
  const shipmentMap = {};
  await Promise.all(shipmentIds.slice(0, 50).map(async id => {
    const det = await fetchMLShipmentDetails(token, id);
    if (det) shipmentMap[String(id)] = det;
  }));

  const statusMap = {
    paid:'paid', payment_required:'pending', pending:'pending',
    confirmed:'paid', shipped:'shipped', delivered:'delivered',
    cancelled:'cancelled', invalid:'cancelled',
  };

  return uniqueResults.map(o => {
    const item = o.order_items?.[0] || {};
    const shipmentId = o.shipping?.id || null;
    const shipment = shipmentId ? shipmentMap[String(shipmentId)] : null;
    const qty = parseFloat(item?.quantity || 1);
    const totalAmount = parseFloat(o.total_amount || 0);
    const paidAmount = parseFloat(o.paid_amount || o.payments?.[0]?.total_paid_amount || 0);

    // Tarifa real do ML: vem em order_items[].sale_fee.
    const platformFee = (o.order_items || []).reduce((sum, it) => {
      return sum + (parseFloat(it.sale_fee || 0) * parseFloat(it.quantity || 1));
    }, 0);

    // Frete exibido no pagamento do ML. Em muitos pedidos o o.shipping_cost vem null.
    const paymentShippingFee = (o.payments || []).reduce((sum, p) => sum + parseFloat(p.shipping_cost || 0), 0);
    const orderShippingFee = parseFloat(o.shipping_cost || 0);
    const shipmentCost = parseFloat(shipment?.shipping_option?.cost || shipment?.cost || 0);
    const shippingFee = paymentShippingFee || orderShippingFee || shipmentCost || Math.max(0, paidAmount - totalAmount);

    const payment = o.payments?.[0] || {};
    const mlShipStatus = mlShippingStatus(o, shipment);

    return {
      id:               String(o.id),
      platform:         'mercadolivre',
      platform_order_id:String(o.id),
      shipping_id:      o.shipping?.id || null,
      tags:             Array.isArray(o.tags) ? o.tags : [],
      shop_name:        acc.shop_name,
      fulfillment_type: (shipment?.logistic_type || o.shipping?.logistic_type) === 'fulfillment' ? 'full' : 'normal',
      status:           statusMap[o.status] || o.status,
      buyer_name:       o.buyer?.nickname || '',
      buyer_id:         o.buyer?.id || null,
      seller_id:        o.seller?.id || acc.platform_shop_id,
      total_amount:     totalAmount,
      paid_amount:      paidAmount,
      platform_fee:     platformFee,
      shipping_fee:     shippingFee,
      payment_shipping_fee: paymentShippingFee,
      tax_amount:       0,
      quantity:         qty,
      order_date:       o.date_created,
      date_closed:      o.date_closed || null,
      date_last_updated:o.date_last_updated || o.last_updated || null,
      item_title:       item?.item?.title || payment.reason || '',
      item_image:       null,
      item_sku:         item?.item?.seller_sku || item?.item?.seller_custom_field || '',
      item_id:          item?.item?.id || null,
      category_id:      item?.item?.category_id || null,
      unit_price:       parseFloat(item?.unit_price || 0),
      gross_price:      parseFloat(item?.gross_price || item?.unit_price || 0),
      listing_type_id:  item?.listing_type_id || '',
      sale_fee:         platformFee,
      coupon_amount:    parseFloat(o.coupon?.amount || payment.coupon_amount || 0),
      payment_method:   payment.payment_method_id || '',
      payment_type:     payment.payment_type || '',
      installments:     payment.installments || 1,
      payment_status:   payment.status || '',
      payment_status_detail: payment.status_detail || '',
      tags:             Array.isArray(o.tags) ? o.tags : [],
      ml_shipping_id:   shipmentId,
      ml_shipping_status: mlShipStatus,
      ml_shipping_status_label: mlShippingStatusLabel(mlShipStatus),
      ml_shipping_mode: shipment?.mode || shipment?.shipping_mode || o.shipping?.mode || '',
      ml_logistic_type: shipment?.logistic_type || o.shipping?.logistic_type || '',
      ml_tracking_number: shipment?.tracking_number || shipment?.tracking?.number || '',
      ml_tracking_method: shipment?.tracking_method || shipment?.tracking?.method || '',
      ml_receiver_name: shipment?.receiver_address?.receiver_name || '',
      ml_receiver_city: shipment?.receiver_address?.city?.name || '',
      ml_receiver_state: shipment?.receiver_address?.state?.name || '',
      ml_receiver_zip: shipment?.receiver_address?.zip_code || '',
      ml_label_available: Boolean(shipmentId) && !['cancelled','delivered'].includes(mlShipStatus),
    };
  });
}

// ── FETCH SHOPEE ──
function shopeeSign(pid, path, ts, key) {
  return crypto.createHmac('sha256', key).update(`${pid}${path}${ts}`).digest('hex');
}

async function fetchShopee(acc, days) {
  const since = Math.floor((Date.now() - days * 86400000) / 1000);
  const ts = Math.floor(Date.now() / 1000);
  const path = '/api/v2/order/get_order_list';
  const sign = shopeeSign(process.env.SHOPEE_PARTNER_ID, path, ts, process.env.SHOPEE_PARTNER_KEY);
  const { data } = await axios.get(`https://partner.shopeemobile.com${path}`, {
    params: {
      partner_id: process.env.SHOPEE_PARTNER_ID, shop_id: acc.platform_shop_id,
      access_token: acc.access_token, timestamp: ts, sign,
      time_range_field: 'create_time', time_from: since,
      time_to: Math.floor(Date.now() / 1000), page_size: 50, order_status: 'ALL'
    }
  });
  return ((data.response?.order_list) || []).map(o => ({
    id: o.order_sn, platform: 'shopee',
    platform_order_id: o.order_sn, shop_name: acc.shop_name,
    fulfillment_type: 'normal', status: (o.order_status || 'paid').toLowerCase(),
    buyer_name: o.buyer_username || '', total_amount: o.total_amount || 0,
    platform_fee: (o.total_amount || 0) * 0.08, shipping_fee: o.actual_shipping_cost || 0,
    tax_amount: (o.total_amount || 0) * 0.06, quantity: 1,
    order_date: new Date(o.create_time * 1000).toISOString(),
    item_title: o.item_list?.[0]?.item_name || 'Produto Shopee',
    item_image: null, item_sku: o.item_list?.[0]?.item_sku || '',
  }));
}

// ── FETCH MAGALU — estrutura real confirmada pelo debug ──
async function refreshMagaluToken(account) {
  try {
    if (!account.refresh_token) throw new Error('Conta Magalu sem refresh_token');

    const { data } = await axios.post('https://id.magalu.com/oauth/token',
      new URLSearchParams({
        grant_type: 'refresh_token',
        refresh_token: account.refresh_token,
        client_id: process.env.MAGALU_CLIENT_ID,
        client_secret: process.env.MAGALU_CLIENT_SECRET
      }),
      { headers: { 'Content-Type': 'application/x-www-form-urlencoded' } }
    );

    await db.query(
      `UPDATE marketplace_accounts
       SET access_token=$1, refresh_token=COALESCE($2, refresh_token), token_expires_at=$3, updated_at=NOW()
       WHERE id=$4`,
      [data.access_token, data.refresh_token || null, new Date(Date.now() + (data.expires_in || 7200) * 1000), account.id]
    );

    console.log('[Magalu] 🔄 Token renovado');
    return data.access_token;
  } catch(e) {
    const status = e.response?.status;
    const body = e.response?.data || e.message;
    console.error('[Magalu Refresh]', status || '', body);

    // 400/401 normalmente significa refresh_token inválido/expirado ou app/scope diferente.
    // Limpa os tokens para parar o loop de erro; depois é só reconectar Magalu no painel.
    if (status === 400 || status === 401 || String(body).includes('refresh')) {
      await db.query(
        `UPDATE marketplace_accounts
         SET access_token=NULL, refresh_token=NULL, token_expires_at=NULL, updated_at=NOW()
         WHERE id=$1`,
        [account.id]
      ).catch(() => {});
    }
    return null;
  }
}

async function fetchMagalu(acc, days) {
  let token = acc.access_token;
  if (acc.token_expires_at && new Date(acc.token_expires_at) <= new Date()) {
    token = await refreshMagaluToken(acc);
    if (!token) throw new Error('Token Magalu expirado');
  }

  const since = new Date(Date.now() - days * 86400000).toISOString();
  const allOrders = [];
  let offset = 0;
  const limit = 50;

  // Pagina todos os resultados
  while (true) {
    const { data } = await axios.get('https://api.magalu.com/seller/v1/orders', {
      params: { created_at__gte: since, _limit: limit, _offset: offset, _sort: "created_at:desc" },
      headers: { Authorization: `Bearer ${token}` }
    });

    const page = data.results || [];
    allOrders.push(...page);

    console.log(`[Magalu] página offset=${offset}: ${page.length} pedidos`);

    // Para se não tem próxima página
    if (!data.meta?.links?.next || page.length < limit) break;
    offset += limit;
    if (offset > 500) break; // segurança
  }

  console.log(`[Magalu] Total: ${allOrders.length} pedidos`);

  const statusMap = {
    new:        'pending',    // aguardando pagamento
    approved:   'paid',       // aprovado / pago
    processing: 'paid',       // em processamento
    invoiced:   'shipped',    // nota fiscal emitida
    shipped:    'shipped',    // em rota de entrega
    delivered:  'delivered',  // entregue
    finished:   'delivered',  // finalizado
    cancelled:  'cancelled',  // cancelado
    canceled:   'cancelled',
  };

  return allOrders
    // Filtra pedidos de teste da Magalu
    .filter(o => !MAGALU_TEST_DOCUMENTS.includes(o.customer?.document_number))
    .map(o => {
      // Estrutura confirmada pelo debug:
      // o.deliveries[0].items[0].info = { sku, name, images[{url}] }
      // o.amounts = { total, commission, freight, tax, normalizer }
      const delivery = o.deliveries?.[0] || {};
      const item     = delivery.items?.[0] || {};
      const info     = item.info || {};          // ← campo correto!
      const norm     = o.amounts?.normalizer || 100;

      const total      = (o.amounts?.total                  || 0) / norm;
      const commission = (o.amounts?.commission?.total      || 0) / norm;
      const freight    = (o.amounts?.freight?.total         || 0) / norm;
      const tax        = (o.amounts?.tax?.total             || 0) / norm;
      const qty        = item.quantity || 1;

      // Imagem: info.images[0].url
      const image = info.images?.[0]?.url || null;

      // Fulfillment: via shipping.provider.extras.is_fulfillment
      const isFull = delivery.shipping?.provider?.extras?.is_fulfillment === true;

      const orderStatus = (o.status || '').toLowerCase();
      const status = statusMap[orderStatus] || 'paid';

      return {
        id:               String(o.code || o.id),
        platform:         'magalu',
        platform_order_id:String(o.code || o.id),
        shop_name:        delivery.seller?.name || acc.shop_name,
        fulfillment_type: isFull ? 'full' : 'normal',
        status,
        // Dados de entrega para botão/diagnóstico de etiqueta Magalu
        delivery_id:      delivery.id || null,
        shipping_id:      delivery.id || null,
        magalu_delivery_id: delivery.id || null,
        magalu_channel:   o.channel || o.sales_channel || delivery.channel || 'MagazineLuiza',
        magalu_label_available: Boolean(delivery.id) && !isFull && !['cancelled','delivered'].includes(status),
        buyer_name:       o.customer?.name || '',
        total_amount:     total,
        platform_fee:     commission,
        shipping_fee:     freight,
        tax_amount:       tax,
        quantity:         qty,
        order_date:       o.created_at || o.purchased_at || new Date().toISOString(),
        item_title:       info.name || info.description || 'Produto Magalu',
        item_image:       image,
        item_sku:         info.sku || '',
      };
    });
}

// ── ENRIQUECE COM CUSTOS ──
async function enrichWithCosts(orders, userId) {
  const { rows } = await db.query(
    `SELECT sku, COALESCE(platform,'geral') AS platform, cost, tax_pct, fee_pct, shipping_fee
     FROM products
     WHERE user_id=$1 AND is_active=true`,
    [userId]
  );

  const productMap = {};
  rows.forEach(p => {
    const sku = normSku(p.sku);
    const platform = normPlatform(p.platform);
    productMap[`${platform}:${sku}`] = {
      cost: parseFloat(p.cost || 0),
      tax_pct: p.tax_pct === null || p.tax_pct === undefined ? null : parseFloat(p.tax_pct),
      fee_pct: p.fee_pct === null || p.fee_pct === undefined ? null : parseFloat(p.fee_pct),
      shipping_fee: p.shipping_fee === null || p.shipping_fee === undefined ? null : parseFloat(p.shipping_fee)
    };
  });

  return orders.map(o => {
    const sku = normSku(o.item_sku);
    const platform = normPlatform(o.platform);
    const product = productMap[`${platform}:${sku}`] || productMap[`geral:${sku}`] || { cost: 0, tax_pct: null, fee_pct: null, shipping_fee: null };
    const defaults = productMap[`${platform}:__DEFAULT__`] || productMap[`geral:__DEFAULT__`] || { tax_pct: null, fee_pct: null, shipping_fee: null };

    const unit_cost  = parseFloat(product.cost || 0);
    // Primeiro tenta o SKU. Se estiver vazio, usa o padrão da plataforma.
    const tax_pct    = product.tax_pct === null || product.tax_pct === undefined ? defaults.tax_pct : product.tax_pct;
    const fee_pct    = product.fee_pct === null || product.fee_pct === undefined ? defaults.fee_pct : product.fee_pct;
    const ship_fixed = product.shipping_fee === null || product.shipping_fee === undefined ? defaults.shipping_fee : product.shipping_fee;
    const total_cost = unit_cost * (o.quantity || 1);
    const total_amount = parseFloat(o.total_amount || 0);
    const platform_fee = fee_pct === null ? parseFloat(o.platform_fee || 0) : (total_amount * fee_pct / 100);
    const shipping_fee = ship_fixed === null ? parseFloat(o.shipping_fee || 0) : (parseFloat(ship_fixed || 0) * (o.quantity || 1));
    const tax_amount = tax_pct === null ? parseFloat(o.tax_amount || 0) : (total_amount * tax_pct / 100);
    const net_revenue= total_amount - platform_fee - shipping_fee - tax_amount;
    const profit     = o.status === 'cancelled' ? 0 : (net_revenue - total_cost);
    const margin     = o.total_amount > 0 ? (profit / o.total_amount * 100) : 0;

    return {
      ...o,
      unit_cost,
      tax_pct,
      fee_pct,
      platform_fee,
      shipping_fee,
      tax_amount,
      total_cost,
      net_revenue,
      profit,
      profit_margin_pct: margin
    };
  });
}

// ── API PEDIDOS ──
app.get('/api/orders', auth, async (req, res) => {
  const { period = '7', platform, date_from, date_to } = req.query;

  let days = Math.min(Math.max(parseInt(period) || 7, 1), 45);
  let customFrom = null;
  let customTo = null;

  if (date_from && date_to) {
    customFrom = new Date(String(date_from) + 'T00:00:00-03:00');
    customTo = new Date(String(date_to) + 'T23:59:59-03:00');
    if (Number.isFinite(customFrom.getTime()) && Number.isFinite(customTo.getTime())) {
      const selectedRangeDays = Math.ceil((customTo.getTime() - customFrom.getTime()) / 86400000) + 1;
      if (selectedRangeDays < 1) return res.status(400).json({ error: 'Data final precisa ser maior ou igual à inicial' });
      if (selectedRangeDays > 45) return res.status(400).json({ error: 'Período personalizado limitado a 45 dias' });
      const diffDays = Math.ceil((Date.now() - customFrom.getTime()) / 86400000);
      days = Math.min(Math.max(diffDays || selectedRangeDays || 1, 1), 45);
    } else {
      customFrom = null;
      customTo = null;
    }
  }

  try {
    const { rows: accounts } = await db.query(
      `SELECT * FROM marketplace_accounts WHERE user_id=$1 AND is_active=true AND access_token IS NOT NULL`,
      [req.user.id]
    );
    if (!accounts.length) return res.json({ success: true, data: [] });

    let allOrders = [];
    const filtered = platform ? accounts.filter(a => a.platform === platform) : accounts;

    for (const acc of filtered) {
      const cacheKey = `${req.user.id}_${acc.platform}_${days}_${customFrom ? customFrom.toISOString().slice(0,10) : ''}_${customTo ? customTo.toISOString().slice(0,10) : ''}`;
      const cached   = CACHE[cacheKey];
      if (cached && (Date.now() - cached.ts) < CACHE_TTL) {
        allOrders = allOrders.concat(cached.data); continue;
      }
      try {
        let orders = [];
        if (acc.platform === 'mercadolivre') orders = await fetchML(acc, days);
        else if (acc.platform === 'shopee')  orders = await fetchShopee(acc, days);
        else if (acc.platform === 'magalu')  orders = await fetchMagalu(acc, days);

        if (customFrom && customTo) {
          orders = orders.filter(o => {
            const dt = new Date(o.order_date).getTime();
            return Number.isFinite(dt) && dt >= customFrom.getTime() && dt <= customTo.getTime();
          });
        }

        CACHE[cacheKey] = { data: orders, ts: Date.now() };
        allOrders = allOrders.concat(orders);
        await db.query(`UPDATE marketplace_accounts SET last_sync_at=NOW() WHERE id=$1`, [acc.id]);
      } catch(e) {
        console.error(`[FETCH ${acc.platform}]`, e.message);
      }
    }

    const enriched = await enrichWithCosts(allOrders, req.user.id);
    enriched.sort((a, b) => new Date(b.order_date) - new Date(a.order_date));
    res.json({ success: true, data: enriched, total: enriched.length });
  } catch(e) { res.status(500).json({ error: e.message }); }
});

// ── SYNC ──
app.get('/api/sync/:platform', auth, async (req, res) => {
  Object.keys(CACHE).forEach(k => { if (k.startsWith(`${req.user.id}_${req.params.platform}`)) delete CACHE[k]; });
  res.json({ success: true });
});

// ── MERCADO LIVRE: ETIQUETA DE ENVIO ──
app.get('/api/mercadolivre/shipments/:shipmentId/label', async (req, res, next) => {
  if (req.query.token && !req.headers.authorization) {
    try { req.user = jwt.verify(req.query.token, process.env.JWT_SECRET); return next(); }
    catch { return res.status(401).json({ error: 'Token inválido' }); }
  }
  return auth(req, res, next);
}, async (req, res) => {
  const shipmentId = req.params.shipmentId;
  try {
    const { rows } = await db.query(
      `SELECT * FROM marketplace_accounts
       WHERE user_id=$1 AND platform='mercadolivre' AND is_active=true AND access_token IS NOT NULL
       LIMIT 1`,
      [req.user.id]
    );
    if (!rows.length) return res.status(404).json({ error: 'Mercado Livre não conectado' });

    let acc = rows[0];
    let token = acc.access_token;
    if (acc.token_expires_at && new Date(acc.token_expires_at) <= new Date(Date.now() + 5*60*1000)) {
      const newToken = await refreshMLToken(acc);
      if (newToken) token = newToken;
    }

    const headers = { Authorization: `Bearer ${token}` };
    const attempts = [
      `https://api.mercadolibre.com/shipment_labels?shipment_ids=${encodeURIComponent(shipmentId)}&response_type=pdf`,
      `https://api.mercadolibre.com/shipments/${encodeURIComponent(shipmentId)}/labels?response_type=pdf`
    ];

    let lastError = null;
    for (const url of attempts) {
      try {
        const r = await axios.get(url, { headers, responseType: 'arraybuffer', validateStatus: s => s < 500 });
        const ct = String(r.headers['content-type'] || '');
        if (r.status >= 200 && r.status < 300 && (ct.includes('pdf') || Buffer.byteLength(r.data || Buffer.alloc(0)) > 500)) {
          res.setHeader('Content-Type', ct.includes('pdf') ? ct : 'application/pdf');
          res.setHeader('Content-Disposition', `inline; filename="etiqueta-ml-${shipmentId}.pdf"`);
          return res.send(Buffer.from(r.data));
        }
        lastError = { status: r.status, data: Buffer.from(r.data || '').toString('utf8').slice(0, 500) };
      } catch(e) {
        lastError = e.response?.data || e.message;
      }
    }

    return res.status(422).json({ error: 'Etiqueta ainda não disponível para esse envio', details: lastError });
  } catch(e) {
    console.error('[ML label]', e.response?.data || e.message);
    res.status(500).json({ error: e.message });
  }
});


setInterval(() => {
  const now = Date.now();
  Object.keys(CACHE).forEach(k => { if ((now - CACHE[k].ts) >= CACHE_TTL) delete CACHE[k]; });
}, CACHE_TTL);

// ── OAUTH ML ──
app.get('/auth/mercadolivre', (req, res) => {
  const state = req.query.user_id || '';
  res.redirect('https://auth.mercadolivre.com.br/authorization'
    + `?response_type=code&client_id=${process.env.ML_CLIENT_ID}`
    + `&redirect_uri=${encodeURIComponent(process.env.ML_REDIRECT_URI)}&state=${state}`);
});

app.get('/callback/mercadolivre', async (req, res) => {
  const { code, state } = req.query;
  if (!code) return res.redirect('https://salesync.shop?error=ml_no_code');
  try {
    const { data: tk } = await axios.post('https://api.mercadolibre.com/oauth/token',
      new URLSearchParams({ grant_type:'authorization_code', client_id:process.env.ML_CLIENT_ID,
        client_secret:process.env.ML_CLIENT_SECRET, code, redirect_uri:process.env.ML_REDIRECT_URI }),
      { headers: { 'Content-Type':'application/x-www-form-urlencoded' } }
    );
    const { data: info } = await axios.get(`https://api.mercadolibre.com/users/${tk.user_id}`,
      { headers: { Authorization:`Bearer ${tk.access_token}` } }
    );
    await db.query(`
      INSERT INTO marketplace_accounts (user_id,platform,platform_shop_id,shop_name,seller_email,access_token,refresh_token,token_expires_at,mode,is_active)
      VALUES ($1,'mercadolivre',$2,$3,$4,$5,$6,$7,'both',true)
      ON CONFLICT (user_id,platform,platform_shop_id) DO UPDATE SET
        access_token=EXCLUDED.access_token,refresh_token=EXCLUDED.refresh_token,
        token_expires_at=EXCLUDED.token_expires_at,is_active=true,updated_at=NOW()`,
      [state, String(tk.user_id), info.nickname, info.email,
       tk.access_token, tk.refresh_token, new Date(Date.now()+tk.expires_in*1000)]
    );
    res.redirect('https://salesync.shop?connected=mercadolivre');
  } catch(e) { console.error('[ML]', e.response?.data||e.message); res.redirect('https://salesync.shop?error=ml_failed'); }
});

// ── OAUTH SHOPEE ──
app.get('/auth/shopee', (req, res) => {
  const ts=Math.floor(Date.now()/1000), path='/api/v2/shop/auth_partner';
  const sign=shopeeSign(process.env.SHOPEE_PARTNER_ID, path, ts, process.env.SHOPEE_PARTNER_KEY);
  const cb=encodeURIComponent(`${process.env.SHOPEE_REDIRECT_URI}?uid=${req.query.user_id||''}`);
  res.redirect(`https://partner.shopeemobile.com${path}?partner_id=${process.env.SHOPEE_PARTNER_ID}&timestamp=${ts}&sign=${sign}&redirect=${cb}`);
});

app.get('/callback/shopee', async (req, res) => {
  const { code, shop_id, uid } = req.query;
  if (!code) return res.redirect('https://salesync.shop?error=shopee_no_code');
  try {
    const ts=Math.floor(Date.now()/1000), path='/api/v2/auth/token/get';
    const sign=shopeeSign(process.env.SHOPEE_PARTNER_ID, path, ts, process.env.SHOPEE_PARTNER_KEY);
    const { data:tk } = await axios.post(
      `https://partner.shopeemobile.com${path}?partner_id=${process.env.SHOPEE_PARTNER_ID}&timestamp=${ts}&sign=${sign}`,
      { code, partner_id:parseInt(process.env.SHOPEE_PARTNER_ID), shop_id:parseInt(shop_id) },
      { headers:{ 'Content-Type':'application/json' } }
    );
    await db.query(`
      INSERT INTO marketplace_accounts (user_id,platform,platform_shop_id,shop_name,access_token,refresh_token,token_expires_at,mode,is_active)
      VALUES ($1,'shopee',$2,$3,$4,$4,$5,$6,'normal',true)
      ON CONFLICT (user_id,platform,platform_shop_id) DO UPDATE SET
        access_token=EXCLUDED.access_token,refresh_token=EXCLUDED.refresh_token,
        token_expires_at=EXCLUDED.token_expires_at,is_active=true,updated_at=NOW()`,
      [uid, String(shop_id), `Shopee Loja ${shop_id}`, tk.access_token, tk.refresh_token, new Date(Date.now()+tk.expire_in*1000)]
    );
    res.redirect('https://salesync.shop?connected=shopee');
  } catch(e) { console.error('[Shopee]', e.response?.data||e.message); res.redirect('https://salesync.shop?error=shopee_failed'); }
});

// ── OAUTH MAGALU ──
app.get('/auth/magalu', (req, res) => {
  const state = req.query.user_id || '';

  const scope = [
    'open:order-order-seller:read',
    'open:order-delivery-seller:read',
    'open:order-delivery-seller:write',
    'open:order-invoice-seller:read',
    'open:order-logistics-seller:read',
    'open:order-logistics-seller:write',
    'open:logistic-seller-shippings:read'
  ].join(' ');

  const url = 'https://id.magalu.com/login?' + new URLSearchParams({
    client_id: process.env.MAGALU_CLIENT_ID,
    redirect_uri: process.env.MAGALU_REDIRECT_URI,
    scope,
    response_type: 'code',
    choose_tenants: 'true',
    state
  }).toString();

  console.log('[MAGALU AUTH URL]', url);

  res.redirect(url);
});

// Opcional: use esta rota só depois de criar um NOVO client Magalu com o scope de entrega liberado.
// URL: /auth/magalu-full?user_id=...
app.get('/auth/magalu-full', (req, res) => {
  const state = req.query.user_id || '';
  const scope = 'open:order-order-seller:read open:order-delivery-seller:read';

  const url = 'https://id.magalu.com/login?' + new URLSearchParams({
    client_id: process.env.MAGALU_CLIENT_ID,
    redirect_uri: process.env.MAGALU_REDIRECT_URI,
    scope,
    response_type: 'code',
    choose_tenants: 'true',
    state
  }).toString();

  console.log('[MAGALU AUTH URL - FULL]', url);
  res.redirect(url);
});

app.get('/callback/magalu', async (req, res) => {
  const { code, state } = req.query;
  if (!code) return res.redirect('https://salesync.shop?error=magalu_no_code');
  try {
    const { data: tk } = await axios.post('https://id.magalu.com/oauth/token',
      new URLSearchParams({ grant_type:'authorization_code', client_id:process.env.MAGALU_CLIENT_ID,
        client_secret:process.env.MAGALU_CLIENT_SECRET, code, redirect_uri:process.env.MAGALU_REDIRECT_URI }),
      { headers: { 'Content-Type':'application/x-www-form-urlencoded' } }
    );
    // Nome real da loja via primeiro pedido
    let sellerId = 'magalu-store', shopName = 'Loja Magalu';
    try {
      const { data: sample } = await axios.get('https://api.magalu.com/seller/v1/orders', {
        params: { _limit: 1, _sort: 'created_at:desc' },
        headers: { Authorization: `Bearer ${tk.access_token}` }
      });
      const seller = sample.results?.[0]?.deliveries?.[0]?.seller;
      if (seller?.name) {
        sellerId = seller.id || 'magalu-store';
        shopName = seller.name; // nome real: ex "levelupshops"
        console.log('[Magalu] Nome da loja:', shopName);
      }
    } catch(se) { console.log('[Magalu seller name]', se.message); }

    await db.query(`
      INSERT INTO marketplace_accounts (user_id,platform,platform_shop_id,shop_name,access_token,refresh_token,token_expires_at,mode,is_active)
      VALUES ($1,'magalu',$2,$3,$4,$5,$6,'both',true)
      ON CONFLICT (user_id,platform,platform_shop_id) DO UPDATE SET
        access_token=EXCLUDED.access_token,refresh_token=EXCLUDED.refresh_token,
        token_expires_at=EXCLUDED.token_expires_at,shop_name=EXCLUDED.shop_name,is_active=true,updated_at=NOW()`,
      [state, String(sellerId), shopName, tk.access_token, tk.refresh_token,
       new Date(Date.now()+(tk.expires_in||7200)*1000)]
    );
    console.log(`[Magalu] ✅ ${shopName} conectado`);
    res.redirect('https://salesync.shop?connected=magalu');
  } catch(e) {
    console.error('[Magalu callback]', {
      status: e.response?.status,
      data: e.response?.data,
      message: e.message
    });
    res.redirect('https://salesync.shop?error=magalu_failed');
  }
});


// ══ DEBUG MERCADO LIVRE ══
app.get('/debug/mercadolivre', auth, async (req, res) => {
  const days = parseInt(req.query.days || '30');
  try {
    const { rows } = await db.query(
      `SELECT * FROM marketplace_accounts WHERE user_id=$1 AND platform='mercadolivre' AND is_active=true AND access_token IS NOT NULL LIMIT 1`,
      [req.user.id]
    );
    if (!rows.length) return res.send('<h2 style="font-family:sans-serif;padding:20px;color:red">Mercado Livre não conectado</h2>');
    const acc = rows[0];
    const since = new Date(Date.now() - days * 86400000).toISOString();
    let rawData = null, error = '';
    try {
      const debugResults = [];
      const limit = 50;
      for (let page = 0; page < 10; page++) {
        const offset = page * limit;
        const { data } = await axios.get('https://api.mercadolibre.com/orders/search', {
          params: { seller: acc.platform_shop_id, sort: 'date_desc', 'order.date_created.from': since, limit, offset },
          headers: { Authorization: `Bearer ${acc.access_token}` }
        });
        const pageResults = Array.isArray(data.results) ? data.results : [];
        debugResults.push(...pageResults);
        const total = Number(data.paging?.total || 0);
        if (!pageResults.length || pageResults.length < limit || (total && offset + limit >= total)) break;
      }
      rawData = { results: debugResults, paging: { total: debugResults.length } };
    } catch(e) { error = e.response?.status + ' ' + JSON.stringify(e.response?.data || e.message); }

    const orders = rawData?.results || [];

    // Busca items em lote
    const itemIds = [...new Set(orders.map(o => o.order_items?.[0]?.item?.id).filter(Boolean))];
    const itemMap = {};
    for (let i = 0; i < itemIds.length; i += 20) {
      try {
        const { data: items } = await axios.get('https://api.mercadolibre.com/items', {
          params: { ids: itemIds.slice(i, i+20).join(',') },
          headers: { Authorization: `Bearer ${acc.access_token}` }
        });
        (Array.isArray(items)?items:[]).forEach(entry => {
          if (entry.code === 200 && entry.body) {
            const b = entry.body;
            itemMap[b.id] = {
              title: b.title,
              image: b.pictures?.[0]?.url || b.thumbnail || null,
              sku: b.seller_custom_field || b.attributes?.find(a=>a.id==='SELLER_SKU')?.value_name || '',
              logistic_type: b.shipping?.logistic_type || ''
            };
          }
        });
      } catch(e) { console.error('[ML debug items]', e.message); }
    }

    const html = `<!DOCTYPE html><html lang="pt-BR"><head><meta charset="UTF-8"/>
<title>Debug ML</title>
<style>*{box-sizing:border-box;margin:0;padding:0;}body{font-family:'Segoe UI',sans-serif;background:#0D1117;color:#e6edf3;padding:20px;}
h1{color:#FFE600;margin-bottom:4px;}.sub{color:#64748B;font-size:13px;margin-bottom:20px;}
.section{background:#161B26;border:1px solid rgba(255,255,255,.08);border-radius:10px;padding:16px;margin-bottom:16px;}
.section h2{font-size:13px;color:#94A3B8;text-transform:uppercase;letter-spacing:.6px;margin-bottom:12px;}
pre{background:#0D1117;border-radius:8px;padding:12px;overflow-x:auto;font-size:11px;color:#38BDF8;border:1px solid rgba(255,255,255,.06);}
.order-card{background:#1E2535;border-radius:8px;padding:12px;margin-bottom:10px;display:flex;gap:12px;}
.order-img{width:60px;height:60px;border-radius:6px;object-fit:cover;flex-shrink:0;}
.badge{display:inline-block;padding:2px 8px;border-radius:12px;font-size:11px;font-weight:700;}
.green{background:rgba(16,185,129,.15);color:#10B981;}.red{background:rgba(244,63,94,.12);color:#F43F5E;}
.yellow{background:rgba(251,191,36,.12);color:#FBBF24;}.blue{background:rgba(56,189,248,.12);color:#38BDF8;}
.info-row{display:flex;justify-content:space-between;font-size:12px;padding:4px 0;border-bottom:1px solid rgba(255,255,255,.04);}
.l{color:#64748B;}.v{color:#F8FAFC;font-weight:600;}</style></head><body>
<h1>🟡 Debug Mercado Livre</h1>
<div class="sub">Últimos ${days} dias · ${new Date().toLocaleString('pt-BR')}</div>
${error?`<div style="background:rgba(244,63,94,.1);border:1px solid rgba(244,63,94,.3);border-radius:8px;padding:12px;color:#F43F5E;margin-bottom:16px">${error}</div>`:''}
<div class="section"><h2>Conta</h2>
<div class="info-row"><span class="l">Shop ID</span><span class="v">${acc.platform_shop_id}</span></div>
<div class="info-row"><span class="l">Nome (nickname)</span><span class="v">${acc.shop_name}</span></div>
<div class="info-row"><span class="l">Token expira</span><span class="v">${acc.token_expires_at?new Date(acc.token_expires_at).toLocaleString('pt-BR'):'—'}</span></div>
</div>
<div class="section"><h2>${orders.length} pedidos · ${itemIds.length} items buscados</h2>
${orders.map(o => {
  const item = o.order_items?.[0];
  const details = itemMap[item?.item?.id] || {};
  const isFull = o.shipping?.logistic_type === 'fulfillment' || details.logistic_type === 'fulfillment';
  const sc = {paid:'green',payment_required:'yellow',confirmed:'green',shipped:'blue',delivered:'green',cancelled:'red'}[o.status]||'yellow';
  return `<div class="order-card">
    ${details.image?`<img class="order-img" src="${details.image}" onerror="this.src=''"/>`:'<div style="width:60px;height:60px;border-radius:6px;background:#0D1117;display:flex;align-items:center;justify-content:center;font-size:24px;flex-shrink:0">📦</div>'}
    <div style="flex:1">
      <div style="font-weight:600;margin-bottom:4px">${details.title||item?.item?.title||'—'}</div>
      <div style="font-size:11px;color:#64748B;display:flex;gap:8px;flex-wrap:wrap;margin-top:4px">
        <span>ID: ${o.id}</span>
        <span>SKU: <strong style="color:#A855F7">${details.sku||item?.item?.seller_sku||'—'}</strong></span>
        <span class="badge ${sc}">${o.status}</span>
        <span class="badge ${isFull?'blue':'yellow'}">${isFull?'📦 FULL':'🏪 Normal'}</span>
        <span>R$ ${o.total_amount?.toFixed(2)||'0'}</span>
        <span>${new Date(o.date_created).toLocaleDateString('pt-BR')}</span>
      </div>
    </div>
  </div>`;
}).join('')}
</div>
<div class="section"><h2>JSON do primeiro pedido</h2><pre>${JSON.stringify(orders[0],null,2)}</pre></div>
<div class="section"><h2>Item details (primeiro)</h2><pre>${JSON.stringify(Object.values(itemMap)[0],null,2)}</pre></div>
</body></html>`;
    res.send(html);
  } catch(e) { res.send(`<pre style="padding:20px;color:red">${e.message}</pre>`); }
});




// ══ ETIQUETA MERCADO LIVRE — v5.9 restaurada ══
app.get('/api/ml/label/:shippingId', auth, async (req, res) => {
  const { shippingId } = req.params;

  try {
    const { rows } = await db.query(
      `SELECT * FROM marketplace_accounts
       WHERE user_id=$1
       AND platform='mercadolivre'
       AND is_active=true
       AND access_token IS NOT NULL
       LIMIT 1`,
      [req.user.id]
    );

    if (!rows.length) {
      return res.status(404).json({ error: 'Mercado Livre não conectado' });
    }

    const acc = rows[0];
    let token = acc.access_token;

    if (
      acc.token_expires_at &&
      new Date(acc.token_expires_at) <= new Date(Date.now() + 5 * 60 * 1000)
    ) {
      const newToken = await refreshMLToken(acc);
      if (newToken) token = newToken;
    }

    const labelUrl =
      `https://api.mercadolibre.com/shipment_labels?shipment_ids=${shippingId}&response_type=pdf`;

    const labelResp = await axios.get(labelUrl, {
      headers: { Authorization: `Bearer ${token}` },
      responseType: 'arraybuffer'
    });

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `inline; filename="etiqueta-${shippingId}.pdf"`);
    res.send(Buffer.from(labelResp.data));

  } catch (e) {
    console.error('[ML Label]', {
      status: e.response?.status,
      data: e.response?.data?.toString?.() || e.response?.data || e.message
    });

    res.status(e.response?.status || 500).json({
      error: 'Não foi possível baixar a etiqueta',
      details: {
        status: e.response?.status,
        data: e.response?.data?.toString?.() || e.response?.data || e.message
      }
    });
  }
});

// ═══════════════════════════════════════════════════════════════════════════════
// v5.7 — EXPEDIÇÃO / ETIQUETAS
// ═══════════════════════════════════════════════════════════════════════════════

function mlCanShowLabel(orderLike = {}) {
  const status = String(orderLike.status || '').toLowerCase();
  const fulfillment = String(orderLike.fulfillment_type || '').toLowerCase();
  const shippingStatus = String(orderLike.shipping_status || '').toLowerCase();
  const tags = Array.isArray(orderLike.tags) ? orderLike.tags : [];

  if (fulfillment === 'full') return false;
  if (!orderLike.shipping_id) return false;
  if (status === 'cancelled' || status === 'delivered') return false;
  if (shippingStatus === 'shipped' || shippingStatus === 'delivered') return false;
  if (tags.includes('delivered') || tags.includes('shipped')) return false;

  return status === 'paid' || tags.includes('paid') || tags.includes('not_delivered');
}

async function getMagaluAccount(userId) {
  const { rows } = await db.query(
    `SELECT * FROM marketplace_accounts
     WHERE user_id=$1 AND platform='magalu'
     AND is_active=true AND access_token IS NOT NULL
     LIMIT 1`,
    [userId]
  );
  if (!rows.length) return null;

  const acc = rows[0];
  let token = acc.access_token;

  if (acc.token_expires_at && new Date(acc.token_expires_at) <= new Date(Date.now() + 5 * 60 * 1000)) {
    const newToken = await refreshMagaluToken(acc);
    if (!newToken) return null;
    token = newToken;
  }

  return { ...acc, access_token: token };
}

function escapeHtml(v) {
  return String(v ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function pickMagaluDelivery(order) {
  const d = order?.deliveries?.[0] || {};
  const item = d.items?.[0] || {};
  const info = item.info || {};
  return { d, item, info };
}

app.get('/debug/magalu-expedicao', auth, async (req, res) => {
  try {
    const acc = await getMagaluAccount(req.user.id);
    if (!acc) {
      return res.send('<h2 style="font-family:sans-serif;color:#ef4444;padding:20px">Magalu não conectado ou token expirado. Reconecte a conta.</h2>');
    }

    const { data } = await axios.get('https://api.magalu.com/seller/v1/orders', {
      params: { _limit: 1, _sort: 'created_at:desc' },
      headers: { Authorization: `Bearer ${acc.access_token}` }
    });

    const order = data.results?.[0];
    if (!order) {
      return res.send('<h2 style="font-family:sans-serif;color:#ef4444;padding:20px">Nenhum pedido Magalu encontrado.</h2>');
    }

    const { d, info } = pickMagaluDelivery(order);
    const deliveryId = d.id || d.uuid || d.code || d.delivery_id || '';
    const orderId = order.code || order.id || '';
    const isFull = d.shipping?.provider?.extras?.is_fulfillment === true;
    const providerName = d.shipping?.provider?.name || d.shipping?.provider?.description || '—';
    const status = order.status || d.status || '—';
    const tokenParam = encodeURIComponent(req.query.token || '');

    const page = `<!doctype html>
<html lang="pt-BR"><head><meta charset="utf-8"/><title>Debug Magalu Expedição</title>
<style>
*{box-sizing:border-box}body{font-family:Inter,Segoe UI,Arial,sans-serif;background:#070b16;color:#e5e7eb;margin:0;padding:22px}
h1{margin:0 0 6px;color:#a78bfa}.sub{color:#64748b;font-size:13px;margin-bottom:18px}
.grid{display:grid;grid-template-columns:1fr 1fr;gap:14px}.card{background:#0f172a;border:1px solid rgba(148,163,184,.18);border-radius:14px;padding:16px}
.card h2{font-size:13px;text-transform:uppercase;letter-spacing:.8px;color:#94a3b8;margin:0 0 12px}
.row{display:flex;justify-content:space-between;border-bottom:1px solid rgba(255,255,255,.06);padding:7px 0;font-size:12px;gap:10px}
.l{color:#64748b}.v{font-weight:700;color:#f8fafc;text-align:right;word-break:break-all}
.btns{display:flex;gap:8px;flex-wrap:wrap;margin-top:14px}.btn{border:1px solid rgba(167,139,250,.35);background:rgba(109,40,217,.2);color:#c4b5fd;padding:10px 13px;border-radius:10px;text-decoration:none;font-weight:800;font-size:12px}
.btn.yellow{border-color:rgba(251,191,36,.35);background:rgba(251,191,36,.1);color:#fbbf24}.bad{color:#f87171}.ok{color:#10b981}
pre{background:#020617;border:1px solid rgba(148,163,184,.15);border-radius:12px;padding:14px;overflow:auto;max-height:480px;font-size:11px;color:#67e8f9}
.notice{background:rgba(251,191,36,.09);border:1px solid rgba(251,191,36,.24);color:#fde68a;border-radius:12px;padding:12px;font-size:13px;margin-bottom:14px}
input{background:#111827;border:1px solid rgba(148,163,184,.22);color:#e5e7eb;border-radius:9px;padding:9px;width:100%;margin-top:6px}
label{font-size:11px;color:#94a3b8;font-weight:700;text-transform:uppercase}
</style></head><body>
<h1>⚡ Debug Magalu Expedição</h1>
<div class="sub">Último pedido Magalu · ${new Date().toLocaleString('pt-BR')}</div>
<div class="notice">Para etiqueta Magalu, normalmente o pedido precisa ser <b>envio normal / Magalu Entregas</b> e estar <b>faturado com NF-e</b>. Full/Fulfillment não entra aqui.</div>
<div class="grid">
<div class="card"><h2>Pedido</h2>
<div class="row"><span class="l">Order ID</span><span class="v">${escapeHtml(orderId)}</span></div>
<div class="row"><span class="l">Delivery ID detectado</span><span class="v">${escapeHtml(deliveryId || 'não encontrado')}</span></div>
<div class="row"><span class="l">Status</span><span class="v">${escapeHtml(status)}</span></div>
<div class="row"><span class="l">Full/Fulfillment</span><span class="v ${isFull?'bad':'ok'}">${isFull ? 'SIM — não gerar etiqueta aqui' : 'NÃO — envio normal'}</span></div>
<div class="row"><span class="l">Transportadora/Provider</span><span class="v">${escapeHtml(providerName)}</span></div>
<div class="row"><span class="l">Produto</span><span class="v">${escapeHtml(info.name || info.description || '—')}</span></div>
<div class="row"><span class="l">SKU</span><span class="v">${escapeHtml(info.sku || '—')}</span></div>
<div class="btns">
<a class="btn" target="_blank" href="/debug/magalu-expedicao/json?token=${tokenParam}">Ver JSON bruto</a>
${deliveryId ? `<a class="btn yellow" target="_blank" href="/api/magalu/delivery/${encodeURIComponent(deliveryId)}/debug?token=${tokenParam}">Testar endpoints</a>` : ''}
${deliveryId ? `<a class="btn" target="_blank" href="/api/magalu/delivery/${encodeURIComponent(deliveryId)}/label?token=${tokenParam}">Tentar etiqueta</a>` : ''}
</div></div>
<div class="card"><h2>Possíveis requisitos</h2>
<div class="row"><span class="l">NF-e / chave</span><span class="v">provável obrigatório</span></div>
<div class="row"><span class="l">Status faturado/invoiced</span><span class="v">provável obrigatório</span></div>
<div class="row"><span class="l">Magalu Entregas</span><span class="v">provável obrigatório</span></div>
<div class="row"><span class="l">Escopo delivery</span><span class="v">pode ser necessário</span></div>
<div class="row"><span class="l">Full</span><span class="v">não usar etiqueta normal</span></div>
<div style="margin-top:14px"><label>Delivery ID manual</label><input id="did" placeholder="Cole um delivery id"/>
<div class="btns">
<a class="btn" href="#" onclick="this.href='/api/magalu/delivery/'+encodeURIComponent(document.getElementById('did').value)+'/debug?token=${tokenParam}'" target="_blank">Testar ID manual</a>
<a class="btn" href="#" onclick="this.href='/api/magalu/delivery/'+encodeURIComponent(document.getElementById('did').value)+'/label?token=${tokenParam}'" target="_blank">Etiqueta ID manual</a>
</div></div></div></div>
<div class="card" style="margin-top:14px"><h2>delivery[0] bruto</h2><pre>${escapeHtml(JSON.stringify(d, null, 2))}</pre></div>
<div class="card" style="margin-top:14px"><h2>order bruto</h2><pre>${escapeHtml(JSON.stringify(order, null, 2))}</pre></div>
</body></html>`;

    res.send(page);
  } catch (e) {
    res.send(`<pre style="padding:20px;color:red">${escapeHtml(e.message)}\n${escapeHtml(e.stack)}</pre>`);
  }
});

app.get('/debug/magalu-expedicao/json', auth, async (req, res) => {
  try {
    const acc = await getMagaluAccount(req.user.id);
    if (!acc) return res.status(401).json({ error: 'Magalu não conectado ou token expirado' });
    const { data } = await axios.get('https://api.magalu.com/seller/v1/orders', {
      params: { _limit: 1, _sort: 'created_at:desc' },
      headers: { Authorization: `Bearer ${acc.access_token}` }
    });
    res.json(data.results?.[0] || null);
  } catch(e) {
    res.status(e.response?.status || 500).json({ error: e.message, data: e.response?.data });
  }
});

app.get('/api/magalu/delivery/:id/debug', auth, async (req, res) => {
  const deliveryId = req.params.id;
  try {
    const acc = await getMagaluAccount(req.user.id);
    if (!acc) return res.status(401).json({ error: 'Magalu não conectado ou token expirado' });

    const candidates = [
      `/seller/v1/deliveries/${deliveryId}`,
      `/seller/v1/deliveries/${deliveryId}/shippings`,
      `/seller/v1/deliveries/${deliveryId}/labels`,
      `/seller/v1/deliveries/${deliveryId}/label`,
      `/seller/v1/deliveries/${deliveryId}/invoices`,
      `/seller/v1/deliveries/${deliveryId}/histories`,
      `/seller/v1/orders/${deliveryId}`,
      `/seller/v1/orders/${deliveryId}/deliveries`
    ];

    const results = [];
    for (const path of candidates) {
      const url = `https://api.magalu.com${path}`;
      const r = await axios.get(url, {
        headers: { Authorization: `Bearer ${acc.access_token}` },
        validateStatus: () => true
      });
      results.push({ path, status: r.status, content_type: r.headers?.['content-type'], data: r.data });
    }

    res.json({
      delivery_id: deliveryId,
      note: 'Se etiqueta voltar 404/403/422, provavelmente precisa NF-e/faturamento, Magalu Entregas, escopo delivery ou endpoint específico.',
      results
    });
  } catch(e) {
    res.status(e.response?.status || 500).json({ error: e.message, data: e.response?.data });
  }
});

app.get('/api/magalu/delivery/:id/label', auth, async (req, res) => {
  const deliveryId = req.params.id;

  try {
    const acc = await getMagaluAccount(req.user.id);
    if (!acc) return res.status(401).json({ error: 'Magalu não conectado ou token expirado' });

    const attempts = [];

    for (const payload of magaluLabelPayloads(deliveryId)) {
      const r = await postMagaluShippingLabel(acc, payload);
      const ct = r.headers?.['content-type'] || '';
      const buf = Buffer.from(r.data || '');
      const pdf = extractPdfBufferFromLabelResponse(r.data, ct);

      if (r.status >= 200 && r.status < 300 && pdf) {
        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', `inline; filename="magalu-etiqueta-${deliveryId}.pdf"`);
        return res.send(pdf);
      }

      let parsed = null;
      try { parsed = JSON.parse(buf.toString('utf8')); } catch {}
      attempts.push({ payload, status: r.status, content_type: ct, response: parsed || buf.toString('utf8').slice(0, 1500) });
    }

    return res.status(422).json({
      error: 'Não foi possível gerar etiqueta Magalu',
      endpoint: 'POST /seller/v1/logistics/shipping-labels',
      delivery_id: deliveryId,
      attempts
    });
  } catch(e) {
    res.status(e.response?.status || 500).json({ error: e.message, data: e.response?.data?.toString?.() || e.response?.data });
  }
});



function looksLikePdfBuffer(buf) {
  if (!buf) return false;
  const b = Buffer.isBuffer(buf) ? buf : Buffer.from(buf);
  return b.slice(0, 4).toString() === '%PDF';
}


function parseMagaluLabelResponse(data) {
  const buf = Buffer.from(data || '');
  const text = buf.toString('utf8').trim();
  if (!text) return null;
  try { return JSON.parse(text); } catch { return null; }
}

function findMagaluSignedUrl(obj) {
  if (!obj) return null;
  if (typeof obj === 'string') {
    if (/^https?:\/\//i.test(obj) && /shipping_label\.(pdf|zip|zpl)/i.test(obj)) return obj;
    return null;
  }
  if (typeof obj !== 'object') return null;
  if (typeof obj.signed_url === 'string') return obj.signed_url;
  if (obj.label && typeof obj.label.signed_url === 'string') return obj.label.signed_url;
  for (const v of Object.values(obj)) {
    const found = findMagaluSignedUrl(v);
    if (found) return found;
  }
  return null;
}

function normalizeMagaluLabelOptions(query = {}) {
  const requestedType = String(query.type || 'full').toLowerCase();
  const requestedFormat = String(query.format || 'pdf').toLowerCase();
  return {
    type: ['full','summary'].includes(requestedType) ? requestedType : 'full',
    format: ['pdf','zpl'].includes(requestedFormat) ? requestedFormat : 'pdf'
  };
}

function magaluSingleLabelPayload(deliveryId, channel, opts = {}) {
  const { type, format } = normalizeMagaluLabelOptions(opts);
  return {
    channel,
    deliveries: [{ id: deliveryId }],
    label: { type, format }
  };
}

function magaluLabelFilename(deliveryId, type, format) {
  const suffix = type === 'summary' ? 'danfe-simplificado' : 'etiqueta';
  const ext = format === 'zpl' ? 'zip' : 'pdf';
  return `magalu-${suffix}-${deliveryId}.${ext}`;
}

function extractPdfBufferFromLabelResponse(data, contentType) {
  const buf = Buffer.from(data || '');
  if (!buf.length) return null;
  if (String(contentType || '').toLowerCase().includes('pdf') || looksLikePdfBuffer(buf)) return buf;

  const text = buf.toString('utf8').trim();
  if (!text) return null;

  const cleanBase64 = (v) => String(v || '').replace(/^data:application\/pdf;base64,/i, '').trim();
  const tryBase64Pdf = (v) => {
    const raw = cleanBase64(v);
    if (!raw || !raw.includes('JVBER')) return null;
    const start = raw.indexOf('JVBER');
    const sliced = raw.slice(start).replace(/\s/g, '');
    try {
      const pdf = Buffer.from(sliced, 'base64');
      return looksLikePdfBuffer(pdf) ? pdf : null;
    } catch { return null; }
  };

  const direct = tryBase64Pdf(text);
  if (direct) return direct;

  try {
    const parsed = JSON.parse(text);
    const stack = [parsed];
    const keys = ['file','pdf','content','data','base64','label','document','body','url'];
    while (stack.length) {
      const cur = stack.shift();
      if (typeof cur === 'string') {
        const pdf = tryBase64Pdf(cur);
        if (pdf) return pdf;
      } else if (cur && typeof cur === 'object') {
        for (const k of keys) if (cur[k] !== undefined) stack.push(cur[k]);
        for (const v of Object.values(cur)) if (v && typeof v === 'object') stack.push(v);
      }
    }
  } catch {}

  return null;
}

async function postMagaluShippingLabel(acc, payload) {
  return axios.post(
    'https://api.magalu.com/seller/v1/logistics/shipping-labels',
    payload,
    {
      headers: {
        Authorization: `Bearer ${acc.access_token}`,
        Accept: 'application/json,application/pdf,*/*',
        'Content-Type': 'application/json'
      },
      responseType: 'arraybuffer',
      validateStatus: () => true
    }
  );
}


function uniq(arr) {
  return [...new Set(arr.filter(v => v !== undefined && v !== null && String(v).trim() !== '').map(v => String(v).trim()))];
}

function compactProbe(data) {
  if (!data || typeof data !== 'object') return data;
  const delivery = data.delivery || data;
  return {
    id: delivery.id || data.id || null,
    status: delivery.status || data.status || null,
    channel: delivery.channel || data.channel || data.sales_channel || null,
    seller: delivery.seller || data.seller || null,
    shipping: delivery.shipping || data.shipping || null,
    invoice: delivery.invoice || data.invoice || data.fiscal_document || data.fiscal_documents || null,
    nf: delivery.nfe || delivery.nf || data.nfe || data.nf || null,
    raw_keys: Object.keys(data || {})
  };
}

async function magaluGetJson(acc, path) {
  const r = await axios.get(`https://api.magalu.com${path}`, {
    headers: { Authorization: `Bearer ${acc.access_token}`, Accept: 'application/json' },
    validateStatus: () => true
  });
  return { path, status: r.status, content_type: r.headers?.['content-type'] || '', data: r.data };
}

async function inspectMagaluDelivery(acc, deliveryId) {
  const paths = [
    `/seller/v1/deliveries/${encodeURIComponent(deliveryId)}`,
    `/seller/v1/deliveries/${encodeURIComponent(deliveryId)}/history`,
    `/seller/v1/deliveries/${encodeURIComponent(deliveryId)}/invoices`,
    `/seller/v1/deliveries/${encodeURIComponent(deliveryId)}/shippings`
  ];
  const probes = [];
  for (const path of paths) {
    try {
      const r = await magaluGetJson(acc, path);
      probes.push({ ...r, compact: compactProbe(r.data) });
    } catch (e) {
      probes.push({ path, status: e.response?.status || 500, error: e.response?.data || e.message });
    }
  }
  return probes;
}

function inferMagaluChannelObjectsFromProbe(probes) {
  const channels = [];

  function pushChannel(id, extras = {}) {
    if (!id || String(id).trim() === '') return;
    const cleanId = String(id).trim();
    if (channels.some(c => c.id === cleanId)) return;
    channels.push({ id: cleanId, extras: extras && typeof extras === 'object' ? extras : {} });
  }

  for (const p of probes || []) {
    const d = p?.data?.delivery || p?.data || {};

    // FORMATO CORRETO da API de etiquetas Magalu:
    // channel precisa ser OBJETO { id, extras }, não string.
    // O id bom vem em delivery.order.channel.id, não em source_channel.id.
    pushChannel(d?.order?.channel?.id, d?.order?.channel?.extras || {});
    pushChannel(d?.channel?.id, d?.channel?.extras || {});
    pushChannel(d?.sales_channel?.id, d?.sales_channel?.extras || {});

    // Mantemos esses como fallback/debug, mas geralmente source_channel.id="MagazineLuiza"
    // NÃO é o id esperado pelo endpoint de etiqueta.
    pushChannel(d?.order?.source_channel?.id, { description: d?.order?.source_channel?.description || '' });
  }

  return channels;
}

function magaluLabelPayloads(deliveryId, options = {}) {
  const idObj = { id: deliveryId };

  const channelObjects = [];
  const addChannel = (ch) => {
    if (!ch) return;
    if (typeof ch === 'string') ch = { id: ch, extras: {} };
    if (!ch.id) return;
    const id = String(ch.id).trim();
    if (!id) return;
    if (channelObjects.some(x => x.id === id)) return;
    channelObjects.push({ id, extras: ch.extras && typeof ch.extras === 'object' ? ch.extras : {} });
  };

  (options.channels || []).forEach(addChannel);
  addChannel(options.channel);

  // fallback final apenas para expor validação se o parser não encontrou o UUID
  addChannel({ id: 'MagazineLuiza', extras: {} });

  // Conforme documentação oficial: format = pdf|zpl, type = summary|full.
  // A4/ZEBRA era formato de docs antigas/legadas e aqui gera comportamento errado.
  const labels = [
    { type: 'full', format: 'pdf' },
    { type: 'summary', format: 'pdf' },
    { type: 'full', format: 'zpl' },
    { type: 'summary', format: 'zpl' }
  ];

  const payloads = [];
  for (const channel of channelObjects) {
    for (const label of labels) payloads.push({ channel, deliveries: [idObj], label });
  }
  return payloads;
}



function summarizeMagaluLabelDiagnosis(deliveryProbe, results) {
  const d = (deliveryProbe || []).find(x => x.path && x.path.includes('/seller/v1/deliveries/') && x.status === 200)?.data || {};
  const invoice = Array.isArray(d.invoices) ? d.invoices[0] : null;
  const provider = d.shipping?.provider || {};
  const all500 = Array.isArray(results) && results.length > 0 && results.every(r => Number(r.status) === 500);
  return {
    delivery_id: d.id || null,
    delivery_code: d.code || null,
    delivery_status: d.status || null,
    provider_id: provider.id || null,
    provider_name: provider.description || provider.name || null,
    is_mle: Boolean(provider.extras?.is_mle),
    is_fulfillment: Boolean(provider.extras?.is_fulfillment),
    invoice_key: invoice?.key || null,
    invoice_status: invoice?.status?.id || null,
    invoice_description: invoice?.status?.description || null,
    label_endpoint_all_500: all500,
    conclusion: all500
      ? 'Entrega aparenta apta para etiqueta, mas o endpoint oficial retornou 500. Provável falha/instabilidade/processamento interno da Magalu.'
      : 'Verifique os detalhes dos payloads/retornos para identificar validação ou sucesso parcial.'
  };
}

app.get('/api/magalu/delivery/:id/official-label-debug', auth, async (req, res) => {
  const deliveryId = req.params.id;

  try {
    const acc = await getMagaluAccount(req.user.id);
    if (!acc) return res.status(401).json({ error: 'Magalu não conectado' });

    const delivery_probe = await inspectMagaluDelivery(acc, deliveryId);
    const channels = inferMagaluChannelObjectsFromProbe(delivery_probe);
    if (req.query.channel) channels.unshift({ id: String(req.query.channel), extras: {} });
    const payloads = magaluLabelPayloads(deliveryId, { channels }).slice(0, 16);
    const results = [];

    for (const payload of payloads) {
      const r = await postMagaluShippingLabel(acc, payload);
      const ct = r.headers?.['content-type'] || '';
      const buf = Buffer.from(r.data || '');

      let parsed = null;
      try { parsed = JSON.parse(buf.toString('utf8')); } catch {}

      results.push({
        endpoint: 'POST /seller/v1/logistics/shipping-labels',
        payload,
        status: r.status,
        content_type: ct,
        is_pdf: ct.includes('pdf') || looksLikePdfBuffer(buf),
        parsed,
        sample: parsed ? undefined : buf.toString('utf8').slice(0, 1500)
      });

      if (r.status >= 200 && r.status < 300) break;
    }

    res.json({
      delivery_id: deliveryId,
      support_summary: summarizeMagaluLabelDiagnosis(delivery_probe, results),
      diagnosis: 'Se delivery_probe retornar 200, status=invoiced, provider.extras.is_mle=true, invoice.status.id=approved e todos os payloads com channel/label retornarem 500, o payload está validado e a falha está no serviço de etiquetas da Magalu ou em processamento interno ainda não liberado.',
      delivery_probe,
      inferred_channels: channels,
      results
    });

  } catch (e) {
    res.status(e.response?.status || 500).json({
      error: e.message,
      data: e.response?.data?.toString?.() || e.response?.data
    });
  }
});



function xmlTag(xml, tag) {
  const m = String(xml || '').match(new RegExp(`<${tag}>([\\s\\S]*?)<\\/${tag}>`, 'i'));
  return m ? m[1].trim() : '';
}
function xmlBlock(xml, tag) {
  const m = String(xml || '').match(new RegExp(`<${tag}[^>]*>([\\s\\S]*?)<\\/${tag}>`, 'i'));
  return m ? m[1] : '';
}
function onlyDateBR(v) {
  if (!v) return '—';
  const d = new Date(v);
  if (!Number.isFinite(d.getTime())) return String(v).slice(0, 10).split('-').reverse().join('/');
  return d.toLocaleDateString('pt-BR');
}
function dateTimeBR(v) {
  if (!v) return '—';
  const d = new Date(v);
  if (!Number.isFinite(d.getTime())) return String(v);
  return d.toLocaleString('pt-BR', { day:'2-digit', month:'2-digit', year:'numeric', hour:'2-digit', minute:'2-digit', second:'2-digit' });
}
function moneyFromCents(v, normalizer = 100) {
  return (Number(v || 0) / Number(normalizer || 100)).toLocaleString('pt-BR', { style:'currency', currency:'BRL' });
}
function parseNFeXml(xml) {
  const ide = xmlBlock(xml, 'ide');
  const emit = xmlBlock(xml, 'emit');
  const dest = xmlBlock(xml, 'dest');
  const prot = xmlBlock(xml, 'infProt');
  const total = xmlBlock(xml, 'ICMSTot');
  return {
    key: xmlTag(prot, 'chNFe') || (String(xml).match(/Id="NFe(\d{44})"/) || [])[1] || '',
    number: xmlTag(ide, 'nNF'),
    series: xmlTag(ide, 'serie'),
    issuedAt: xmlTag(ide, 'dhEmi'),
    protocol: xmlTag(prot, 'nProt'),
    protocolAt: xmlTag(prot, 'dhRecbto'),
    emitName: xmlTag(emit, 'xNome') || xmlTag(emit, 'xFant'),
    emitCnpj: xmlTag(emit, 'CNPJ'),
    emitIe: xmlTag(emit, 'IE'),
    emitUf: xmlTag(xmlBlock(emit, 'enderEmit'), 'UF'),
    destName: xmlTag(dest, 'xNome'),
    destCpfCnpj: xmlTag(dest, 'CPF') || xmlTag(dest, 'CNPJ'),
    destIe: xmlTag(dest, 'IE'),
    destUf: xmlTag(xmlBlock(dest, 'enderDest'), 'UF'),
    value: xmlTag(total, 'vNF')
  };
}
async function fetchMagaluDeliveryAndInvoice(acc, deliveryId) {
  const headers = { Authorization: `Bearer ${acc.access_token}` };
  const [deliveryResp, invoicesResp] = await Promise.all([
    axios.get(`https://api.magalu.com/seller/v1/deliveries/${encodeURIComponent(deliveryId)}`, { headers, validateStatus: () => true }),
    axios.get(`https://api.magalu.com/seller/v1/deliveries/${encodeURIComponent(deliveryId)}/invoices`, { headers, validateStatus: () => true })
  ]);
  if (deliveryResp.status < 200 || deliveryResp.status >= 300) {
    throw new Error(`Entrega ${deliveryId} não encontrada na Magalu: ${deliveryResp.status}`);
  }
  const inv = invoicesResp.data?.results?.[0] || deliveryResp.data?.invoices?.[0] || {};
  const xml = inv.xml || '';
  const nfe = xml ? parseNFeXml(xml) : {
    key: inv.key || deliveryResp.data?.invoices?.[0]?.key || '',
    number: '', series: '', issuedAt: inv.issued_at || deliveryResp.data?.invoices?.[0]?.issued_at || '',
    protocol: '', protocolAt: '', emitName: '', emitCnpj: '', emitIe: '', emitUf: '',
    destName: deliveryResp.data?.shipping?.recipient?.name || '',
    destCpfCnpj: deliveryResp.data?.shipping?.recipient?.document_number || '',
    destIe: '', destUf: deliveryResp.data?.shipping?.recipient?.address?.state || '', value: ''
  };
  return { delivery: deliveryResp.data, invoice: inv, nfe };
}
function shortText(v, max = 38) {
  v = String(v || '').replace(/\s+/g, ' ').trim();
  return v.length > max ? v.slice(0, max - 1) + '…' : v;
}
function drawBoxText(doc, text, x, y, w, h, opts={}) {
  doc.rect(x, y, w, h).stroke();
  doc.font(opts.bold ? 'Helvetica-Bold' : 'Helvetica').fontSize(opts.size || 10).text(String(text || ''), x + 4, y + 4, { width: w - 8, align: opts.align || 'center' });
}
function fauxBarcode(doc, text, x, y, w, h) {
  const t = String(text || '1234567890');
  let cx = x;
  for (let i = 0; i < 90 && cx < x + w; i++) {
    const n = (t.charCodeAt(i % t.length) || 47) % 5;
    const lw = 1 + (n % 3);
    if (i % 2 === 0) doc.rect(cx, y, lw, h).fill('black');
    cx += lw + 1;
  }
  doc.fillColor('black');
}
async function drawBarcode(doc, text, x, y, w, h, rotate=false) {
  try {
    if (bwipjs) {
      const png = await bwipjs.toBuffer({ bcid:'code128', text:String(text || '0'), scale:2, height:12, includetext:false, padding:0 });
      if (rotate) {
        doc.save().rotate(90, { origin:[x, y] }).image(png, x, y - w, { width:h, height:w }).restore();
      } else {
        doc.image(png, x, y, { width:w, height:h });
      }
      return;
    }
  } catch {}
  if (rotate) {
    doc.save().rotate(90, { origin:[x, y] });
    fauxBarcode(doc, text, x, y - w, h, w);
    doc.restore();
  } else fauxBarcode(doc, text, x, y, w, h);
}
async function drawQr(doc, text, x, y, size) {
  try {
    if (bwipjs) {
      const png = await bwipjs.toBuffer({ bcid:'qrcode', text:String(text || ''), scale:3, padding:0 });
      doc.image(png, x, y, { width:size, height:size });
      return;
    }
  } catch {}
  doc.rect(x, y, size, size).stroke();
  doc.fontSize(6).text('QR', x, y + size/2 - 4, { width:size, align:'center' });
}
function addressLine(addr = {}) {
  return [addr.street, addr.number].filter(Boolean).join(', ');
}
function cityLine(addr = {}) {
  return [addr.city, addr.state].filter(Boolean).join(', ');
}
async function drawMagaluEtiquetaDanfe(doc, data, y) {
  const d = data.delivery || {};
  const nfe = data.nfe || {};
  const rec = d.shipping?.recipient || {};
  const ra = rec.address || {};
  const drop = d.shipping?.drop_details || {};
  const da = drop.address || {};
  const orderCode = d.order?.code || d.code || '';
  const nfNumber = nfe.number || (d.invoices?.[0]?.key ? String(d.invoices[0].key).slice(25, 34).replace(/^0+/, '') : '');
  const key = nfe.key || d.invoices?.[0]?.key || '';
  const deadline = d.shipping?.deadline?.limit_date || '';
  const emitName = nfe.emitName || 'KARAKA STORE';
  const emitCnpj = nfe.emitCnpj || '55938975000157';
  const emitIe = nfe.emitIe || '718285699111';
  const emitUf = nfe.emitUf || da.state || 'SP';
  const destName = nfe.destName || rec.name || '';
  const destDoc = nfe.destCpfCnpj || rec.document_number || '';
  const destUf = nfe.destUf || ra.state || '';

  const leftX = 18, leftW = 260, rightX = 300, rightW = 276, h = 392;
  doc.font('Helvetica-Bold').fontSize(15).text('magalu Entregas', leftX, y + 6);
  doc.fontSize(9).fillColor('white').rect(leftX, y + 28, 78, 12).fill('black').fillColor('black').text('AGÊNCIA MAGALU', leftX + 3, y + 30);
  doc.font('Helvetica-Bold').fontSize(10).text('MALHADIRET', leftX, y + 44).text('MALHA-DIRETA', leftX, y + 58);
  await drawQr(doc, `Pedido:${orderCode}|Entrega:${d.id}|NF:${nfNumber}`, leftX + 170, y + 8, 75);

  await drawBarcode(doc, d.code || d.id || orderCode, leftX + 14, y + 116, 56, 180, true);
  doc.fontSize(10).rotate(90, { origin:[leftX + 2, y + 172] }).text(String(d.code || d.id || '').replace(/^LU-/, '').slice(-14), leftX + 2, y + 172).rotate(-90, { origin:[leftX + 2, y + 172] });

  drawBoxText(doc, 'AG', leftX + 124, y + 96, 50, 24, { bold:true, size:16 });
  drawBoxText(doc, '01', leftX + 176, y + 96, 50, 24, { bold:true, size:16 });
  doc.rect(leftX + 124, y + 123, 50, 24).fill('black');
  doc.rect(leftX + 176, y + 123, 50, 24).fill('black');
  doc.fillColor('white').font('Helvetica-Bold').fontSize(16).text((ra.state || 'MG').slice(0,3).toUpperCase(), leftX + 124, y + 127, { width:50, align:'center' }).text((ra.zipcode || '').slice(0,3) || '000', leftX + 176, y + 127, { width:50, align:'center' });
  doc.fillColor('black');

  doc.font('Helvetica-Bold').fontSize(10).text(`Pedido: ${orderCode}`, leftX + 124, y + 164);
  doc.font('Helvetica-Bold').fontSize(9).text(`Nota Fiscal: ${nfNumber || '—'}`, leftX + 124, y + 178);
  doc.text(`Data estimada: ${onlyDateBR(deadline)}`, leftX + 124, y + 190);
  doc.moveTo(leftX + 124, y + 206).lineTo(leftX + 250, y + 206).stroke();
  doc.fontSize(7).text('DESTINATÁRIO', leftX + 124, y + 212);
  doc.font('Helvetica-Bold').fontSize(8).text(shortText(destName, 30).toUpperCase(), leftX + 124, y + 225, { width:130 });
  doc.font('Helvetica').fontSize(8).text(shortText(addressLine(ra), 32).toUpperCase(), leftX + 124, y + 244, { width:130 });
  doc.font('Helvetica-Bold').text(`${shortText(ra.district, 22).toUpperCase()} - ${ra.zipcode || ''}`, leftX + 124, y + 264, { width:130 });
  doc.text(cityLine(ra).toUpperCase(), leftX + 124, y + 282, { width:130 });
  doc.moveTo(leftX + 124, y + 304).lineTo(leftX + 250, y + 304).stroke();
  doc.font('Helvetica-Bold').fontSize(7).text('REMETENTE', leftX + 124, y + 310);
  doc.font('Helvetica-Bold').fontSize(7).text(emitName, leftX + 124, y + 322, { width:130 });
  doc.font('Helvetica').fontSize(7).text(shortText(addressLine(da).toUpperCase(), 38), leftX + 124, y + 336, { width:130 });
  doc.text(`${shortText(da.district, 26).toUpperCase()} - ${da.zipcode || ''}`, leftX + 124, y + 356, { width:130 });
  doc.text(cityLine(da).toUpperCase(), leftX + 124, y + 374, { width:130 });

  // DANFE simplificado à direita
  doc.rect(rightX, y + 6, rightW, h - 12).stroke();
  await drawBarcode(doc, key || '00000000000000000000000000000000000000000000', rightX + 45, y + 18, rightW - 90, 46);
  doc.font('Helvetica').fontSize(7).text(key, rightX + 38, y + 68, { width:rightW - 76, align:'center' });
  doc.rect(rightX + 8, y + 90, 70, 50).stroke();
  doc.font('Helvetica').fontSize(7).text('1 - SAÍDA', rightX + 12, y + 96);
  doc.font('Helvetica-Bold').fontSize(7).text(`Nº ${nfNumber || '—'} / Série ${nfe.series || '1'}`, rightX + 12, y + 111);
  doc.font('Helvetica').fontSize(7).text(`Emissão: ${onlyDateBR(nfe.issuedAt)}`, rightX + 12, y + 126);
  doc.font('Helvetica-Bold').fontSize(8).text('Chave de acesso', rightX + 148, y + 96, { width:115, align:'center' });
  doc.font('Helvetica').fontSize(5.5).text(key, rightX + 115, y + 109, { width:150, align:'center' });
  doc.font('Helvetica-Bold').fontSize(8).text('Protocolo de autorização de uso', rightX + 112, y + 124, { width:155, align:'center' });
  doc.font('Helvetica').fontSize(6).text(`${nfe.protocol || '—'} ${dateTimeBR(nfe.protocolAt || nfe.issuedAt)}`, rightX + 112, y + 136, { width:155, align:'center' });
  doc.moveTo(rightX, y + 158).lineTo(rightX + rightW, y + 158).stroke();

  let yy = y + 245;
  doc.font('Helvetica-Bold').fontSize(8).text('Emitente:', rightX + 8, yy).font('Helvetica').text(emitName, rightX + 58, yy, { width:190 }); yy += 22;
  doc.font('Helvetica-Bold').text('CNPJ:', rightX + 8, yy).font('Helvetica').text(emitCnpj, rightX + 58, yy); yy += 18;
  doc.font('Helvetica-Bold').text('Inscrição Estadual:', rightX + 8, yy).font('Helvetica').text(emitIe || '', rightX + 88, yy).font('Helvetica-Bold').text('UF:', rightX + 240, yy).font('Helvetica').text(emitUf || '', rightX + 258, yy); yy += 32;
  doc.font('Helvetica-Bold').text('Destinatário:', rightX + 8, yy).font('Helvetica').text(destName, rightX + 68, yy, { width:185 }); yy += 22;
  doc.font('Helvetica-Bold').text('CNPJ/CPF:', rightX + 8, yy).font('Helvetica').text(destDoc, rightX + 68, yy); yy += 20;
  doc.font('Helvetica-Bold').text('Inscrição Estadual:', rightX + 8, yy).font('Helvetica').text(nfe.destIe || '', rightX + 88, yy).font('Helvetica-Bold').text('UF:', rightX + 240, yy).font('Helvetica').text(destUf || '', rightX + 258, yy); yy += 22;
  doc.font('Helvetica-Bold').fontSize(10).text('DANFE SIMPLIFICADO', rightX + 8, y + h - 24);
}
async function buildMagaluSimplifiedPdfBuffer(items) {
  if (!PDFDocument) throw new Error('Dependência pdfkit não instalada. Rode: npm install pdfkit bwip-js');
  return await new Promise(async (resolve, reject) => {
    try {
      const doc = new PDFDocument({ size:'A4', margin:0, bufferPages:false });
      const chunks = [];
      doc.on('data', c => chunks.push(c));
      doc.on('end', () => resolve(Buffer.concat(chunks)));
      doc.on('error', reject);
      for (let i = 0; i < items.length; i++) {
        if (i > 0 && i % 2 === 0) doc.addPage({ size:'A4', margin:0 });
        const y = (i % 2 === 0) ? 14 : 426;
        await drawMagaluEtiquetaDanfe(doc, items[i], y);
        if (i % 2 === 0) doc.moveTo(14, 414).lineTo(581, 414).dash(3, { space:4 }).stroke().undash();
      }
      doc.end();
    } catch (e) { reject(e); }
  });
}



// v12 — DANFE simplificado separado: não redesenha/não altera a etiqueta oficial.
// A etiqueta continua vindo oficial da Magalu. Aqui geramos somente a nota fiscal reduzida.
function danfeDataFromDelivery(data) {
  const d = data.delivery || {};
  const nfe = data.nfe || {};
  const rec = d.shipping?.recipient || {};
  const ra = rec.address || {};
  const drop = d.shipping?.drop_details || {};
  const da = drop.address || {};
  const key = nfe.key || d.invoices?.[0]?.key || '';
  return {
    key,
    nfNumber: nfe.number || (key ? String(key).slice(25, 34).replace(/^0+/, '') : ''),
    series: nfe.series || '1',
    issuedAt: nfe.issuedAt || d.invoices?.[0]?.issued_at || '',
    protocol: nfe.protocol || '',
    protocolAt: nfe.protocolAt || nfe.issuedAt || d.invoices?.[0]?.issued_at || '',
    emitName: nfe.emitName || 'KARAKA STORE',
    emitCnpj: nfe.emitCnpj || '55938975000157',
    emitIe: nfe.emitIe || '718285699111',
    emitUf: nfe.emitUf || da.state || 'SP',
    destName: nfe.destName || rec.name || '',
    destDoc: nfe.destCpfCnpj || rec.document_number || '',
    destIe: nfe.destIe || '',
    destUf: nfe.destUf || ra.state || '',
    value: nfe.value || '',
    orderCode: d.order?.code || d.code || '',
    deliveryId: d.id || '',
  };
}

async function drawDanfeSimplificadoOnly(doc, data, box, opts = {}) {
  const info = danfeDataFromDelivery(data);
  const x = box.x, y = box.y, w = box.w, h = box.h;
  const scale = Math.min(w / 276, h / 380);
  const fs = (n) => Math.max(4.2, n * scale);
  const pad = 8 * scale;

  doc.rect(x, y, w, h).stroke();

  const barcodeH = Math.max(28, 46 * scale);
  await drawBarcode(doc, info.key || '00000000000000000000000000000000000000000000', x + w * 0.12, y + pad, w * 0.76, barcodeH);
  doc.font('Helvetica').fontSize(fs(7)).text(info.key, x + pad, y + pad + barcodeH + 4, { width: w - pad*2, align:'center' });

  const rowY = y + pad + barcodeH + 26 * scale;
  const leftW = w * 0.26;
  doc.rect(x + pad, rowY, leftW, 50 * scale).stroke();
  doc.font('Helvetica').fontSize(fs(7)).text('1 - SAÍDA', x + pad + 4, rowY + 6 * scale);
  doc.font('Helvetica-Bold').fontSize(fs(7)).text(`Nº ${info.nfNumber || '—'} / Série ${info.series || '1'}`, x + pad + 4, rowY + 21 * scale, { width:leftW - 8 });
  doc.font('Helvetica').fontSize(fs(7)).text(`Emissão: ${onlyDateBR(info.issuedAt)}`, x + pad + 4, rowY + 36 * scale, { width:leftW - 8 });

  const midX = x + pad + leftW + 8 * scale;
  doc.font('Helvetica-Bold').fontSize(fs(8)).text('Chave de acesso', midX, rowY + 5 * scale, { width:w - leftW - pad*3 - 8*scale, align:'center' });
  doc.font('Helvetica').fontSize(fs(5.5)).text(info.key, midX, rowY + 18 * scale, { width:w - leftW - pad*3 - 8*scale, align:'center' });
  doc.font('Helvetica-Bold').fontSize(fs(8)).text('Protocolo de autorização de uso', midX, rowY + 34 * scale, { width:w - leftW - pad*3 - 8*scale, align:'center' });
  doc.font('Helvetica').fontSize(fs(6)).text(`${info.protocol || '—'} ${dateTimeBR(info.protocolAt)}`, midX, rowY + 47 * scale, { width:w - leftW - pad*3 - 8*scale, align:'center' });

  doc.moveTo(x, y + h * 0.34).lineTo(x + w, y + h * 0.34).stroke();

  let yy = y + h * 0.62;
  const line = 20 * scale;
  const labelW = Math.min(90 * scale, w * 0.32);
  const valX = x + pad + labelW;
  const ufX = x + w - 44 * scale;

  function kv(label, value, uf) {
    doc.font('Helvetica-Bold').fontSize(fs(8)).text(label, x + pad, yy, { width: labelW });
    doc.font('Helvetica').fontSize(fs(8)).text(String(value || ''), valX, yy, { width: uf ? (ufX - valX - 6) : (w - valX - pad) });
    if (uf !== undefined) {
      doc.font('Helvetica-Bold').fontSize(fs(8)).text('UF:', ufX, yy);
      doc.font('Helvetica').fontSize(fs(8)).text(String(uf || ''), ufX + 18 * scale, yy);
    }
    yy += line;
  }

  kv('Emitente:', info.emitName);
  kv('CNPJ:', info.emitCnpj);
  kv('Inscrição Estadual:', info.emitIe, info.emitUf);
  yy += 10 * scale;
  kv('Destinatário:', info.destName);
  kv('CNPJ/CPF:', info.destDoc);
  kv('Inscrição Estadual:', info.destIe, info.destUf);

  // Assinatura discreta da plataforma no DANFE criado pelo SalesSync.
  doc.font('Helvetica-Bold')
    .fontSize(fs(6.5))
    .fillColor('#444444')
    .text('IMPRESSO POR SALES SYNC', x + pad, y + h - 38 * scale, { width:w - pad*2, align:'right' });
  doc.fillColor('black');

  doc.font('Helvetica-Bold').fontSize(fs(10)).text('DANFE SIMPLIFICADO', x + pad, y + h - 24 * scale, { width:w - pad*2 });
}

async function buildMagaluDanfeOnlyPdfBuffer(items, opts = {}) {
  if (!PDFDocument) throw new Error('Dependência pdfkit não instalada. Rode: npm install pdfkit bwip-js');
  const mode = String(opts.mode || opts.size || 'a4').toLowerCase();
  const isZebra = ['zebra','thermal','termica','4x6'].includes(mode);
  return await new Promise(async (resolve, reject) => {
    try {
      const doc = new PDFDocument({ size: isZebra ? [288, 432] : 'A4', margin: 0, bufferPages: false });
      const chunks = [];
      doc.on('data', c => chunks.push(c));
      doc.on('end', () => resolve(Buffer.concat(chunks)));
      doc.on('error', reject);
      for (let i = 0; i < items.length; i++) {
        if (i > 0) doc.addPage({ size: isZebra ? [288, 432] : 'A4', margin: 0 });
        if (isZebra) {
          await drawDanfeSimplificadoOnly(doc, items[i], { x: 8, y: 8, w: 272, h: 416 }, { zebra:true });
        } else {
          // Uma nota por página A4, sem mexer na etiqueta oficial.
          await drawDanfeSimplificadoOnly(doc, items[i], { x: 70, y: 90, w: 455, h: 620 }, { zebra:false });
        }
      }
      doc.end();
    } catch (e) { reject(e); }
  });
}



// v13 — Combo Zebra: mantém a etiqueta oficial da Magalu e adiciona o DANFE SalesSync separado.
// Saída final: 1 página Zebra para etiqueta oficial + 1 página Zebra para DANFE criado, repetindo por venda.
async function fetchMagaluOfficialLabelPdfBuffer(acc, deliveryId, opts = {}) {
  const deliveryProbe = opts.delivery_probe || await inspectMagaluDelivery(acc, deliveryId);
  const channels = inferMagaluChannelObjectsFromProbe(deliveryProbe);
  if (opts.channel) channels.unshift({ id: String(opts.channel), extras: {} });
  const channel = channels[0];
  if (!channel?.id) {
    const e = new Error('Canal Magalu não encontrado para gerar etiqueta oficial');
    e.delivery_probe = deliveryProbe;
    throw e;
  }

  const payload = {
    channel,
    deliveries: [{ id: deliveryId }],
    label: { type: 'full', format: 'pdf' }
  };

  const r = await postMagaluShippingLabel(acc, payload);
  const ct = r.headers?.['content-type'] || '';
  const directPdf = extractPdfBufferFromLabelResponse(r.data, ct);
  if (r.status >= 200 && r.status < 300 && directPdf) {
    return { pdf: directPdf, payload, response: null, delivery_probe: deliveryProbe };
  }

  const parsed = parseMagaluLabelResponse(r.data);
  const signedUrl = findMagaluSignedUrl(parsed);
  if (r.status >= 200 && r.status < 300 && signedUrl) {
    const file = await axios.get(signedUrl, {
      responseType: 'arraybuffer',
      validateStatus: () => true
    });
    const fileCt = file.headers?.['content-type'] || '';
    const buf = Buffer.from(file.data || '');
    if (file.status >= 200 && file.status < 300 && (looksLikePdfBuffer(buf) || String(fileCt).toLowerCase().includes('pdf'))) {
      return { pdf: buf, payload, response: parsed, signed_url: signedUrl, delivery_probe: deliveryProbe };
    }
    const e = new Error('A URL assinada da Magalu não retornou PDF válido');
    e.status = file.status;
    e.content_type = fileCt;
    e.payload = payload;
    e.response = parsed;
    throw e;
  }

  const e = new Error('A Magalu não retornou etiqueta PDF nem signed_url');
  e.status = r.status;
  e.content_type = ct;
  e.payload = payload;
  e.response = parsed || Buffer.from(r.data || '').toString('utf8').slice(0, 1500);
  e.delivery_probe = deliveryProbe;
  throw e;
}

async function appendPdfPagesFitted(outDoc, sourceBuffer, targetSize = [288, 432], opts = {}) {
  const src = await PDFLib.PDFDocument.load(sourceBuffer);
  const indices = opts.onlyFirstPage ? [0] : src.getPageIndices();
  const embeddedPages = await outDoc.embedPdf(sourceBuffer, indices);
  for (const ep of embeddedPages) {
    const page = outDoc.addPage(targetSize);
    const pageW = targetSize[0], pageH = targetSize[1];
    const margin = opts.margin ?? 0;
    const scale = Math.min((pageW - margin * 2) / ep.width, (pageH - margin * 2) / ep.height);
    const drawW = ep.width * scale;
    const drawH = ep.height * scale;
    page.drawPage(ep, {
      x: (pageW - drawW) / 2,
      y: (pageH - drawH) / 2,
      width: drawW,
      height: drawH
    });
  }
}

// Recorta apenas a ETIQUETA oficial da Magalu e encaixa em 4x6/Zebra.
// Importante: não redesenha a etiqueta; só usa a página oficial e remove a área de NF/DANFE que vem junto
// em alguns PDFs da Magalu/Bling. Também ignora páginas seguintes de nota normal.
async function appendMagaluOfficialLabelOnlyZebra(outDoc, sourceBuffer, targetSize = [288, 432]) {
  const src = await PDFLib.PDFDocument.load(sourceBuffer);
  const first = src.getPage(0);
  const { width, height } = first.getSize();

  let embedded;
  const isLargeSheet = width > 420 || height > 620;

  if (isLargeSheet) {
    // PDFs de etiqueta + DANFE geralmente vêm em folha grande:
    // esquerda = etiqueta, direita = DANFE, e às vezes 2 etiquetas por folha.
    // Pegamos a etiqueta superior esquerda e ampliamos para o papel Zebra.
    const crop = {
      left: 0,
      bottom: height * 0.50,
      right: width * 0.52,
      top: height
    };
    embedded = await outDoc.embedPage(first, crop);
  } else {
    // Se a Magalu já retornou a etiqueta em 4x6, mantém a página inteira.
    embedded = await outDoc.embedPage(first);
  }

  const page = outDoc.addPage(targetSize);
  const pageW = targetSize[0], pageH = targetSize[1];
  const margin = 2;
  const scale = Math.min((pageW - margin * 2) / embedded.width, (pageH - margin * 2) / embedded.height);
  const drawW = embedded.width * scale;
  const drawH = embedded.height * scale;
  page.drawPage(embedded, {
    x: (pageW - drawW) / 2,
    y: (pageH - drawH) / 2,
    width: drawW,
    height: drawH
  });
}

async function buildMagaluZebraLabelDanfePdfBuffer(acc, deliveryIds) {
  if (!PDFLib) throw new Error('Dependência pdf-lib não instalada. Rode: npm install pdf-lib');
  if (!PDFDocument) throw new Error('Dependência pdfkit não instalada. Rode: npm install pdfkit bwip-js');

  const out = await PDFLib.PDFDocument.create();
  const pageSize = [288, 432]; // Zebra/thermal 4x6, em pontos PDF.

  for (const deliveryId of deliveryIds) {
    const data = await fetchMagaluDeliveryAndInvoice(acc, deliveryId);

    // 1) Página da etiqueta oficial Magalu: NÃO redesenha.
    // Recorta somente a área da etiqueta oficial, ignora nota normal/páginas extras e amplia para Zebra.
    const label = await fetchMagaluOfficialLabelPdfBuffer(acc, deliveryId);
    await appendMagaluOfficialLabelOnlyZebra(out, label.pdf, pageSize);

    // 2) Página do DANFE simplificado criado pelo SalesSync, sempre em Zebra.
    const danfePdf = await buildMagaluDanfeOnlyPdfBuffer([data], { mode: 'zebra' });
    await appendPdfPagesFitted(out, danfePdf, pageSize);
  }

  return Buffer.from(await out.save());
}

app.get('/api/magalu/labels/zebra-completo', auth, async (req, res) => {
  try {
    const rawIds = String(req.query.ids || req.query.id || '').split(',').map(x => x.trim()).filter(Boolean);
    const deliveryIds = [...new Set(rawIds)].slice(0, 20);
    if (!deliveryIds.length) return res.status(400).json({ error: 'Informe ao menos um delivery id em ?ids=' });

    const acc = await getMagaluAccount(req.user.id);
    if (!acc) return res.status(401).json({ error: 'Magalu não conectado' });

    const pdf = await buildMagaluZebraLabelDanfePdfBuffer(acc, deliveryIds);
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `inline; filename="magalu-zebra-etiqueta-danfe-${deliveryIds.length}.pdf"`);
    return res.send(pdf);
  } catch (e) {
    res.status(e.status || e.response?.status || 500).json({
      error: 'Não foi possível gerar Zebra PDF com etiqueta oficial + DANFE simplificado',
      message: e.message,
      payload: e.payload || null,
      response: e.response || e.response?.data || null,
      content_type: e.content_type || null,
      install: 'Dependências necessárias: pdfkit, bwip-js e pdf-lib'
    });
  }
});

app.get('/api/magalu/labels/danfe-simplificado', auth, async (req, res) => {
  try {
    const rawIds = String(req.query.ids || req.query.id || '').split(',').map(x => x.trim()).filter(Boolean);
    const deliveryIds = [...new Set(rawIds)].slice(0, 30);
    if (!deliveryIds.length) return res.status(400).json({ error: 'Informe ao menos um delivery id em ?ids=' });

    const acc = await getMagaluAccount(req.user.id);
    if (!acc) return res.status(401).json({ error: 'Magalu não conectado' });

    const items = [];
    for (const id of deliveryIds) items.push(await fetchMagaluDeliveryAndInvoice(acc, id));
    const mode = String(req.query.size || req.query.mode || 'a4').toLowerCase();
    const pdf = await buildMagaluDanfeOnlyPdfBuffer(items, { mode });
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `inline; filename="magalu-danfe-simplificado-${mode}-${deliveryIds.length}.pdf"`);
    return res.send(pdf);
  } catch (e) {
    res.status(500).json({
      error: 'Não foi possível gerar DANFE simplificado',
      message: e.message,
      install: 'Se faltar dependência, rode: npm install pdfkit bwip-js'
    });
  }
});

app.get('/api/magalu/labels/salesync-pdf', auth, async (req, res) => {
  try {
    const rawIds = String(req.query.ids || req.query.id || '').split(',').map(x => x.trim()).filter(Boolean);
    const deliveryIds = [...new Set(rawIds)].slice(0, 20);
    if (!deliveryIds.length) return res.status(400).json({ error: 'Informe ao menos um delivery id em ?ids=' });

    const acc = await getMagaluAccount(req.user.id);
    if (!acc) return res.status(401).json({ error: 'Magalu não conectado' });

    const items = [];
    for (const id of deliveryIds) items.push(await fetchMagaluDeliveryAndInvoice(acc, id));
    const pdf = await buildMagaluSimplifiedPdfBuffer(items);
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `inline; filename="magalu-etiquetas-danfe-salesync-${deliveryIds.length}.pdf"`);
    return res.send(pdf);
  } catch (e) {
    res.status(500).json({
      error: 'Não foi possível gerar PDF SalesSync etiqueta + DANFE simplificado',
      message: e.message,
      install: 'Se faltar dependência, rode: npm install pdfkit bwip-js'
    });
  }
});

app.get('/api/magalu/labels/official', auth, async (req, res) => {
  try {
    const rawIds = String(req.query.ids || req.query.id || '').split(',').map(x => x.trim()).filter(Boolean);
    const deliveryIds = [...new Set(rawIds)].slice(0, 30);
    if (!deliveryIds.length) return res.status(400).json({ error: 'Informe ao menos um delivery id em ?ids=' });

    const acc = await getMagaluAccount(req.user.id);
    if (!acc) return res.status(401).json({ error: 'Magalu não conectado' });

    const firstProbe = await inspectMagaluDelivery(acc, deliveryIds[0]);
    const channels = inferMagaluChannelObjectsFromProbe(firstProbe);
    if (req.query.channel) channels.unshift({ id: String(req.query.channel), extras: {} });
    const channel = channels[0];
    if (!channel?.id) {
      return res.status(422).json({
        error: 'Canal Magalu não encontrado para gerar etiqueta',
        hint: 'A API exige channel como objeto { id, extras }. Verifique delivery.order.channel.id no debug.',
        delivery_ids: deliveryIds,
        delivery_probe: firstProbe
      });
    }

    const opts = normalizeMagaluLabelOptions(req.query);
    const payload = {
      channel,
      deliveries: deliveryIds.map(id => ({ id })),
      label: { type: opts.type, format: opts.format }
    };

    const r = await postMagaluShippingLabel(acc, payload);
    const ct = r.headers?.['content-type'] || '';
    const buf = Buffer.from(r.data || '');

    const pdf = extractPdfBufferFromLabelResponse(r.data, ct);
    if (r.status >= 200 && r.status < 300 && pdf) {
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `inline; filename="magalu-etiquetas-${deliveryIds.length}-${opts.type}.pdf"`);
      return res.send(pdf);
    }

    const parsed = parseMagaluLabelResponse(r.data);
    const signedUrl = findMagaluSignedUrl(parsed);
    if (r.status >= 200 && r.status < 300 && signedUrl) {
      if (String(req.query.redirect || '1') !== '0') return res.redirect(302, signedUrl);
      return res.json({ success: true, delivery_ids: deliveryIds, payload, ...parsed });
    }

    return res.status(r.status || 422).json({
      error: 'Não foi possível gerar etiquetas Magalu em lote',
      hint: 'Use type=full&format=pdf para etiqueta + DANFE simplificado. Use format=zpl para Zebra.',
      endpoint: 'POST /seller/v1/logistics/shipping-labels',
      delivery_ids: deliveryIds,
      payload,
      status: r.status,
      content_type: ct,
      response: parsed || buf.toString('utf8').slice(0, 2500),
      first_delivery_probe: firstProbe
    });
  } catch (e) {
    res.status(e.response?.status || 500).json({
      error: e.message,
      data: e.response?.data?.toString?.() || e.response?.data
    });
  }
});

app.get('/api/magalu/delivery/:id/official-label', auth, async (req, res) => {
  const deliveryId = req.params.id;

  try {
    const acc = await getMagaluAccount(req.user.id);
    if (!acc) return res.status(401).json({ error: 'Magalu não conectado' });

    const delivery_probe = await inspectMagaluDelivery(acc, deliveryId);
    const channels = inferMagaluChannelObjectsFromProbe(delivery_probe);
    if (req.query.channel) channels.unshift({ id: String(req.query.channel), extras: {} });

    const channel = channels[0];
    if (!channel?.id) {
      return res.status(422).json({
        error: 'Canal Magalu não encontrado para gerar etiqueta',
        hint: 'A API exige channel como objeto { id, extras }. Verifique delivery.order.channel.id no debug.',
        delivery_id: deliveryId,
        delivery_probe
      });
    }

    const opts = normalizeMagaluLabelOptions(req.query);
    const payload = magaluSingleLabelPayload(deliveryId, channel, opts);
    const r = await postMagaluShippingLabel(acc, payload);
    const ct = r.headers?.['content-type'] || '';
    const buf = Buffer.from(r.data || '');

    // 1) PDF direto ou base64 PDF legado
    const pdf = extractPdfBufferFromLabelResponse(r.data, ct);
    if (r.status >= 200 && r.status < 300 && pdf) {
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `inline; filename="${magaluLabelFilename(deliveryId, opts.type, 'pdf')}"`);
      return res.send(pdf);
    }

    // 2) Fluxo oficial atual da Magalu: JSON com label.signed_url.
    const parsed = parseMagaluLabelResponse(r.data);
    const signedUrl = findMagaluSignedUrl(parsed);
    if (r.status >= 200 && r.status < 300 && signedUrl) {
      // Por padrão abre o PDF/ZIP assinado direto. Use ?redirect=0 para receber JSON.
      if (String(req.query.redirect || '1') !== '0') return res.redirect(302, signedUrl);
      return res.json({ success: true, delivery_id: deliveryId, payload, ...parsed });
    }

    return res.status(r.status || 422).json({
      error: 'Não foi possível gerar etiqueta Magalu',
      hint: 'A rota usa o formato oficial: channel como objeto {id, extras}, label.format=pdf|zpl e label.type=full|summary.',
      endpoint: 'POST /seller/v1/logistics/shipping-labels',
      delivery_id: deliveryId,
      payload,
      status: r.status,
      content_type: ct,
      response: parsed || buf.toString('utf8').slice(0, 2000),
      delivery_probe
    });

  } catch (e) {
    res.status(e.response?.status || 500).json({
      error: e.message,
      data: e.response?.data?.toString?.() || e.response?.data
    });
  }
});

app.get('/health', (_, res) => res.json({ status:'ok', app:'SalesSync', version:'5.0' }));

const PORT = process.env.PORT || 3000;
app.listen(PORT, '0.0.0.0', () => console.log(`⚡ SalesSync v5.2 rodando na porta ${PORT}`));  
