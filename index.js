// SalesSync v4.1 — Backend Node.js
// Magalu corrigido com estrutura real da API
const express = require('express');
const { Pool } = require('pg');
const axios   = require('axios');
const crypto  = require('crypto');
const cors    = require('cors');
const jwt     = require('jsonwebtoken');
require('dotenv').config();

const app = express();
app.use(cors());
app.use(express.json());

const db = new Pool({ connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false } });
db.connect().then(() => console.log('✅ Supabase conectado!')).catch(e => console.error('❌ Erro DB:', e.message));

const CACHE = {};
const CACHE_TTL = 15 * 60 * 1000;

// CPFs de teste do ambiente Magalu — filtrar fora
const MAGALU_TEST_DOCUMENTS = ['39743407006', '00000000000', '12345678909'];

function auth(req, res, next) {
  const token = req.headers.authorization?.split(' ')[1];
  if (!token) return res.status(401).json({ error: 'Token não fornecido' });
  try { req.user = jwt.verify(token, process.env.JWT_SECRET); next(); }
  catch { res.status(401).json({ error: 'Token inválido' }); }
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
app.get('/api/products', auth, async (req, res) => {
  try {
    const { rows } = await db.query('SELECT * FROM products WHERE user_id=$1 AND is_active=true ORDER BY sku', [req.user.id]);
    res.json({ success: true, data: rows });
  } catch(e) { res.status(500).json({ error: e.message }); }
});

app.post('/api/products', auth, async (req, res) => {
  const { sku, name, cost, description } = req.body;
  try {
    const { rows } = await db.query(
      'INSERT INTO products (user_id,sku,name,cost,description) VALUES ($1,$2,$3,$4,$5) RETURNING *',
      [req.user.id, sku, name, cost||0, description||null]
    );
    res.json({ success: true, data: rows[0] });
  } catch(e) {
    if (e.code === '23505') return res.status(409).json({ error: 'SKU já existe' });
    res.status(500).json({ error: e.message });
  }
});

app.put('/api/products/:sku/cost', auth, async (req, res) => {
  const { cost } = req.body;
  try {
    await db.query('UPDATE products SET cost=$1,updated_at=NOW() WHERE sku=$2 AND user_id=$3', [cost, req.params.sku, req.user.id]);
    Object.keys(CACHE).forEach(k => { if (k.startsWith(req.user.id)) delete CACHE[k]; });
    res.json({ success: true });
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

// ── FETCH ML ──
async function fetchML(acc, days) {
  const since = new Date(Date.now() - days * 86400000).toISOString();
  const headers = { Authorization: `Bearer ${acc.access_token}` };
  const { data } = await axios.get('https://api.mercadolibre.com/orders/search', {
    params: { seller: acc.platform_shop_id, sort: 'date_desc', 'order.date_created.from': since, limit: 50 },
    headers
  });
  const results = data.results || [];

  // Coleta IDs unicos para busca em lote (max 20 por request)
  const itemIds = [...new Set(
    results.map(o => o.order_items?.[0]?.item?.id).filter(Boolean)
  )];

  // Busca items em lotes de 20 — muito mais rapido que 1 a 1
  const itemMap = {};
  for (let i = 0; i < itemIds.length; i += 20) {
    const batch = itemIds.slice(i, i + 20);
    try {
      const { data: items } = await axios.get('https://api.mercadolibre.com/items', {
        params: { ids: batch.join(',') },
        headers
      });
      (Array.isArray(items) ? items : []).forEach(entry => {
        if (entry.code === 200 && entry.body) {
          const b = entry.body;
          // Pega melhor imagem disponivel
          const raw = b.pictures?.[0]?.url || b.thumbnail || null;
          itemMap[b.id] = {
            title: b.title,
            image: raw,
            sku:   b.seller_custom_field ||
                   b.attributes?.find(a => a.id === 'SELLER_SKU')?.value_name || '',
          };
        }
      });
    } catch(e) { console.error('[ML items batch]', e.message); }
  }

  const statusMap = {
    paid:'paid', payment_required:'pending', pending:'pending',
    confirmed:'paid', shipped:'shipped', delivered:'delivered',
    cancelled:'cancelled', invalid:'cancelled',
  };

  return results.map(o => {
    const item    = o.order_items?.[0];
    const details = itemMap[item?.item?.id] || {};
    return {
      id:               String(o.id),
      platform:         'mercadolivre',
      platform_order_id:String(o.id),
      shop_name:        acc.shop_name,
      fulfillment_type: o.shipping?.logistic_type === 'fulfillment' ? 'full' : 'normal',
      status:           statusMap[o.status] || o.status,
      buyer_name:       o.buyer?.nickname || '',
      total_amount:     o.total_amount || 0,
      platform_fee:     o.payments?.[0]?.marketplace_fee || 0,
      shipping_fee:     o.shipping?.cost || 0,
      tax_amount:       (o.total_amount || 0) * 0.06,
      quantity:         item?.quantity || 1,
      order_date:       o.date_created,
      item_title:       details.title || item?.item?.title || '',
      item_image:       details.image || null,
      item_sku:         details.sku   || item?.item?.seller_sku || '',
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
    const { data } = await axios.post('https://id.magalu.com/oauth/token',
      new URLSearchParams({ grant_type:'refresh_token', refresh_token:account.refresh_token,
        client_id:process.env.MAGALU_CLIENT_ID, client_secret:process.env.MAGALU_CLIENT_SECRET }),
      { headers: { 'Content-Type':'application/x-www-form-urlencoded' } }
    );
    await db.query(
      `UPDATE marketplace_accounts SET access_token=$1,refresh_token=$2,token_expires_at=$3,updated_at=NOW() WHERE id=$4`,
      [data.access_token, data.refresh_token, new Date(Date.now()+data.expires_in*1000), account.id]
    );
    console.log('[Magalu] 🔄 Token renovado');
    return data.access_token;
  } catch(e) { console.error('[Magalu Refresh]', e.message); return null; }
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
  const { rows } = await db.query('SELECT sku, cost FROM products WHERE user_id=$1', [userId]);
  const costMap = {};
  rows.forEach(p => { costMap[p.sku] = parseFloat(p.cost || 0); });
  return orders.map(o => {
    const cost       = costMap[o.item_sku] || 0;
    const total_cost = cost * (o.quantity || 1);
    const net_revenue= o.total_amount - o.platform_fee - o.shipping_fee - o.tax_amount;
    const profit     = o.status === 'cancelled' ? 0 : (net_revenue - total_cost);
    const margin     = o.total_amount > 0 ? (profit / o.total_amount * 100) : 0;
    return { ...o, total_cost, net_revenue, profit, profit_margin_pct: margin };
  });
}

// ── API PEDIDOS ──
app.get('/api/orders', auth, async (req, res) => {
  const { period = '7', platform } = req.query;
  const days = parseInt(period);
  try {
    const { rows: accounts } = await db.query(
      `SELECT * FROM marketplace_accounts WHERE user_id=$1 AND is_active=true AND access_token IS NOT NULL`,
      [req.user.id]
    );
    if (!accounts.length) return res.json({ success: true, data: [] });

    let allOrders = [];
    const filtered = platform ? accounts.filter(a => a.platform === platform) : accounts;

    for (const acc of filtered) {
      const cacheKey = `${req.user.id}_${acc.platform}_${days}`;
      const cached   = CACHE[cacheKey];
      if (cached && (Date.now() - cached.ts) < CACHE_TTL) {
        allOrders = allOrders.concat(cached.data); continue;
      }
      try {
        let orders = [];
        if (acc.platform === 'mercadolivre') orders = await fetchML(acc, days);
        else if (acc.platform === 'shopee')  orders = await fetchShopee(acc, days);
        else if (acc.platform === 'magalu')  orders = await fetchMagalu(acc, days);
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
  res.redirect('https://id.magalu.com/login?' + new URLSearchParams({
    client_id: process.env.MAGALU_CLIENT_ID,
    redirect_uri: process.env.MAGALU_REDIRECT_URI,
    scope: 'open:order-order-seller:read open:order-delivery-seller:read',
    response_type: 'code', choose_tenants: 'true', state
  }).toString());
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
  } catch(e) { console.error('[Magalu]', e.response?.data||e.message); res.redirect('https://salesync.shop?error=magalu_failed'); }
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
      const { data } = await axios.get('https://api.mercadolibre.com/orders/search', {
        params: { seller: acc.platform_shop_id, sort: 'date_desc', 'order.date_created.from': since, limit: 20 },
        headers: { Authorization: `Bearer ${acc.access_token}` }
      });
      rawData = data;
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

app.get('/health', (_, res) => res.json({ status:'ok', app:'SalesSync', version:'4.1' }));

const PORT = process.env.PORT || 3000;
app.listen(PORT, '0.0.0.0', () => console.log(`⚡ SalesSync v4.1 rodando na porta ${PORT}`));
