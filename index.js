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
    await ensureSalesSyncSchema();
    await ensureOrdersReturnsSchema();
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


// SalesSync v17 — schema de metas/snapshots com auto-correção de colunas antigas
async function ensureSalesSyncSchema() {
  try {
    // Metas do usuário
    await db.query(`CREATE TABLE IF NOT EXISTS user_goals (
      id BIGSERIAL PRIMARY KEY,
      user_id UUID NOT NULL UNIQUE
    )`);
    await db.query(`ALTER TABLE user_goals ADD COLUMN IF NOT EXISTS revenue_goal_enabled BOOLEAN NOT NULL DEFAULT FALSE`);
    await db.query(`ALTER TABLE user_goals ADD COLUMN IF NOT EXISTS monthly_revenue_goal NUMERIC(14,2) NOT NULL DEFAULT 0`);
    await db.query(`ALTER TABLE user_goals ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP NOT NULL DEFAULT NOW()`);

    // Snapshot mensal consolidado
    await db.query(`CREATE TABLE IF NOT EXISTS monthly_snapshots (
      id BIGSERIAL PRIMARY KEY,
      user_id UUID NOT NULL,
      snapshot_month DATE NOT NULL,
      gross_sales NUMERIC(14,2) NOT NULL DEFAULT 0,
      net_profit NUMERIC(14,2) NOT NULL DEFAULT 0,
      orders_count INTEGER NOT NULL DEFAULT 0,
      avg_ticket NUMERIC(14,2) NOT NULL DEFAULT 0,
      best_seller_product TEXT,
      most_profitable_product TEXT,
      created_at TIMESTAMP NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
      UNIQUE(user_id, snapshot_month)
    )`);
    await db.query(`ALTER TABLE monthly_snapshots ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP NOT NULL DEFAULT NOW()`);
    await db.query(`CREATE INDEX IF NOT EXISTS idx_monthly_snapshots_user ON monthly_snapshots(user_id)`);
    await db.query(`CREATE INDEX IF NOT EXISTS idx_monthly_snapshots_month ON monthly_snapshots(snapshot_month)`);

    // Snapshot mensal por plataforma para gráficos comparativos.
    // Seguro para rodar em tabelas já criadas: sempre usa IF NOT EXISTS.
    await db.query(`CREATE TABLE IF NOT EXISTS platform_monthly_snapshots (
      id BIGSERIAL PRIMARY KEY,
      user_id UUID NOT NULL,
      platform TEXT NOT NULL,
      snapshot_month DATE NOT NULL,
      gross_sales NUMERIC(14,2) NOT NULL DEFAULT 0,
      orders_count INTEGER NOT NULL DEFAULT 0,
      created_at TIMESTAMP NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
      UNIQUE(user_id, platform, snapshot_month)
    )`);
    await db.query(`ALTER TABLE platform_monthly_snapshots ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP NOT NULL DEFAULT NOW()`);
    await db.query(`CREATE INDEX IF NOT EXISTS idx_platform_monthly_snapshots_user_month ON platform_monthly_snapshots(user_id, snapshot_month)`);
    await db.query(`CREATE INDEX IF NOT EXISTS idx_platform_monthly_snapshots_platform ON platform_monthly_snapshots(platform)`);



    // Rendimentos extras que entram no faturamento bruto do resumo.
    // recurring=true soma todo mês; recurring=false soma somente no mês de starts_at.
    await db.query(`CREATE TABLE IF NOT EXISTS additional_revenues (
      id BIGSERIAL PRIMARY KEY,
      user_id UUID NOT NULL,
      name TEXT NOT NULL,
      amount NUMERIC(14,2) NOT NULL DEFAULT 0,
      recurring BOOLEAN NOT NULL DEFAULT FALSE,
      starts_at DATE NOT NULL DEFAULT CURRENT_DATE,
      is_active BOOLEAN NOT NULL DEFAULT TRUE,
      created_at TIMESTAMP NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMP NOT NULL DEFAULT NOW()
    )`);
    await db.query(`ALTER TABLE additional_revenues ADD COLUMN IF NOT EXISTS recurring BOOLEAN NOT NULL DEFAULT FALSE`);
    await db.query(`ALTER TABLE additional_revenues ADD COLUMN IF NOT EXISTS starts_at DATE NOT NULL DEFAULT CURRENT_DATE`);
    await db.query(`ALTER TABLE additional_revenues ADD COLUMN IF NOT EXISTS is_active BOOLEAN NOT NULL DEFAULT TRUE`);
    await db.query(`ALTER TABLE additional_revenues ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP NOT NULL DEFAULT NOW()`);
    await db.query(`CREATE INDEX IF NOT EXISTS idx_additional_revenues_user_active ON additional_revenues(user_id, is_active)`);

    console.log('✅ SalesSync schema OK: metas + snapshots mensais + plataformas + rendimentos extras');
  } catch (e) {
    console.error('[SalesSync schema]', e.message);
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

async function fetchMLShipmentCosts(token, shipmentId) {
  if (!shipmentId) return null;
  const headers = { Authorization: `Bearer ${token}` };
  const urls = [
    `https://api.mercadolibre.com/shipments/${shipmentId}/costs`,
    `https://api.mercadolibre.com/shipments/${shipmentId}/payments`,
  ];
  for (const url of urls) {
    try {
      const { data } = await axios.get(url, { headers });
      return data || null;
    } catch (e) {
      const st = e.response?.status;
      if (st && ![403, 404, 405].includes(Number(st))) {
        console.warn('[ML shipment costs]', shipmentId, st, e.response?.data || e.message);
      }
    }
  }
  return null;
}

function pickNumberDeep(obj, paths=[]) {
  for (const path of paths) {
    const val = path.split('.').reduce((acc, key) => acc && acc[key], obj);
    const n = Number(val);
    if (Number.isFinite(n) && n > 0) return n;
  }
  return 0;
}

function resolveMLShippingFee({ order, shipment, shipmentCosts, totalAmount, paidAmount }) {
  const payments = Array.isArray(order?.payments) ? order.payments : [];

  // ATENÇÃO ML:
  // Para saber o frete cobrado do vendedor, o campo mais confiável é:
  // GET /shipments/{shipment_id}/costs -> senders[].cost
  // payment.shipping_cost costuma representar frete do pagamento/comprador e pode não bater com o financeiro do vendedor.
  const senderCost = Array.isArray(shipmentCosts?.senders)
    ? shipmentCosts.senders.reduce((sum, x) => sum + Number(x?.cost || x?.amount || x?.user_cost || 0), 0)
    : 0;

  const paymentShippingFee = payments.reduce((sum, p) => sum + Number(p?.shipping_cost || p?.shipping_amount || p?.shipment_cost || 0), 0);
  const orderShippingFee = Number(order?.shipping_cost || order?.shipping?.cost || order?.shipping?.amount || 0);
  const shipmentCost = pickNumberDeep(shipment || {}, [
    'shipping_option.cost', 'shipping_option.list_cost', 'shipping_option.base_cost',
    'cost', 'base_cost', 'list_cost', 'receiver_cost'
  ]);
  const costsEndpointFee = senderCost || pickNumberDeep(shipmentCosts || {}, [
    'sender.cost', 'sender.amount',
    'receiver.cost', 'receiver.amount', 'receiver.user_cost',
    'shipping_option.cost', 'gross_amount', 'amount', 'cost', 'list_cost', 'base_cost'
  ]);
  const paidDiff = Math.max(0, Number(paidAmount || 0) - Number(totalAmount || 0));

  // SalesSync: no debug real o frete do ML apareceu em payments[].shipping_cost.
  // Por isso a prioridade agora é pagamento > shipment/costs > diferença pago-total.
  const candidates = [
    ['payment_shipping_cost', paymentShippingFee],
    ['shipment_costs_senders_cost', senderCost],
    ['shipment_costs_endpoint', costsEndpointFee],
    ['shipment_shipping_option', shipmentCost],
    ['order_shipping_cost', orderShippingFee],
    ['paid_minus_total', paidDiff],
  ];
  const found = candidates.find(([, v]) => Number.isFinite(Number(v)) && Number(v) > 0);
  return {
    value: found ? Number(found[1]) : 0,
    source: found ? found[0] : 'not_found',
    payment_shipping_fee: Number(paymentShippingFee || 0),
    order_shipping_fee: Number(orderShippingFee || 0),
    shipment_cost: Number(shipmentCost || 0),
    costs_endpoint_fee: Number(costsEndpointFee || 0),
    sender_cost: Number(senderCost || 0),
    paid_diff: Number(paidDiff || 0)
  };
}
async function ssMapLimit(items, limit, worker) {
  const arr = Array.isArray(items) ? items : [];
  const out = [];
  for (let i = 0; i < arr.length; i += limit) {
    const part = arr.slice(i, i + limit);
    out.push(...await Promise.all(part.map(worker)));
  }
  return out;
}


async function fetchMLItemDetails(token, itemId) {
  if (!itemId) return null;

  async function normalize(data) {
    const image = data?.pictures?.[0]?.secure_url || data?.pictures?.[0]?.url || data?.secure_thumbnail || data?.thumbnail || null;
    return {
      item_id: String(itemId),
      image_url: image,
      title: data?.title || '',
      seller_sku: data?.seller_custom_field || data?.seller_sku || ''
    };
  }

  // Alguns apps ML bloqueiam /items com Authorization por PolicyAgent.
  // Primeiro tenta público SEM token. Se não der, tenta com token. Nenhuma falha de imagem deve quebrar pedidos.
  try {
    const { data } = await axios.get(`https://api.mercadolibre.com/items/${itemId}`);
    return normalize(data);
  } catch (publicErr) {
    try {
      const { data } = await axios.get(`https://api.mercadolibre.com/items/${itemId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      return normalize(data);
    } catch (authErr) {
      const st = authErr.response?.status || publicErr.response?.status || '';
      const code = authErr.response?.data?.code || publicErr.response?.data?.code || '';
      console.warn('[ML item image skipped]', itemId, st, code || authErr.message || publicErr.message);
      return null;
    }
  }
}

async function getMLItemDetailsCached(token, itemIds=[]) {
  const ids = [...new Set((itemIds || []).map(x => String(x || '').trim()).filter(Boolean))];
  if (!ids.length) return {};
  const out = {};
  try {
    const { rows } = await db.query(
      `SELECT item_id, image_url, title, seller_sku FROM marketplace_item_images WHERE platform='mercadolivre' AND item_id = ANY($1::text[])`,
      [ids]
    );
    for (const r of rows) out[String(r.item_id)] = { image_url:r.image_url, title:r.title, seller_sku:r.seller_sku };
  } catch(e) {
    console.warn('[ML item cache read]', e.message);
  }

  const missing = ids.filter(id => !out[id]?.image_url);
  // Limita para não deixar a sincronização pesada. O resto entra na próxima atualização.
  await Promise.all(missing.slice(0, 120).map(async id => {
    const det = await fetchMLItemDetails(token, id);
    if (!det) return;
    out[id] = { image_url:det.image_url, title:det.title, seller_sku:det.seller_sku };
    try {
      await db.query(
        `INSERT INTO marketplace_item_images (platform, item_id, image_url, title, seller_sku, updated_at)
         VALUES ('mercadolivre',$1,$2,$3,$4,NOW())
         ON CONFLICT (platform, item_id) DO UPDATE SET
           image_url=COALESCE(EXCLUDED.image_url, marketplace_item_images.image_url),
           title=COALESCE(NULLIF(EXCLUDED.title,''), marketplace_item_images.title),
           seller_sku=COALESCE(NULLIF(EXCLUDED.seller_sku,''), marketplace_item_images.seller_sku),
           updated_at=NOW()`,
        [id, det.image_url || null, det.title || null, det.seller_sku || null]
      );
    } catch(e) { console.warn('[ML item cache write]', e.message); }
  }));
  return out;
}

async function fetchML(acc, days) {
  let token = acc.access_token;
  if (acc.token_expires_at && new Date(acc.token_expires_at) <= new Date(Date.now() + 5*60*1000)) {
    console.log('[ML] Token expirando, renovando...');
    const newToken = await refreshMLToken(acc);
    if (newToken) token = newToken;
  }

  const safeDays = Math.max(1, Math.min(parseInt(days || 30, 10), 220));
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
  await ssMapLimit(shipmentIds, 8, async id => {
    const det = await fetchMLShipmentDetails(token, id);
    if (det) shipmentMap[String(id)] = det;
  });

  // Frete do ML pode vir em locais diferentes dependendo do tipo de envio/pagamento.
  const shipmentCostMap = {};
  await ssMapLimit(shipmentIds, 8, async id => {
    const det = await fetchMLShipmentCosts(token, id);
    if (det) shipmentCostMap[String(id)] = det;
  });

  // Foto do produto: orders/search não traz imagem. Busca /items/{item_id}, salva URL no SQL
  // e nas próximas cargas usa o cache marketplace_item_images para não ficar lento.
  const itemIdsForImages = [...new Set(uniqueResults.map(o => o.order_items?.[0]?.item?.id).filter(Boolean))];
  const itemImageMap = await getMLItemDetailsCached(token, itemIdsForImages);

  const statusMap = {
    paid:'paid', payment_required:'pending', pending:'pending',
    confirmed:'paid', shipped:'shipped', delivered:'delivered',
    cancelled:'cancelled', invalid:'cancelled',
  };

  return uniqueResults.map(o => {
    const item = o.order_items?.[0] || {};
    const mlItemId = item?.item?.id || null;
    const itemDetails = mlItemId ? itemImageMap[String(mlItemId)] : null;
    const shipmentId = o.shipping?.id || null;
    const shipment = shipmentId ? shipmentMap[String(shipmentId)] : null;
    const qty = parseFloat(item?.quantity || 1);
    const totalAmount = parseFloat(o.total_amount || 0);
    const paidAmount = parseFloat(o.paid_amount || o.payments?.[0]?.total_paid_amount || 0);

    // Tarifa real do ML: vem em order_items[].sale_fee.
    const platformFee = (o.order_items || []).reduce((sum, it) => {
      return sum + (parseFloat(it.sale_fee || 0) * parseFloat(it.quantity || 1));
    }, 0);

    const shippingInfo = resolveMLShippingFee({
      order: o,
      shipment,
      shipmentCosts: shipmentId ? shipmentCostMap[String(shipmentId)] : null,
      totalAmount,
      paidAmount
    });
    const shippingFee = shippingInfo.value;
    const paymentShippingFee = shippingInfo.payment_shipping_fee;

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
      shipping_fee_source: shippingInfo.source,
      payment_shipping_fee: paymentShippingFee,
      order_shipping_fee: shippingInfo.order_shipping_fee,
      shipment_shipping_fee: shippingInfo.shipment_cost,
      shipment_costs_fee: shippingInfo.costs_endpoint_fee,
      shipment_sender_cost: shippingInfo.sender_cost,
      paid_minus_total_shipping: shippingInfo.paid_diff,
      tax_amount:       0,
      quantity:         qty,
      order_date:       o.date_created,
      date_closed:      o.date_closed || null,
      date_last_updated:o.date_last_updated || o.last_updated || null,
      item_title:       item?.item?.title || itemDetails?.title || payment.reason || '',
      item_image:       itemDetails?.image_url || null,
      item_sku:         item?.item?.seller_sku || item?.item?.seller_custom_field || itemDetails?.seller_sku || '',
      item_id:          mlItemId,
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
      status_detail:     o.status_detail || payment.status_detail || '',
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

  const returnRows = await db.query(`SELECT platform, platform_order_id, SUM(return_total_cost) AS return_total_cost FROM marketplace_returns WHERE user_id=$1 GROUP BY platform, platform_order_id`, [userId]);
  const returnMap = {};
  for (const r of returnRows.rows) returnMap[`${normPlatform(r.platform)}:${String(r.platform_order_id||'')}`] = parseFloat(r.return_total_cost || 0);

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
    // Mercado Livre: frete é por pedido/cliente. Não usa frete padrão do SKU.
    const shipping_fee = platform === 'mercadolivre'
      ? parseFloat(o.shipping_fee || 0)
      : (ship_fixed === null ? parseFloat(o.shipping_fee || 0) : (parseFloat(ship_fixed || 0) * (o.quantity || 1)));
    const tax_amount = tax_pct === null ? parseFloat(o.tax_amount || 0) : (total_amount * tax_pct / 100);
    const net_revenue= total_amount - platform_fee - shipping_fee - tax_amount;
    const return_total_cost = returnMap[`${platform}:${String(o.platform_order_id || o.id || '')}`] || 0;
    const profit     = o.status === 'cancelled' ? 0 : (net_revenue - total_cost - return_total_cost);
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
      return_total_cost,
      net_revenue,
      profit,
      profit_margin_pct: margin
    };
  });
}
function monthKeyFromDate(d) {
  const dt = new Date(d);
  if (Number.isNaN(dt.getTime())) return null;
  return `${dt.getUTCFullYear()}-${String(dt.getUTCMonth() + 1).padStart(2, '0')}-01`;
}

function lastNMonthStarts(n = 5) {
  // Retorna somente meses FECHADOS, nunca o mês atual.
  // Exemplo: se hoje está em maio e n=5 => dez, jan, fev, mar, abr.
  const now = new Date();
  const currentMonthStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));
  const out = [];
  for (let i = n; i >= 1; i--) {
    const d = new Date(Date.UTC(currentMonthStart.getUTCFullYear(), currentMonthStart.getUTCMonth() - i, 1));
    out.push(d.toISOString().slice(0, 10));
  }
  return out;
}

function moneyNumber(v) {
  const n = Number(v || 0);
  return Number.isFinite(n) ? n : 0;
}

function normalizeOrderMonthAndGross(o) {
  const date =
    o.order_date ||
    o.created_at ||
    o.purchased_at ||
    o.date_created ||
    o.approved_at ||
    o.invoiced_at;

  const month = monthKeyFromDate(date);

  // ML usa total_amount já em reais; Magalu normalizado no fetch deve vir total_amount em reais.
  const gross =
    moneyNumber(o.total_amount) ||
    moneyNumber(o.paid_amount) ||
    moneyNumber(o.amount_total) ||
    0;

  return { month, gross };
}

async function savePlatformMonthlySnapshot(userId, platform, snapshotMonth, grossSales, ordersCount) {
  await db.query(`
    INSERT INTO platform_monthly_snapshots
      (user_id, platform, snapshot_month, gross_sales, orders_count, updated_at)
    VALUES ($1, $2, $3, $4, $5, NOW())
    ON CONFLICT (user_id, platform, snapshot_month)
    DO UPDATE SET
      gross_sales = EXCLUDED.gross_sales,
      orders_count = EXCLUDED.orders_count,
      updated_at = NOW()
  `, [userId, platform, snapshotMonth, grossSales, ordersCount]);
}

app.post('/api/debug/monthly-revenue-backfill', auth, async (req, res) => {
  const months = Math.min(Math.max(parseInt(req.query.months || '5', 10), 1), 6);
  const monthStarts = lastNMonthStarts(months);

  // janela com folga: 31 dias * meses + 10 dias
  const days = Math.min((months * 31) + 10, 200);

  try {
    const { rows: accounts } = await db.query(`
      SELECT *
      FROM marketplace_accounts
      WHERE user_id=$1
        AND is_active=true
        AND access_token IS NOT NULL
        AND platform IN ('mercadolivre', 'magalu')
    `, [req.user.id]);

    const result = {
      ok: true,
      months: monthStarts,
      days_window: days,
      platforms: {},
      saved: []
    };

    for (const acc of accounts) {
      const platform = String(acc.platform || '').toLowerCase();
      let orders = [];

      try {
        if (platform === 'mercadolivre') {
          orders = await fetchML(acc, days);
        } else if (platform === 'magalu') {
          orders = await fetchMagalu(acc, days);
        }
      } catch (e) {
        result.platforms[platform] = {
          error: e.response?.data || e.message,
          orders_count: 0,
          monthly: {}
        };
        continue;
      }

      const monthly = {};
      for (const m of monthStarts) {
        monthly[m] = { gross_sales: 0, orders_count: 0 };
      }

      for (const o of orders || []) {
        const { month, gross } = normalizeOrderMonthAndGross(o);
        if (!month || !monthly[month]) continue;

        const status = String(o.status || '').toLowerCase();
        if (['cancelled', 'canceled', 'cancelado', 'invalid'].includes(status)) continue;

        monthly[month].gross_sales += gross;
        monthly[month].orders_count += 1;
      }

      for (const m of monthStarts) {
        monthly[m].gross_sales = Number(monthly[m].gross_sales.toFixed(2));
        await savePlatformMonthlySnapshot(
          req.user.id,
          platform,
          m,
          monthly[m].gross_sales,
          monthly[m].orders_count
        );
        result.saved.push({ platform, month: m, ...monthly[m] });
      }

      result.platforms[platform] = {
        shop_name: acc.shop_name,
        orders_scanned: (orders || []).length,
        monthly
      };
    }

    // retorno consolidado para gráfico
    const { rows: snapshots } = await db.query(`
      SELECT platform, snapshot_month::date AS month, gross_sales, orders_count
      FROM platform_monthly_snapshots
      WHERE user_id=$1
        AND snapshot_month = ANY($2::date[])
      ORDER BY snapshot_month ASC, platform ASC
    `, [req.user.id, monthStarts]);

    result.snapshots = snapshots;

    const totalsByMonth = {};
    for (const m of monthStarts) totalsByMonth[m] = { month: m, total: 0, platforms: {} };
    for (const s of snapshots) {
      const m = s.month instanceof Date ? s.month.toISOString().slice(0,10) : String(s.month).slice(0,10);
      const platform = String(s.platform || '').toLowerCase();
      const value = Number(s.gross_sales || 0);
      if (!totalsByMonth[m]) totalsByMonth[m] = { month: m, total: 0, platforms: {} };
      totalsByMonth[m].total += value;
      totalsByMonth[m].platforms[platform] = { gross_sales: value, orders_count: Number(s.orders_count || 0), percentage: 0 };
    }
    result.monthly_chart = Object.values(totalsByMonth).map(m => {
      for (const p of Object.keys(m.platforms)) {
        m.platforms[p].percentage = m.total > 0 ? Math.round((m.platforms[p].gross_sales / m.total) * 10000) / 100 : 0;
      }
      return {
        ...m,
        magalu: m.platforms.magalu?.gross_sales || 0,
        mercadolivre: m.platforms.mercadolivre?.gross_sales || 0,
        magalu_pct: m.total > 0 ? Math.round(((m.platforms.magalu?.gross_sales || 0) / m.total) * 10000) / 100 : 0,
        mercadolivre_pct: m.total > 0 ? Math.round(((m.platforms.mercadolivre?.gross_sales || 0) / m.total) * 10000) / 100 : 0
      };
    });

    res.json(result);
  } catch (e) {
    console.error('[monthly-revenue-backfill]', e);
    res.status(500).json({ error: e.message });
  }
});

app.get('/api/analytics/monthly-platforms', auth, async (req, res) => {
  try {
    const months = Math.min(Math.max(parseInt(req.query.months || '5', 10), 1), 12);
    const monthStarts = lastNMonthStarts(months);

    const { rows } = await db.query(`
      SELECT platform, snapshot_month::date AS month, gross_sales, orders_count
      FROM platform_monthly_snapshots
      WHERE user_id=$1
        AND snapshot_month = ANY($2::date[])
      ORDER BY snapshot_month ASC, platform ASC
    `, [req.user.id, monthStarts]);

    const totals = {};
    for (const m of monthStarts) totals[m] = { month: m, total: 0, platforms: {} };
    for (const r of rows) {
      const m = r.month instanceof Date ? r.month.toISOString().slice(0,10) : String(r.month).slice(0,10);
      const platform = String(r.platform || '').toLowerCase();
      const value = Number(r.gross_sales || 0);
      if (!totals[m]) totals[m] = { month: m, total: 0, platforms: {} };
      totals[m].total += value;
      totals[m].platforms[platform] = { gross_sales: value, orders_count: Number(r.orders_count || 0), percentage: 0 };
    }
    const chart = Object.values(totals).map(m => {
      for (const p of Object.keys(m.platforms)) {
        m.platforms[p].percentage = m.total > 0 ? Math.round((m.platforms[p].gross_sales / m.total) * 10000) / 100 : 0;
      }
      return {
        ...m,
        magalu: m.platforms.magalu?.gross_sales || 0,
        mercadolivre: m.platforms.mercadolivre?.gross_sales || 0,
        magalu_pct: m.total > 0 ? Math.round(((m.platforms.magalu?.gross_sales || 0) / m.total) * 10000) / 100 : 0,
        mercadolivre_pct: m.total > 0 ? Math.round(((m.platforms.mercadolivre?.gross_sales || 0) / m.total) * 10000) / 100 : 0
      };
    });
    res.json({ success: true, months: monthStarts, data: rows, chart });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});



// ── SALES SYNC v21 — vendas em SQL + custos de devolução ──
async function ensureOrdersReturnsSchema() {
  try {
    await db.query(`CREATE TABLE IF NOT EXISTS marketplace_orders (
      id BIGSERIAL PRIMARY KEY,
      user_id UUID NOT NULL,
      platform TEXT NOT NULL,
      account_id UUID,
      platform_order_id TEXT NOT NULL,
      shop_name TEXT,
      status TEXT,
      fulfillment_type TEXT,
      buyer_name TEXT,
      total_amount NUMERIC(14,2) NOT NULL DEFAULT 0,
      paid_amount NUMERIC(14,2) NOT NULL DEFAULT 0,
      platform_fee NUMERIC(14,2) NOT NULL DEFAULT 0,
      shipping_fee NUMERIC(14,2) NOT NULL DEFAULT 0,
      tax_amount NUMERIC(14,2) NOT NULL DEFAULT 0,
      quantity NUMERIC(14,4) NOT NULL DEFAULT 1,
      order_date TIMESTAMP,
      item_title TEXT,
      item_image TEXT,
      item_sku TEXT,
      raw_json JSONB,
      created_at TIMESTAMP NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
      UNIQUE(user_id, platform, platform_order_id)
    )`);

    // Correção para bases antigas: versões anteriores criaram account_id como BIGINT.
    // O id da tabela marketplace_accounts é UUID, então converter BIGINT direto quebrava a sync.
    // Se a coluna antiga existir como BIGINT/INTEGER, zera e converte para UUID.
    await db.query(`DO $$
    BEGIN
      IF EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name='marketplace_orders' AND column_name='account_id'
          AND data_type IN ('bigint','integer','numeric')
      ) THEN
        ALTER TABLE marketplace_orders ALTER COLUMN account_id DROP DEFAULT;
        ALTER TABLE marketplace_orders ALTER COLUMN account_id TYPE UUID USING NULL;
      END IF;
    END $$;`);

    await db.query(`ALTER TABLE marketplace_orders ADD COLUMN IF NOT EXISTS account_id UUID`);
    await db.query(`ALTER TABLE marketplace_orders ADD COLUMN IF NOT EXISTS raw_json JSONB`);
    await db.query(`ALTER TABLE marketplace_orders ADD COLUMN IF NOT EXISTS manual_shipping_fee NUMERIC(14,2)`);
    await db.query(`ALTER TABLE marketplace_orders ADD COLUMN IF NOT EXISTS shipping_fee_source TEXT`);
    await db.query(`CREATE INDEX IF NOT EXISTS idx_marketplace_orders_user_date ON marketplace_orders(user_id, order_date DESC)`);
    await db.query(`CREATE INDEX IF NOT EXISTS idx_marketplace_orders_platform ON marketplace_orders(user_id, platform)`);

    // Cache de imagens dos anúncios. Guarda a URL da imagem, não o arquivo binário.
    // Isso deixa a listagem rápida e evita chamar /items/{id} toda hora.
    await db.query(`CREATE TABLE IF NOT EXISTS marketplace_item_images (
      id BIGSERIAL PRIMARY KEY,
      platform TEXT NOT NULL,
      item_id TEXT NOT NULL,
      image_url TEXT,
      title TEXT,
      seller_sku TEXT,
      created_at TIMESTAMP NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
      UNIQUE(platform, item_id)
    )`);
    await db.query(`CREATE INDEX IF NOT EXISTS idx_marketplace_item_images_platform_item ON marketplace_item_images(platform, item_id)`);

    await db.query(`CREATE TABLE IF NOT EXISTS marketplace_returns (
      id BIGSERIAL PRIMARY KEY,
      user_id UUID NOT NULL,
      platform TEXT NOT NULL,
      account_id UUID,
      platform_order_id TEXT,
      external_return_id TEXT NOT NULL,
      external_ticket_id TEXT,
      status TEXT,
      reason TEXT,
      type TEXT DEFAULT 'return',
      buyer_message TEXT,
      return_tracking_code TEXT,
      return_shipping_cost NUMERIC(14,2) NOT NULL DEFAULT 0,
      return_fee NUMERIC(14,2) NOT NULL DEFAULT 0,
      refund_adjustment NUMERIC(14,2) NOT NULL DEFAULT 0,
      lost_product_cost NUMERIC(14,2) NOT NULL DEFAULT 0,
      return_total_cost NUMERIC(14,2) NOT NULL DEFAULT 0,
      raw_json JSONB,
      created_at TIMESTAMP NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
      UNIQUE(user_id, platform, external_return_id)
    )`);

    await db.query(`DO $$
    BEGIN
      IF EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name='marketplace_returns' AND column_name='account_id'
          AND data_type IN ('bigint','integer','numeric')
      ) THEN
        ALTER TABLE marketplace_returns ALTER COLUMN account_id DROP DEFAULT;
        ALTER TABLE marketplace_returns ALTER COLUMN account_id TYPE UUID USING NULL;
      END IF;
    END $$;`);
    await db.query(`ALTER TABLE marketplace_returns ADD COLUMN IF NOT EXISTS account_id UUID`);

    await db.query(`ALTER TABLE marketplace_returns ADD COLUMN IF NOT EXISTS return_shipping_cost NUMERIC(14,2) NOT NULL DEFAULT 0`);
    await db.query(`ALTER TABLE marketplace_returns ADD COLUMN IF NOT EXISTS return_fee NUMERIC(14,2) NOT NULL DEFAULT 0`);
    await db.query(`ALTER TABLE marketplace_returns ADD COLUMN IF NOT EXISTS refund_adjustment NUMERIC(14,2) NOT NULL DEFAULT 0`);
    await db.query(`ALTER TABLE marketplace_returns ADD COLUMN IF NOT EXISTS lost_product_cost NUMERIC(14,2) NOT NULL DEFAULT 0`);
    await db.query(`ALTER TABLE marketplace_returns ADD COLUMN IF NOT EXISTS return_total_cost NUMERIC(14,2) NOT NULL DEFAULT 0`);
    await db.query(`CREATE INDEX IF NOT EXISTS idx_marketplace_returns_user_status ON marketplace_returns(user_id, status)`);
    await db.query(`CREATE INDEX IF NOT EXISTS idx_marketplace_returns_order ON marketplace_returns(user_id, platform, platform_order_id)`);
    console.log('✅ Orders/Returns schema OK: vendas em SQL + custos de devolução');
  } catch (e) { console.error('[Orders/Returns schema]', e.message); }
}

function ssNum2(v){ const n=Number(v||0); return Number.isFinite(n)?n:0; }
function ssIso(v){ const d=new Date(v||Date.now()); return Number.isFinite(d.getTime())?d.toISOString():new Date().toISOString(); }

async function ssUpsertOrders(userId, accountId, orders=[]) {
  for (const o of orders || []) {
    const platform = normPlatform(o.platform);
    const oid = String(o.platform_order_id || o.id || '').trim();
    if (!platform || !oid) continue;
    await db.query(`INSERT INTO marketplace_orders
      (user_id, platform, account_id, platform_order_id, shop_name, status, fulfillment_type, buyer_name,
       total_amount, paid_amount, platform_fee, shipping_fee, tax_amount, quantity, order_date,
       item_title, item_image, item_sku, raw_json, updated_at)
      VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,NOW())
      ON CONFLICT (user_id, platform, platform_order_id) DO UPDATE SET
        account_id=EXCLUDED.account_id, shop_name=EXCLUDED.shop_name, status=EXCLUDED.status,
        fulfillment_type=EXCLUDED.fulfillment_type, buyer_name=EXCLUDED.buyer_name,
        total_amount=EXCLUDED.total_amount, paid_amount=EXCLUDED.paid_amount, platform_fee=EXCLUDED.platform_fee,
        shipping_fee=EXCLUDED.shipping_fee,
        shipping_fee_source=COALESCE((EXCLUDED.raw_json->>'shipping_fee_source'), marketplace_orders.shipping_fee_source, 'auto'),
        tax_amount=EXCLUDED.tax_amount, quantity=EXCLUDED.quantity,
        order_date=EXCLUDED.order_date, item_title=EXCLUDED.item_title, item_image=EXCLUDED.item_image,
        item_sku=EXCLUDED.item_sku, raw_json=EXCLUDED.raw_json, updated_at=NOW()`,
      [userId, platform, accountId || null, oid, o.shop_name || null, o.status || null, o.fulfillment_type || null, o.buyer_name || null,
       ssNum2(o.total_amount), ssNum2(o.paid_amount || o.total_amount), ssNum2(o.platform_fee), ssNum2(o.shipping_fee), ssNum2(o.tax_amount), ssNum2(o.quantity || 1), ssIso(o.order_date),
       o.item_title || null, o.item_image || null, o.item_sku || null, JSON.stringify(o)]);
  }
}

async function ssLoadOrdersFromSql(userId, opts={}) {
  const platform = opts.platform || null;
  const from = opts.date_from ? new Date(String(opts.date_from)+'T00:00:00-03:00') : new Date(Date.now() - (Math.min(Math.max(parseInt(opts.period||7)||7,1),45) * 86400000));
  const to = opts.date_to ? new Date(String(opts.date_to)+'T23:59:59-03:00') : new Date();
  const params = [userId, from.toISOString(), to.toISOString()];
  let sql = `SELECT COALESCE(raw_json,'{}'::jsonb) AS raw_json, platform_order_id, platform, shop_name, status, fulfillment_type, buyer_name,
             total_amount, paid_amount, platform_fee, shipping_fee, manual_shipping_fee, shipping_fee_source, tax_amount, quantity, order_date, item_title, item_image, item_sku
             FROM marketplace_orders WHERE user_id=$1 AND order_date >= $2 AND order_date <= $3`;
  if (platform) { params.push(platform); sql += ` AND platform=$${params.length}`; }
  sql += ` ORDER BY order_date DESC LIMIT 3000`;
  const { rows } = await db.query(sql, params);
  return rows.map(r => ({
    ...(r.raw_json || {}),
    platform_order_id: String(r.platform_order_id), id: String(r.platform_order_id), platform: r.platform,
    shop_name: r.shop_name, status: r.status, fulfillment_type: r.fulfillment_type, buyer_name: r.buyer_name,
    total_amount: Number(r.total_amount||0), paid_amount: Number(r.paid_amount||0), platform_fee: Number(r.platform_fee||0),
    shipping_fee: r.manual_shipping_fee === null || r.manual_shipping_fee === undefined ? Number(r.shipping_fee||0) : Number(r.manual_shipping_fee||0),
    auto_shipping_fee: Number(r.shipping_fee||0),
    manual_shipping_fee: r.manual_shipping_fee === null || r.manual_shipping_fee === undefined ? null : Number(r.manual_shipping_fee||0),
    shipping_fee_source: r.manual_shipping_fee === null || r.manual_shipping_fee === undefined ? (r.shipping_fee_source || 'auto') : 'manual',
    tax_amount: Number(r.tax_amount||0), quantity: Number(r.quantity||1),
    order_date: r.order_date, item_title: r.item_title, item_image: r.item_image, item_sku: r.item_sku
  }));
}

async function ssSyncOrdersForUser(userId, platform=null, days=45) {
  const accounts = await ssGetAccounts(userId, platform);
  let all = [];
  for (const acc of accounts) {
    try {
      let orders=[];
      if (acc.platform === 'mercadolivre') orders = await fetchML(acc, days);
      else if (acc.platform === 'shopee') orders = await fetchShopee(acc, days);
      else if (acc.platform === 'magalu') orders = await fetchMagalu(acc, days);
      await ssUpsertOrders(userId, acc.id, orders);
      all = all.concat(orders || []);
      await db.query(`UPDATE marketplace_accounts SET last_sync_at=NOW() WHERE id=$1`, [acc.id]);
    } catch(e) { console.error('[orders sync]', acc.platform, e.response?.data || e.message); }
  }
  return all;
}

async function ssUpsertReturn(userId, acc, r) {
  const platform = normPlatform(r.platform || acc.platform);
  const externalId = String(r.external_return_id || r.id || r.claim_id || r.ticket_return_id || '').trim();
  if (!externalId) return;
  const total = ssNum2(r.return_shipping_cost)+ssNum2(r.return_fee)+ssNum2(r.refund_adjustment)+ssNum2(r.lost_product_cost);
  await db.query(`INSERT INTO marketplace_returns
    (user_id, platform, account_id, platform_order_id, external_return_id, external_ticket_id, status, reason, type,
     buyer_message, return_tracking_code, return_shipping_cost, return_fee, refund_adjustment, lost_product_cost, return_total_cost, raw_json, updated_at)
    VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,NOW())
    ON CONFLICT (user_id, platform, external_return_id) DO UPDATE SET
      account_id=EXCLUDED.account_id, platform_order_id=COALESCE(EXCLUDED.platform_order_id, marketplace_returns.platform_order_id),
      external_ticket_id=EXCLUDED.external_ticket_id, status=EXCLUDED.status, reason=EXCLUDED.reason, type=EXCLUDED.type,
      buyer_message=EXCLUDED.buyer_message, return_tracking_code=EXCLUDED.return_tracking_code,
      return_shipping_cost=GREATEST(marketplace_returns.return_shipping_cost, EXCLUDED.return_shipping_cost),
      return_fee=GREATEST(marketplace_returns.return_fee, EXCLUDED.return_fee),
      refund_adjustment=GREATEST(marketplace_returns.refund_adjustment, EXCLUDED.refund_adjustment),
      lost_product_cost=GREATEST(marketplace_returns.lost_product_cost, EXCLUDED.lost_product_cost),
      return_total_cost=GREATEST(marketplace_returns.return_total_cost, EXCLUDED.return_total_cost),
      raw_json=EXCLUDED.raw_json, updated_at=NOW()`,
    [userId, platform, acc.id || null, r.platform_order_id || null, externalId, r.external_ticket_id || null, r.status || null, r.reason || null, r.type || 'return',
     r.buyer_message || null, r.return_tracking_code || null, ssNum2(r.return_shipping_cost), ssNum2(r.return_fee), ssNum2(r.refund_adjustment), ssNum2(r.lost_product_cost), total, JSON.stringify(r.raw_json || r)]);
}

function ssMLIsRealReturnFromOrder(o) {
  const tags = Array.isArray(o?.tags) ? o.tags.map(String) : [];
  const payments = Array.isArray(o?.payments) ? o.payments : [];
  const payText = payments.map(p => `${p.status || ''} ${p.status_detail || ''}`).join(' ').toLowerCase();
  const delivered = tags.includes('delivered');
  const refunded = /(refunded|charged_back|chargeback|reimbursed|bpp_refunded|bpp_covered)/i.test(payText);
  const cancelledAfterDelivery = String(o?.status || '').toLowerCase() === 'cancelled' && delivered;
  // "not_delivered" sozinho NÃO é devolução real; aparece em pedido pago ainda não entregue.
  return (delivered && refunded) || cancelledAfterDelivery || payments.some(p => String(p.status || '').toLowerCase() === 'charged_back');
}

async function ssFetchMLReturns(acc, days = 365) {
  const headers = { Authorization: `Bearer ${acc.access_token}` };
  const out = [];

  // Primeiro usa orders/search porque o endpoint de claims costuma retornar 403 PolicyAgent nessa conta.
  try {
    const since = new Date(Date.now() - Math.min(Math.max(Number(days) || 365, 1), 365) * 86400000).toISOString();
    const limit = 50;
    for (let page = 0; page < 20; page++) {
      const offset = page * limit;
      const { data } = await axios.get('https://api.mercadolibre.com/orders/search', {
        headers,
        params: {
          seller: acc.platform_shop_id,
          sort: 'date_desc',
          'order.date_created.from': since,
          limit,
          offset
        }
      });
      const arr = Array.isArray(data.results) ? data.results : [];
      for (const o of arr) {
        if (!ssMLIsRealReturnFromOrder(o)) continue;
        const payments = Array.isArray(o.payments) ? o.payments : [];
        const reason = payments.map(p => p.status_detail || p.status).filter(Boolean).join(', ');
        out.push({
          platform:'mercadolivre',
          external_return_id:`ml-order-${o.id}`,
          platform_order_id:String(o.id || ''),
          status:o.status || 'returned',
          reason:reason || 'Pedido entregue com reembolso/chargeback',
          type:'return',
          return_shipping_cost: payments.reduce((s,p)=>s+Number(p.shipping_cost||0),0),
          raw_json:o
        });
      }
      if (!arr.length || arr.length < limit) break;
      if (data.paging?.total && offset + limit >= Number(data.paging.total)) break;
    }
  } catch(e) {
    console.error('[ML returns orders/search]', e.response?.status, e.response?.data || e.message);
  }

  if (out.length) return out;

  // Fallback: tenta claims, mas pode dar 403 dependendo das políticas do app.
  try {
    const { data } = await axios.get('https://api.mercadopago.com/post-purchase/v1/claims/search', {
      params: { type: 'return', limit: 50, sort: 'last_updated:desc' }, headers
    });
    const arr = data?.data || data?.results || [];
    return arr.map(c => ({ platform:'mercadolivre', external_return_id:String(c.id || c.claim_id), platform_order_id:String(c.resource_id || c.order_id || ''), status:c.status, reason:c.reason_id || c.reason || c.stage, type:c.type || 'return', raw_json:c }));
  } catch(e) { console.error('[ML returns claims]', e.response?.status, e.response?.data || e.message); return out; }
}

async function ssFetchMagaluReturns(acc) {
  const headers = { Authorization: `Bearer ${acc.access_token}` };
  try {
    const { data } = await axios.get('https://api.magalu.com/seller/v0/tickets', { params: { _limit: 50, _sort: 'updated_at:desc' }, headers });
    const tickets = data?.results || data?.tickets || data?.data || [];
    const out=[];
    for (const t of tickets.slice(0,50)) {
      const tid = t.id || t.uuid || t.code;
      if (!tid) continue;
      try {
        const rr = await axios.get(`https://api.magalu.com/seller/v0/tickets/${tid}/returns`, { headers });
        const returns = rr.data?.results || rr.data?.returns || rr.data?.data || [];
        for (const r of returns) out.push({ platform:'magalu', external_return_id:String(r.id || r.uuid || r.code), external_ticket_id:String(tid), platform_order_id:String(t.order?.code || t.order_id || r.order?.code || ''), status:r.status?.id || r.status || t.status, reason:r.reason?.description || r.reason || t.reason, return_tracking_code:r.tracking_code || r.tracking?.code || '', raw_json:{ticket:t, return:r} });
      } catch(e) {}
    }
    return out;
  } catch(e) { console.error('[Magalu returns]', e.response?.status, e.response?.data || e.message); return []; }
}

async function ssLoadReturns(userId, platform=null) {
  const params=[userId];
  let sql=`SELECT r.*, o.item_title, o.item_sku, o.total_amount, o.order_date
           FROM marketplace_returns r
           LEFT JOIN marketplace_orders o ON o.user_id=r.user_id AND o.platform=r.platform AND o.platform_order_id=r.platform_order_id
           WHERE r.user_id=$1`;
  if(platform){params.push(platform); sql += ` AND r.platform=$${params.length}`;}
  sql += ` ORDER BY r.updated_at DESC LIMIT 500`;
  const { rows } = await db.query(sql, params);
  return rows.map(x=>({ ...x, return_shipping_cost:Number(x.return_shipping_cost||0), return_fee:Number(x.return_fee||0), refund_adjustment:Number(x.refund_adjustment||0), lost_product_cost:Number(x.lost_product_cost||0), return_total_cost:Number(x.return_total_cost||0), total_amount:Number(x.total_amount||0) }));
}

app.get('/api/returns', auth, async (req, res) => {
  try { res.json({ success:true, data: await ssLoadReturns(req.user.id, req.query.platform || null) }); }
  catch(e){ res.status(500).json({ error:e.message }); }
});

app.post('/api/returns/:id/cost', auth, async (req, res) => {
  try {
    const id = Number(req.params.id);
    const shipping = ssNum2(req.body.return_shipping_cost);
    const fee = ssNum2(req.body.return_fee);
    const refund = ssNum2(req.body.refund_adjustment);
    const lost = ssNum2(req.body.lost_product_cost);
    const total = shipping + fee + refund + lost;
    const { rows } = await db.query(`UPDATE marketplace_returns SET return_shipping_cost=$1, return_fee=$2, refund_adjustment=$3, lost_product_cost=$4, return_total_cost=$5, updated_at=NOW() WHERE id=$6 AND user_id=$7 RETURNING *`, [shipping, fee, refund, lost, total, id, req.user.id]);
    if(!rows.length) return res.status(404).json({ error:'Devolução não encontrada' });
    res.json({ success:true, data:rows[0] });
  } catch(e){ res.status(500).json({ error:e.message }); }
});

app.post('/api/returns/sync/:platform', auth, async (req, res) => {
  try {
    const platform = String(req.params.platform || '').toLowerCase();
    const accounts = await ssGetAccounts(req.user.id, platform);
    let count=0;
    for (const acc of accounts) {
      const list = platform === 'mercadolivre' ? await ssFetchMLReturns(acc) : platform === 'magalu' ? await ssFetchMagaluReturns(acc) : [];
      for (const r of list) { await ssUpsertReturn(req.user.id, acc, r); count++; }
    }
    res.json({ success:true, synced:count, data: await ssLoadReturns(req.user.id, platform) });
  } catch(e){ res.status(500).json({ error:e.message }); }
});

// ── FRETE MANUAL POR PEDIDO ──
app.put('/api/orders/:platform/:orderId/shipping', auth, async (req, res) => {
  const platform = normPlatform(req.params.platform);
  const orderId = String(req.params.orderId || '').trim();
  const raw = req.body?.shipping_fee;
  const manual = raw === '' || raw === null || raw === undefined ? null : Number(raw);
  if (!platform || !orderId) return res.status(400).json({ error: 'Pedido inválido' });
  if (manual !== null && (!Number.isFinite(manual) || manual < 0)) return res.status(400).json({ error: 'Frete inválido' });

  try {
    const { rowCount } = await db.query(
      `UPDATE marketplace_orders
       SET manual_shipping_fee=$1, updated_at=NOW()
       WHERE user_id=$2 AND platform=$3 AND platform_order_id=$4`,
      [manual, req.user.id, platform, orderId]
    );
    if (!rowCount) return res.status(404).json({ error: 'Pedido não encontrado' });
    res.json({ success: true, manual_shipping_fee: manual });
  } catch(e) {
    res.status(500).json({ error: e.message });
  }
});

// ── API PEDIDOS ──
app.get('/api/orders', auth, async (req, res) => {
  const { period = '7', platform, date_from, date_to, fresh } = req.query;
  try {
    let orders = [];
    if (String(fresh || '') !== '1') {
      orders = await ssLoadOrdersFromSql(req.user.id, { period, platform, date_from, date_to });
    }
    // Primeiro acesso ou botão de atualizar: busca API, salva no SQL e depois usa o SQL.
    if (!orders.length || String(fresh || '') === '1') {
      const days = date_from && date_to ? 45 : Math.min(Math.max(parseInt(period) || 7, 1), 45);
      await ssSyncOrdersForUser(req.user.id, platform || null, days);
      orders = await ssLoadOrdersFromSql(req.user.id, { period, platform, date_from, date_to });
    }
    const enriched = await enrichWithCosts(orders, req.user.id);
    enriched.sort((a, b) => new Date(b.order_date) - new Date(a.order_date));
    res.json({ success: true, from_sql: true, data: enriched, total: enriched.length });
  } catch(e) { res.status(500).json({ error: e.message }); }
});

// ── SYNC ──
app.get('/api/sync/:platform', auth, async (req, res) => {
  try {
    Object.keys(CACHE).forEach(k => { if (k.startsWith(`${req.user.id}_${req.params.platform}`)) delete CACHE[k]; });
    const platform = req.params.platform === 'all' ? null : req.params.platform;
    const orders = await ssSyncOrdersForUser(req.user.id, platform, 45);
    res.json({ success: true, stored: orders.length });
  } catch(e) { res.status(500).json({ error: e.message }); }
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
// ── DEBUG ML CLAIMS / DEVOLUÇÕES RAW ──
app.get('/debug/ml-claims-raw', auth, async (req, res) => {
  try {
    const { rows } = await db.query(
      `SELECT *
       FROM marketplace_accounts
       WHERE user_id=$1
         AND platform='mercadolivre'
         AND is_active=true
         AND access_token IS NOT NULL
       LIMIT 1`,
      [req.user.id]
    );

    if (!rows.length) {
      return res.status(404).json({
        success: false,
        error: 'Conta Mercado Livre não conectada'
      });
    }

    const acc = rows[0];
    const token = acc.access_token;
    const days = Number(req.query.days || 365);
    const since = new Date(Date.now() - days * 86400000).toISOString();

    const headers = {
      Authorization: `Bearer ${token}`
    };

    const attempts = [];

    async function tryCall(name, url, params) {
      try {
        const r = await axios.get(url, { headers, params });

        attempts.push({
          name,
          ok: true,
          status: r.status,
          params,
          total:
            r.data?.paging?.total ??
            r.data?.total ??
            r.data?.claims?.length ??
            r.data?.data?.length ??
            r.data?.results?.length ??
            null,
          data: r.data
        });
      } catch (e) {
        attempts.push({
          name,
          ok: false,
          status: e.response?.status || null,
          params,
          error: e.response?.data || e.message
        });
      }
    }

    await tryCall(
      '1 - Claims com seller_id + data',
      'https://api.mercadopago.com/post-purchase/v1/claims/search',
      {
        seller_id: acc.platform_shop_id,
        limit: 50,
        offset: 0,
        'claim.date_created.from': since
      }
    );

    await tryCall(
      '2 - Claims com seller_id sem data',
      'https://api.mercadopago.com/post-purchase/v1/claims/search',
      {
        seller_id: acc.platform_shop_id,
        limit: 50,
        offset: 0
      }
    );

    await tryCall(
      '3 - Claims sem seller_id',
      'https://api.mercadopago.com/post-purchase/v1/claims/search',
      {
        limit: 50,
        offset: 0
      }
    );

    await tryCall(
      '4 - Claims type return',
      'https://api.mercadopago.com/post-purchase/v1/claims/search',
      {
        seller_id: acc.platform_shop_id,
        type: 'return',
        limit: 50,
        offset: 0
      }
    );

    await tryCall(
      '5 - Claims stage claim',
      'https://api.mercadopago.com/post-purchase/v1/claims/search',
      {
        seller_id: acc.platform_shop_id,
        stage: 'claim',
        limit: 50,
        offset: 0
      }
    );

    await tryCall(
      '6 - Claims stage dispute',
      'https://api.mercadopago.com/post-purchase/v1/claims/search',
      {
        seller_id: acc.platform_shop_id,
        stage: 'dispute',
        limit: 50,
        offset: 0
      }
    );

    res.json({
      success: true,
      account: {
        id: acc.id,
        shop_name: acc.shop_name,
        seller_id: acc.platform_shop_id
      },
      days,
      since,
      attempts
    });

  } catch (e) {
    res.status(500).json({
      success: false,
      error: e.message,
      stack: e.stack
    });
  }
});


app.get('/debug/ml-orders-returns-signals', auth, async (req, res) => {
  try {
    const { rows } = await db.query(
      `SELECT *
       FROM marketplace_accounts
       WHERE user_id=$1
         AND platform='mercadolivre'
         AND is_active=true
         AND access_token IS NOT NULL
       LIMIT 1`,
      [req.user.id]
    );

    if (!rows.length) return res.status(404).json({ success:false, error:'ML não conectado' });

    const acc = rows[0];
    const headers = { Authorization: `Bearer ${acc.access_token}` };

    const { data } = await axios.get('https://api.mercadolibre.com/orders/search', {
      headers,
      params: {
        seller: acc.platform_shop_id,
        sort: 'date_desc',
        limit: 50
      }
    });

    const orders = data.results || [];

    const mapped = orders.map(o => ({
      id: o.id,
      status: o.status,
      tags: o.tags,
      feedback: o.feedback,
      fulfilled: o.fulfilled,
      order_request: o.order_request,
      mediations: o.mediations,
      pack_id: o.pack_id,
      shipping_id: o.shipping?.id,
      payments: (o.payments || []).map(p => ({
        id: p.id,
        status: p.status,
        status_detail: p.status_detail,
        transaction_amount: p.transaction_amount,
        total_paid_amount: p.total_paid_amount,
        shipping_cost: p.shipping_cost,
        coupon_amount: p.coupon_amount,
        date_approved: p.date_approved,
        date_last_modified: p.date_last_modified
      }))
    }));

    res.json({
      success: true,
      total: mapped.length,
      data: mapped
    });

  } catch (e) {
    res.status(500).json({
      success:false,
      status:e.response?.status,
      error:e.response?.data || e.message
    });
  }
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
  const firstItem = d.items?.[0] || d.products?.[0] || d.order?.items?.[0] || {};
  const firstInfo = firstItem.info || firstItem.product || firstItem || {};
  const skuDanfe = firstInfo.sku || firstInfo.seller_sku || firstInfo.sellerSku || firstInfo.id || d.sku || d.product_sku || '';

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
  doc.font('Helvetica-Bold').text('SKU:', rightX + 8, yy).font('Helvetica').text(skuDanfe || '—', rightX + 68, yy); yy += 20;
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
  const firstItem = d.items?.[0] || d.products?.[0] || d.order?.items?.[0] || {};
  const firstInfo = firstItem.info || firstItem.product || firstItem || {};
  const sku = firstInfo.sku || firstInfo.seller_sku || firstInfo.sellerSku || firstInfo.id || d.sku || d.product_sku || '';
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
    sku,
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
  kv('SKU:', info.sku || '—');
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

// ─────────────────────────────────────────────────────────────
// SalesSync v17 — possíveis impressões + metas + analytics
// ─────────────────────────────────────────────────────────────
function ssNum(v) {
  const n = Number(v || 0);
  return Number.isFinite(n) ? n : 0;
}
function ssMoneyNum(v) { return Math.round(ssNum(v) * 100) / 100; }
function ssFirstMonth(d = new Date()) { return new Date(d.getFullYear(), d.getMonth(), 1); }
function ssDaysInMonth(d = new Date()) { return new Date(d.getFullYear(), d.getMonth() + 1, 0).getDate(); }
function ssElapsedDays(d = new Date()) { return Math.max(1, d.getDate()); }
function ssOrderAmount(o) { return ssNum(o.total_amount ?? o.paid_amount ?? o.amount ?? o.total ?? 0); }
function ssOrderProfit(o) { return ssNum(o.profit ?? o.net_profit ?? o.lucro ?? 0); }
function ssOrderProduct(o) { return String(o.item_title || o.product_name || o.name || o.item_sku || 'Produto sem nome'); }
function ssDateOnlyBR(v) { try { return new Date(v).toLocaleDateString('pt-BR'); } catch { return ''; } }



async function ssGetAdditionalRevenues(userId, monthDate = new Date()) {
  const monthStart = ssFirstMonth(monthDate).toISOString().slice(0, 10);
  const { rows } = await db.query(
    `SELECT id, name, amount, recurring, starts_at, created_at, updated_at
     FROM additional_revenues
     WHERE user_id=$1
       AND is_active=true
       AND (
         recurring=true
         OR DATE_TRUNC('month', starts_at)::date = DATE_TRUNC('month', $2::date)::date
       )
     ORDER BY created_at DESC, id DESC`,
    [userId, monthStart]
  );
  return (rows || []).map(r => ({
    ...r,
    amount: ssMoneyNum(r.amount),
    recurring: !!r.recurring
  }));
}
function ssAdditionalRevenueTotal(items = []) {
  return ssMoneyNum((items || []).reduce((s, r) => s + ssNum(r.amount), 0));
}

function ssNormalizeAnalyticsResponse(summary, monthlyRows = [], platformRows = []) {
  const cm = summary || {};

  const monthMap = {};
  for (const r of monthlyRows || []) {
    const rawMonth = r.snapshot_month;
    const key = rawMonth instanceof Date
      ? rawMonth.toISOString().slice(0, 10)
      : String(rawMonth).slice(0, 10);

    monthMap[key] = {
      month: key,
      label: new Date(key + 'T00:00:00Z').toLocaleDateString('pt-BR', { month:'short', year:'2-digit', timeZone:'UTC' }),
      gross_sales: Number(r.gross_sales || 0),
      net_profit: Number(r.net_profit || 0),
      orders_count: Number(r.orders_count || 0),
      magalu: 0,
      mercadolivre: 0,
      platforms: []
    };
  }

  for (const r of platformRows || []) {
    const rawMonth = r.snapshot_month || r.month;
    const key = rawMonth instanceof Date
      ? rawMonth.toISOString().slice(0, 10)
      : String(rawMonth).slice(0, 10);

    if (!monthMap[key]) {
      monthMap[key] = {
        month: key,
        label: new Date(key + 'T00:00:00Z').toLocaleDateString('pt-BR', { month:'short', year:'2-digit', timeZone:'UTC' }),
        gross_sales: 0,
        net_profit: 0,
        orders_count: 0,
        magalu: 0,
        mercadolivre: 0,
        platforms: []
      };
    }

    const platform = String(r.platform || '').toLowerCase();
    const value = Number(r.gross_sales || 0);
    const orders = Number(r.orders_count || 0);
    monthMap[key][platform] = value;
    monthMap[key].platforms.push({
      platform,
      label: platform === 'magalu' ? 'Magalu' : platform === 'mercadolivre' ? 'Mercado Livre' : platform,
      gross_sales: value,
      orders_count: orders,
      percentage: 0
    });

    // Se monthly_snapshots ainda não tiver esse mês, soma total pelas plataformas.
    if (!monthMap[key].gross_sales) monthMap[key].gross_sales = 0;
  }

  const monthlyRevenue = Object.values(monthMap)
    .sort((a,b) => String(a.month).localeCompare(String(b.month)))
    .map(m => {
      const platformTotal = (m.platforms || []).reduce((s,p) => s + Number(p.gross_sales || 0), 0);
      if (platformTotal > 0) m.gross_sales = platformTotal;
      if ((m.platforms || []).length) m.orders_count = (m.platforms || []).reduce((s,p) => s + Number(p.orders_count || 0), 0);
      m.platforms = (m.platforms || []).map(p => ({
        ...p,
        percentage: m.gross_sales > 0 ? Math.round((p.gross_sales / m.gross_sales) * 10000) / 100 : 0
      }));
      m.tooltip = {
        total: m.gross_sales,
        magalu: m.magalu || 0,
        mercadolivre: m.mercadolivre || 0,
        magalu_pct: m.gross_sales > 0 ? Math.round(((m.magalu || 0) / m.gross_sales) * 10000) / 100 : 0,
        mercadolivre_pct: m.gross_sales > 0 ? Math.round(((m.mercadolivre || 0) / m.gross_sales) * 10000) / 100 : 0
      };
      return m;
    });

  return {
    success: true,
    data: {
      ...cm,
      monthly_revenue: monthlyRevenue,
      monthly_platform_chart: monthlyRevenue
    },
    current_month: {
      gross_sales: ssMoneyNum(cm.gross_sales),
      gross_sales_orders: ssMoneyNum(cm.gross_sales_orders),
      additional_revenue_total: ssMoneyNum(cm.additional_revenue_total),
      additional_revenues: Array.isArray(cm.additional_revenues) ? cm.additional_revenues : [],
      net_profit: ssMoneyNum(cm.net_profit),
      orders_count: Number(cm.orders_count || 0),
      avg_ticket: ssMoneyNum(cm.avg_ticket),
      best_seller_product: cm.best_seller_product || null,
      most_profitable_product: cm.most_profitable_product || null,
      projected_revenue: ssMoneyNum(cm.projected_revenue),
      revenue_goal_enabled: !!cm.revenue_goal_enabled,
      monthly_revenue_goal: ssMoneyNum(cm.monthly_revenue_goal),
      missing_to_goal: ssMoneyNum(cm.missing_to_goal ?? cm.remaining_to_goal),
      remaining_to_goal: ssMoneyNum(cm.missing_to_goal ?? cm.remaining_to_goal),
      goal_progress_pct: Number(cm.goal_progress_pct || 0),
      will_hit_goal: !!cm.will_hit_goal,
      cancelled_count: Number(cm.cancelled_count || 0)
    },
    monthly_revenue: monthlyRevenue,
    monthly_platform_chart: monthlyRevenue
  };
}

async function ssGetAccounts(userId, platform = null) {
  const params = [userId];
  let sql = `SELECT * FROM marketplace_accounts WHERE user_id=$1 AND is_active=true AND access_token IS NOT NULL`;
  if (platform) { sql += ` AND platform=$2`; params.push(platform); }
  const { rows } = await db.query(sql, params);
  return rows || [];
}

async function ssFetchOrdersInternal(userId, opts = {}) {
  let allOrders = await ssLoadOrdersFromSql(userId, { period: opts.days || 30, platform: opts.platform || null, date_from: opts.date_from, date_to: opts.date_to });
  if (!allOrders.length) {
    await ssSyncOrdersForUser(userId, opts.platform || null, opts.days || 45);
    allOrders = await ssLoadOrdersFromSql(userId, { period: opts.days || 30, platform: opts.platform || null, date_from: opts.date_from, date_to: opts.date_to });
  }
  return await enrichWithCosts(allOrders, userId);
}

function ssSummarizeOrders(orders, goal = null, additionalRevenue = 0, additionalItems = []) {
  const paid = (orders || []).filter(o => String(o.status || '').toLowerCase() !== 'cancelled');
  const grossOrders = paid.reduce((s,o)=>s + ssOrderAmount(o), 0);
  const gross = grossOrders + ssNum(additionalRevenue);
  const profit = paid.reduce((s,o)=>s + ssOrderProfit(o), 0);
  const qty = paid.length;
  const avg = qty ? grossOrders / qty : 0;
  const byQty = {};
  const byProfit = {};
  for (const o of paid) {
    const name = ssOrderProduct(o);
    byQty[name] = (byQty[name] || 0) + ssNum(o.quantity || 1);
    byProfit[name] = (byProfit[name] || 0) + ssOrderProfit(o);
  }
  const bestSeller = Object.entries(byQty).sort((a,b)=>b[1]-a[1])[0]?.[0] || null;
  const mostProfit = Object.entries(byProfit).sort((a,b)=>b[1]-a[1])[0]?.[0] || null;
  const today = new Date();
  const projectedRevenue = gross / ssElapsedDays(today) * ssDaysInMonth(today);
  const goalEnabled = Boolean(goal?.revenue_goal_enabled);
  const goalValue = ssNum(goal?.monthly_revenue_goal);
  const progress = goalEnabled && goalValue > 0 ? Math.min(999, gross / goalValue * 100) : 0;
  return {
    gross_sales: ssMoneyNum(gross),
    gross_sales_orders: ssMoneyNum(grossOrders),
    additional_revenue_total: ssMoneyNum(additionalRevenue),
    additional_revenues: additionalItems || [],
    net_profit: ssMoneyNum(profit),
    orders_count: qty,
    avg_ticket: ssMoneyNum(avg),
    best_seller_product: bestSeller,
    most_profitable_product: mostProfit,
    projected_revenue: ssMoneyNum(projectedRevenue),
    revenue_goal_enabled: goalEnabled,
    monthly_revenue_goal: ssMoneyNum(goalValue),
    missing_to_goal: ssMoneyNum(Math.max(0, goalValue - gross)),
    goal_progress_pct: Math.round(progress * 10) / 10,
    will_hit_goal: goalEnabled && goalValue > 0 ? projectedRevenue >= goalValue : false,
    cancelled_count: (orders || []).filter(o => String(o.status || '').toLowerCase() === 'cancelled').length
  };
}

async function ssGetGoal(userId) {
  const { rows } = await db.query(
    `SELECT revenue_goal_enabled, monthly_revenue_goal, updated_at FROM user_goals WHERE user_id=$1 LIMIT 1`,
    [userId]
  );
  return rows[0] || { revenue_goal_enabled: false, monthly_revenue_goal: 0, updated_at: null };
}

app.get('/api/user-goals', auth, async (req, res) => {
  try { res.json({ success: true, data: await ssGetGoal(req.user.id) }); }
  catch (e) { res.status(500).json({ error: e.message }); }
});

app.post('/api/user-goals', auth, async (req, res) => {
  try {
    const enabled = Boolean(req.body.revenue_goal_enabled);
    const goal = Math.max(0, Number(req.body.monthly_revenue_goal || 0));
    const { rows } = await db.query(
      `INSERT INTO user_goals (user_id, revenue_goal_enabled, monthly_revenue_goal, updated_at)
       VALUES ($1,$2,$3,NOW())
       ON CONFLICT (user_id) DO UPDATE SET
         revenue_goal_enabled=EXCLUDED.revenue_goal_enabled,
         monthly_revenue_goal=EXCLUDED.monthly_revenue_goal,
         updated_at=NOW()
       RETURNING revenue_goal_enabled, monthly_revenue_goal, updated_at`,
      [req.user.id, enabled, goal]
    );
    res.json({ success: true, data: rows[0] });
  } catch (e) { res.status(500).json({ error: e.message }); }
});


app.get('/api/additional-revenues', auth, async (req, res) => {
  try {
    const month = req.query.month ? new Date(String(req.query.month) + '-01T00:00:00-03:00') : new Date();
    const items = await ssGetAdditionalRevenues(req.user.id, Number.isFinite(month.getTime()) ? month : new Date());
    res.json({ success: true, total: ssAdditionalRevenueTotal(items), data: items });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.post('/api/additional-revenues', auth, async (req, res) => {
  try {
    const name = String(req.body.name || '').trim();
    const amount = Math.max(0, Number(String(req.body.amount || 0).replace(',', '.')) || 0);
    const recurring = Boolean(req.body.recurring);
    const startsAt = req.body.starts_at ? String(req.body.starts_at).slice(0, 10) : ssFirstMonth(new Date()).toISOString().slice(0, 10);
    if (!name) return res.status(400).json({ error: 'Nome do rendimento é obrigatório' });
    if (amount <= 0) return res.status(400).json({ error: 'Valor precisa ser maior que zero' });
    const { rows } = await db.query(
      `INSERT INTO additional_revenues (user_id, name, amount, recurring, starts_at, is_active, created_at, updated_at)
       VALUES ($1,$2,$3,$4,$5,true,NOW(),NOW())
       RETURNING id, name, amount, recurring, starts_at, created_at, updated_at`,
      [req.user.id, name, amount, recurring, startsAt]
    );
    Object.keys(CACHE).forEach(k => { if (k.startsWith(req.user.id)) delete CACHE[k]; });
    res.json({ success: true, data: rows[0] });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.delete('/api/additional-revenues/:id', auth, async (req, res) => {
  try {
    const id = Number(req.params.id);
    if (!Number.isFinite(id)) return res.status(400).json({ error: 'ID inválido' });
    const { rowCount } = await db.query(
      `UPDATE additional_revenues SET is_active=false, updated_at=NOW() WHERE id=$1 AND user_id=$2`,
      [id, req.user.id]
    );
    Object.keys(CACHE).forEach(k => { if (k.startsWith(req.user.id)) delete CACHE[k]; });
    res.json({ success: true, deleted: rowCount });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.get('/api/analytics/summary', auth, async (req, res) => {
  try {
    const now = new Date();
    const from = ssFirstMonth(now).toISOString().slice(0,10);
    const to = now.toISOString().slice(0,10);

    const orders = await ssFetchOrdersInternal(req.user.id, { days: 45, date_from: from, date_to: to });
    const goal = await ssGetGoal(req.user.id);
    const additionalRevenues = await ssGetAdditionalRevenues(req.user.id, now);
    const summary = ssSummarizeOrders(orders, goal, ssAdditionalRevenueTotal(additionalRevenues), additionalRevenues);

    // Mantém snapshot do mês atual atualizado sem depender do botão do frontend.
    try {
      const month = ssFirstMonth(now).toISOString().slice(0,10);
      await db.query(
        `INSERT INTO monthly_snapshots
         (user_id, snapshot_month, gross_sales, net_profit, orders_count, avg_ticket, best_seller_product, most_profitable_product, created_at)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,NOW())
         ON CONFLICT (user_id, snapshot_month) DO UPDATE SET
           gross_sales=EXCLUDED.gross_sales,
           net_profit=EXCLUDED.net_profit,
           orders_count=EXCLUDED.orders_count,
           avg_ticket=EXCLUDED.avg_ticket,
           best_seller_product=EXCLUDED.best_seller_product,
           most_profitable_product=EXCLUDED.most_profitable_product,
           created_at=NOW()`,
        [req.user.id, month, summary.gross_sales, summary.net_profit, summary.orders_count, summary.avg_ticket, summary.best_seller_product, summary.most_profitable_product]
      );
    } catch(e) { console.error('[analytics snapshot inline]', e.message); }

    const { rows: monthlyRows } = await db.query(
      `SELECT snapshot_month, gross_sales, net_profit, orders_count, avg_ticket, best_seller_product, most_profitable_product
       FROM monthly_snapshots
       WHERE user_id=$1
         AND snapshot_month >= (DATE_TRUNC('month', NOW()) - INTERVAL '11 months')::date
       ORDER BY snapshot_month ASC`,
      [req.user.id]
    );

    const { rows: platformRows } = await db.query(
      `SELECT snapshot_month, platform, gross_sales, orders_count
       FROM platform_monthly_snapshots
       WHERE user_id=$1
         AND snapshot_month >= (DATE_TRUNC('month', NOW()) - INTERVAL '11 months')::date
       ORDER BY snapshot_month ASC, platform ASC`,
      [req.user.id]
    );

    res.json(ssNormalizeAnalyticsResponse(summary, monthlyRows, platformRows));
  } catch (e) {
    console.error('[analytics summary]', e);
    res.status(500).json({ error: e.message });
  }
});

app.post('/api/analytics/monthly-snapshot', auth, async (req, res) => {
  try {
    const now = new Date();
    const month = ssFirstMonth(now).toISOString().slice(0,10);
    const orders = await ssFetchOrdersInternal(req.user.id, { days: 45, date_from: month, date_to: now.toISOString().slice(0,10) });
    const additionalRevenues = await ssGetAdditionalRevenues(req.user.id, now);
    const d = ssSummarizeOrders(orders, await ssGetGoal(req.user.id), ssAdditionalRevenueTotal(additionalRevenues), additionalRevenues);
    const { rows } = await db.query(
      `INSERT INTO monthly_snapshots
       (user_id, snapshot_month, gross_sales, net_profit, orders_count, avg_ticket, best_seller_product, most_profitable_product, created_at)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,NOW())
       ON CONFLICT (user_id, snapshot_month) DO UPDATE SET
         gross_sales=EXCLUDED.gross_sales,
         net_profit=EXCLUDED.net_profit,
         orders_count=EXCLUDED.orders_count,
         avg_ticket=EXCLUDED.avg_ticket,
         best_seller_product=EXCLUDED.best_seller_product,
         most_profitable_product=EXCLUDED.most_profitable_product,
         created_at=NOW()
       RETURNING *`,
      [req.user.id, month, d.gross_sales, d.net_profit, d.orders_count, d.avg_ticket, d.best_seller_product, d.most_profitable_product]
    );
    await db.query(`DELETE FROM monthly_snapshots WHERE user_id=$1 AND snapshot_month < (DATE_TRUNC('month', NOW()) - INTERVAL '12 months')`, [req.user.id]);
    res.json({ success: true, data: rows[0] });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

function ssLookbackDaysForPrint() { return new Date().getDay() === 1 ? 4 : 3; }
function ssDeliveryPrintable(d) {
  const status = String(d?.status || '').toLowerCase();
  const provider = d?.shipping?.provider?.extras || {};
  const inv = Array.isArray(d?.invoices) ? d.invoices[0] : null;
  const invStatus = String(inv?.status?.id || inv?.status || '').toLowerCase();
  const blocked = ['shipped','delivered','cancelled','canceled','finished','closed','dispatched','posted','sent'];
  return !blocked.includes(status)
    && ['invoiced','approved','ready_to_ship','ready','processing'].includes(status)
    && provider.is_mle === true
    && provider.is_fulfillment !== true
    && invStatus === 'approved';
}


async function ssGetMLTokenForUser(userId) {
  const { rows } = await db.query(
    `SELECT * FROM marketplace_accounts
     WHERE user_id=$1 AND platform='mercadolivre' AND is_active=true AND access_token IS NOT NULL
     LIMIT 1`,
    [userId]
  );
  if (!rows.length) return null;
  const acc = rows[0];
  let token = acc.access_token;
  if (acc.token_expires_at && new Date(acc.token_expires_at) <= new Date(Date.now() + 5*60*1000)) {
    const newToken = await refreshMLToken(acc);
    if (newToken) token = newToken;
  }
  return { acc, token };
}

async function ssDownloadMLLabels(userId, shipmentIds = []) {
  const clean = [...new Set((shipmentIds || []).map(x => String(x || '').trim()).filter(Boolean))];
  if (!clean.length) throw new Error('Nenhum envio ML selecionado');
  const authData = await ssGetMLTokenForUser(userId);
  if (!authData) {
    const err = new Error('Mercado Livre não conectado');
    err.status = 404;
    throw err;
  }
  const { token } = authData;
  const { data } = await axios.get('https://api.mercadolibre.com/shipment_labels', {
    params: { shipment_ids: clean.join(','), response_type: 'pdf' },
    headers: { Authorization: `Bearer ${token}` },
    responseType: 'arraybuffer'
  });
  return Buffer.from(data);
}

app.get('/api/ml/labels', auth, async (req, res) => {
  try {
    const ids = String(req.query.shipment_ids || req.query.ids || '').split(',');
    const pdf = await ssDownloadMLLabels(req.user.id, ids);
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `inline; filename="etiquetas-ml.pdf"`);
    res.send(pdf);
  } catch(e) {
    res.status(e.status || e.response?.status || 500).json({ error: e.response?.data || e.message });
  }
});

app.post('/api/ml/generate-labels', auth, async (req, res) => {
  try {
    const ids = req.body?.shipment_ids || req.body?.ids || [];
    const pdf = await ssDownloadMLLabels(req.user.id, ids);
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `inline; filename="etiquetas-ml.pdf"`);
    res.send(pdf);
  } catch(e) {
    res.status(e.status || e.response?.status || 500).json({ error: e.response?.data || e.message });
  }
});

app.get('/api/printable-labels', auth, async (req, res) => {
  try {
    const days = Math.min(Math.max(parseInt(req.query.days || ssLookbackDaysForPrint()) || 3, 1), 7);
    const data = [];

    // Magalu: reaproveita a regra de entrega imprimível, mas limita e não trava a tela.
    try {
      const accs = await ssGetAccounts(req.user.id, 'magalu');
      const acc = accs[0];
      if (acc) {
        const orders = await fetchMagalu(acc, days);
        const ids = [...new Set((orders || []).map(o => o.magalu_delivery_id || o.delivery_id).filter(Boolean))].slice(0, 60);
        await ssMapLimit(ids, 6, async id => {
          try {
            const probe = await inspectMagaluDelivery(acc, id);
            const d = probe?.[0]?.data || null;
            if (!d || !ssDeliveryPrintable(d)) return;
            const rec = d.shipping?.recipient || {};
            const addr = rec.address || {};
            const inv = d.invoices?.[0] || {};
            const firstItem = d.items?.[0] || d.products?.[0] || d.order?.items?.[0] || {};
            const firstInfo = firstItem.info || firstItem.product || firstItem || {};
            data.push({
              platform:'magalu',
              id:String(d.id),
              delivery_id:d.id,
              delivery_code:d.code,
              order_code:d.order?.code || d.code,
              status:d.status,
              customer_name:rec.name || '',
              customer_city:addr.city || '',
              customer_state:addr.state || '',
              invoice_key:inv.key || '',
              invoice_status:inv.status?.id || inv.status || '',
              sku:firstInfo.sku || firstInfo.seller_sku || '',
              deadline:d.shipping?.deadline?.limit_date || null
            });
          } catch(e) { console.error('[printable magalu]', id, e.message); }
        });
      }
    } catch(e) { console.error('[printable magalu block]', e.message); }

    // Mercado Livre: usa pedidos já sincronizados para ser rápido.
    try {
      let mlOrders = await ssLoadOrdersFromSql(req.user.id, { period: days, platform: 'mercadolivre' });
      if (!mlOrders.length) {
        await ssSyncOrdersForUser(req.user.id, 'mercadolivre', days);
        mlOrders = await ssLoadOrdersFromSql(req.user.id, { period: days, platform: 'mercadolivre' });
      }
      for (const o of mlOrders) {
        const sid = o.ml_shipping_id || o.shipping_id || o.ml_shipping?.id;
        const st = String(o.ml_shipping_status || o.status || '').toLowerCase();
        const tags = Array.isArray(o.tags) ? o.tags : [];
        if (!sid) continue;
        if (String(o.status || '').toLowerCase() === 'cancelled') continue;
        if (tags.includes('not_paid')) continue;
        if (['delivered','cancelled','canceled'].includes(st)) continue;
        data.push({
          platform:'mercadolivre',
          id:String(sid),
          shipment_id:String(sid),
          order_code:o.platform_order_id || o.id,
          status:o.ml_shipping_status_label || o.ml_shipping_status || o.status,
          customer_name:o.buyer_name || '',
          customer_city:o.ml_receiver_city || '',
          customer_state:o.ml_receiver_state || '',
          sku:o.item_sku || '',
          product:o.item_title || '',
          logistic_type:o.ml_logistic_type || o.fulfillment_type || ''
        });
      }
    } catch(e) { console.error('[printable ml block]', e.message); }

    data.sort((a,b) => String(a.platform).localeCompare(String(b.platform)) || String(a.order_code || '').localeCompare(String(b.order_code || '')));
    res.json({ success:true, days, count:data.length, data });
  } catch(e) {
    res.status(500).json({ error:e.message });
  }
});

app.get('/api/magalu/printable-deliveries', auth, async (req, res) => {
  try {
    const accs = await ssGetAccounts(req.user.id, 'magalu');
    const acc = accs[0];
    if (!acc) return res.json({ success: true, data: [] });
    const days = Math.min(Math.max(parseInt(req.query.days || ssLookbackDaysForPrint()) || 3, 1), 7);
    const orders = await fetchMagalu(acc, days);
    const ids = [...new Set((orders || []).map(o => o.magalu_delivery_id || o.delivery_id).filter(Boolean))].slice(0, 60);
    const out = [];
    for (const id of ids) {
      try {
        const probe = await inspectMagaluDelivery(acc, id);
        const d = probe?.[0]?.data || null;
        if (!d || !ssDeliveryPrintable(d)) continue;
        const rec = d.shipping?.recipient || {};
        const addr = rec.address || {};
        const inv = d.invoices?.[0] || {};
        out.push({
          delivery_id: d.id,
          delivery_code: d.code,
          order_code: d.order?.code || d.code,
          status: d.status,
          customer_name: rec.name || '',
          customer_city: addr.city || '',
          customer_state: addr.state || '',
          invoice_key: inv.key || '',
          invoice_status: inv.status?.id || inv.status || '',
          issued_at: inv.issued_at || d.invoiced_at || d.approved_at,
          deadline: d.shipping?.deadline?.limit_date || null
        });
      } catch (e) { console.error('[printable delivery]', id, e.message); }
    }
    res.json({ success: true, days, count: out.length, data: out });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// Alias usado pelo popup novo; redireciona para o gerador Zebra completo existente.
app.get('/api/magalu/labels/combo-zebra', auth, async (req, res) => {
  const qs = new URLSearchParams(req.query).toString();
  return res.redirect(302, '/api/magalu/labels/zebra-completo?' + qs);
});



// ── DEBUG ML: pedido + shipment + costs via backend (evita CORS no navegador) ──
app.get('/api/debug/ml-order/:id', auth, async (req, res) => {
  try {
    const orderId = String(req.params.id || '').trim();
    if (!orderId) return res.status(400).json({ error: 'ID do pedido obrigatório' });

    const { rows } = await db.query(
      `SELECT * FROM marketplace_accounts
       WHERE user_id=$1 AND platform='mercadolivre' AND is_active=true AND access_token IS NOT NULL
       LIMIT 1`,
      [req.user.id]
    );
    if (!rows.length) return res.status(404).json({ error: 'Conta Mercado Livre não conectada' });

    const acc = rows[0];
    const token = acc.access_token;
    const headers = { Authorization: `Bearer ${token}` };

    const { data: order } = await axios.get(`https://api.mercadolibre.com/orders/${orderId}`, { headers });
    const shipmentId = order?.shipping?.id || order?.shipping?.shipment_id || null;

    let shipment = null;
    let costs = null;

    if (shipmentId) {
      try {
        const r1 = await axios.get(`https://api.mercadolibre.com/shipments/${shipmentId}`, { headers });
        shipment = r1.data;
      } catch (e) {
        shipment = { error: e.response?.data || e.message, status: e.response?.status || null };
      }

      try {
        const r2 = await axios.get(`https://api.mercadolibre.com/shipments/${shipmentId}/costs`, { headers });
        costs = r2.data;
      } catch (e) {
        costs = { error: e.response?.data || e.message, status: e.response?.status || null };
      }
    }

    const totalAmount = Number(order?.total_amount || 0);
    const paidAmount = Number(order?.paid_amount || order?.payments?.[0]?.total_paid_amount || 0);
    const shipping = resolveMLShippingFee({ order, shipment, shipmentCosts: costs, totalAmount, paidAmount });

    res.json({
      success: true,
      account: { shop_name: acc.shop_name, seller_id: acc.platform_shop_id },
      order,
      shipment,
      costs,
      resumo: {
        order_id: orderId,
        shipping_id: shipmentId,
        order_total: totalAmount,
        paid_amount: paidAmount,
        frete_escolhido: shipping.value,
        fonte_frete: shipping.source,
        sender_cost: shipping.sender_cost,
        shipment_costs_fee: shipping.costs_endpoint_fee,
        payment_shipping_fee: shipping.payment_shipping_fee,
        order_shipping_fee: shipping.order_shipping_fee,
        shipment_shipping_fee: shipping.shipment_cost,
        paid_minus_total: shipping.paid_diff,
        senders: costs?.senders || null,
        receivers: costs?.receivers || null,
        marketplace: costs?.marketplace || null
      }
    });
  } catch (e) {
    res.status(500).json({ success:false, error: e.response?.data || e.message });
  }
});

// ── DEBUG DEVOLUÇÕES: consulta mês passado no ML e retorna se achou sinal de devolução ──
app.get('/api/debug/returns-last-month', auth, async (req, res) => {
  try {
    const { rows } = await db.query(
      `SELECT * FROM marketplace_accounts
       WHERE user_id=$1 AND platform='mercadolivre' AND is_active=true AND access_token IS NOT NULL
       LIMIT 1`,
      [req.user.id]
    );
    if (!rows.length) return res.status(404).json({ success:false, error:'Conta Mercado Livre não conectada' });

    const acc = rows[0];
    const headers = { Authorization: `Bearer ${acc.access_token}` };

    const now = new Date();
    const start = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - 1, 1, 0, 0, 0));
    const end = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1, 0, 0, 0));

    const orders = [];
    const limit = 50;
    for (let page = 0; page < 20; page++) {
      const offset = page * limit;
      const { data } = await axios.get('https://api.mercadolibre.com/orders/search', {
        headers,
        params: {
          seller: acc.platform_shop_id,
          sort: 'date_desc',
          'order.date_created.from': start.toISOString(),
          'order.date_created.to': end.toISOString(),
          limit,
          offset
        }
      });
      const arr = Array.isArray(data.results) ? data.results : [];
      orders.push(...arr);
      if (!arr.length || arr.length < limit) break;
      if (data.paging?.total && offset + limit >= Number(data.paging.total)) break;
    }

    const signals = orders.map(o => {
      const tags = Array.isArray(o.tags) ? o.tags : [];
      const payments = Array.isArray(o.payments) ? o.payments : [];
      const pDetails = payments.map(p => String(p.status_detail || '')).filter(Boolean);
      const pStatus = payments.map(p => String(p.status || '')).filter(Boolean);
      const txt = [o.status, o.status_detail, ...tags, ...pDetails, ...pStatus].join(' ').toLowerCase();
      const hasReturn = /(return|returned|devol|refund|refunded|chargeback|reimburs|not_delivered)/i.test(txt);
      return {
        id: String(o.id),
        status: o.status,
        status_detail: o.status_detail || null,
        tags,
        payments: payments.map(p => ({ id:p.id, status:p.status, status_detail:p.status_detail, total_paid_amount:p.total_paid_amount, shipping_cost:p.shipping_cost })),
        shipping_id: o.shipping?.id || null,
        date_created: o.date_created,
        total_amount: o.total_amount,
        has_return_signal: hasReturn
      };
    });

    // Também tenta claims do Mercado Pago, mas algumas contas/app não têm permissão.
    let claims = null;
    let claims_error = null;
    try {
      const { data } = await axios.get('https://api.mercadopago.com/post-purchase/v1/claims/search', {
        headers,
        params: {
          seller_id: acc.platform_shop_id,
          type: 'return',
          limit: 50,
          offset: 0
        }
      });
      claims = data;
    } catch (e) {
      claims_error = e.response?.data || e.message;
    }

    const devolucoes = signals.filter(x => x.has_return_signal);
    res.json({
      success: true,
      periodo: { from: start.toISOString(), to: end.toISOString() },
      total_pedidos_mes_passado: orders.length,
      total_devolucoes_detectadas: devolucoes.length,
      devolucoes,
      amostra_sinais_pedidos: signals.slice(0, 30),
      claims,
      claims_error,
      observacao: devolucoes.length ? 'Foram encontrados sinais de devolução nos pedidos.' : 'Não encontrei sinal de devolução nos pedidos do mês passado pela orders/search. Veja claims/claims_error para confirmar se a API de claims está autorizada.'
    });
  } catch (e) {
    res.status(500).json({ success:false, error:e.response?.data || e.message });
  }
});


async function ssDebugReturnsHandler(req, res) {
  try {
    const days = Math.min(Math.max(parseInt(req.query.days || '365') || 365, 1), 365);
    const accs = await ssGetAccounts(req.user.id, 'mercadolivre');
    const acc = accs[0];
    if (!acc) return res.status(404).json({ success:false, error:'Mercado Livre não conectado' });

    const headers = { Authorization: `Bearer ${acc.access_token}` };
    const since = new Date(Date.now() - days * 86400000).toISOString();
    const orders = [];
    const limit = 50;
    for (let page = 0; page < 20; page++) {
      const offset = page * limit;
      const { data } = await axios.get('https://api.mercadolibre.com/orders/search', {
        headers,
        params: { seller: acc.platform_shop_id, sort:'date_desc', 'order.date_created.from': since, limit, offset }
      });
      const arr = Array.isArray(data.results) ? data.results : [];
      orders.push(...arr);
      if (!arr.length || arr.length < limit) break;
      if (data.paging?.total && offset + limit >= Number(data.paging.total)) break;
    }
    const seen = new Set();
    const unique = orders.filter(o => { const id=String(o.id||''); if(!id || seen.has(id)) return false; seen.add(id); return true; });
    const mapOrder = o => {
      const tags = Array.isArray(o.tags) ? o.tags : [];
      const payments = Array.isArray(o.payments) ? o.payments : [];
      const delivered = tags.includes('delivered');
      const notDelivered = tags.includes('not_delivered');
      const refunded = payments.some(p => /refunded|charged_back|chargeback|reimbursed|bpp_refunded|bpp_covered/i.test(`${p.status||''} ${p.status_detail||''}`));
      const real_return = ssMLIsRealReturnFromOrder(o);
      return {
        id:String(o.id),
        platform_order_id:String(o.id),
        status:o.status,
        status_detail:o.status_detail || null,
        tags,
        shipping_id:o.shipping?.id || null,
        date_created:o.date_created,
        date_closed:o.date_closed || null,
        total_amount:Number(o.total_amount || 0),
        paid_amount:Number(o.paid_amount || 0),
        payments:payments.map(p => ({ id:p.id, status:p.status, status_detail:p.status_detail, total_paid_amount:p.total_paid_amount, shipping_cost:p.shipping_cost })),
        delivered,
        not_delivered:notDelivered,
        refunded,
        real_return,
        suspect_signal:notDelivered || refunded || String(o.status).toLowerCase()==='cancelled'
      };
    };
    const signals = unique.map(mapOrder);
    const devolucoes_reais = signals.filter(x => x.real_return);
    const suspeitas = signals.filter(x => x.suspect_signal && !x.real_return);
    res.json({
      success:true,
      account:{ shop_name:acc.shop_name, seller_id:acc.platform_shop_id },
      periodo:{ days, from:since, to:new Date().toISOString() },
      total_pedidos_consultados:unique.length,
      total_devolucoes_reais:devolucoes_reais.length,
      total_sinais_suspeitos:suspeitas.length,
      devolucoes:devolucoes_reais,
      suspeitos:suspeitas.slice(0,200),
      observacao:'Devolução real = entregue + reembolso/chargeback, ou cancelado após entregue. not_delivered sozinho é só sinal suspeito e não entra como devolução real.'
    });
  } catch(e) {
    res.status(500).json({ success:false, error:e.response?.data || e.message });
  }
}

app.get('/debug/returns', auth, ssDebugReturnsHandler);
app.get('/api/debug/returns', auth, ssDebugReturnsHandler);

app.get('/health', (_, res) => res.json({ status:'ok', app:'SalesSync', version:'5.0' }));

const PORT = process.env.PORT || 3000;
app.listen(PORT, '0.0.0.0', () => console.log(`⚡ SalesSync v5.2 rodando na porta ${PORT}`));  

window.ALL_RETURNS = window.ALL_RETURNS || [];

function filterReturns(){

  const el =
    document.getElementById('returns-search');

  const value =
    (el?.value || '')
    .toLowerCase()
    .trim();

  document
    .querySelectorAll('#returns-body tr')
    .forEach(tr=>{

      const txt =
        (
          tr.getAttribute('data-search')
          || ''
        ).toLowerCase();

      tr.style.display =
        txt.includes(value)
        ? ''
        : 'none';

    });

}

function openReturnDetails(item){

  const body =
    document.getElementById('od-body');

  if(!body) return;

  openMo('mo-order');

  body.innerHTML = `
    <div class="od-block">

      <div class="od-block-title">
        <i class="ti ti-package"></i>
        Detalhes completos da devolução
      </div>

      <pre style="
        white-space:pre-wrap;
        overflow:auto;
        max-height:70vh;
        font-size:11px;
        background:var(--bg2);
        padding:14px;
        border-radius:12px;
        border:1px solid var(--border);
        color:var(--txt);
      ">${JSON.stringify(item,null,2)}</pre>

    </div>
  `;

}

