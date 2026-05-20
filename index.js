// SalesSync v3 — Backend Node.js
// Pedidos buscados em tempo real da API, sem salvar no banco
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

// Cache em memória para pedidos (evita chamar API a cada request)
const CACHE = {}; // { userId_platform: { data, ts } }
const CACHE_TTL = 15 * 60 * 1000; // 15 min

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
    // Limpa cache
    Object.keys(CACHE).forEach(k => { if (k.startsWith(req.user.id)) delete CACHE[k]; });
    res.json({ success: true });
  } catch(e) { res.status(500).json({ error: e.message }); }
});

// ── PRODUTOS / SKUs ──
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
    await db.query(
      'UPDATE products SET cost=$1,updated_at=NOW() WHERE sku=$2 AND user_id=$3',
      [cost, req.params.sku, req.user.id]
    );
    // Invalida cache do usuário para recalcular lucro
    Object.keys(CACHE).forEach(k => { if (k.startsWith(req.user.id)) delete CACHE[k]; });
    res.json({ success: true });
  } catch(e) { res.status(500).json({ error: e.message }); }
});

// ── FETCH PEDIDOS ML (com foto, título, SKU) ──
async function fetchML(acc, days) {
  const since = new Date(Date.now() - days * 86400000).toISOString();
  const headers = { Authorization: `Bearer ${acc.access_token}` };

  // Busca lista de pedidos
  const { data } = await axios.get('https://api.mercadolibre.com/orders/search', {
    params: { seller: acc.platform_shop_id, sort: 'date_desc', 'order.date_created.from': since, limit: 50 },
    headers
  });

  const orders = [];
  for (const o of (data.results || [])) {
    const item = o.order_items?.[0];
    let title = item?.item?.title || '';
    let image = null;
    let sku   = item?.item?.seller_sku || '';

    // Busca detalhes do item para foto
    try {
      if (item?.item?.id) {
        const { data: itemData } = await axios.get(
          `https://api.mercadolibre.com/items/${item.item.id}`,
          { headers }
        );
        title = itemData.title  || title;
        image = itemData.thumbnail || itemData.pictures?.[0]?.url || null;
        sku   = itemData.seller_custom_field || sku;
      }
    } catch {}

    orders.push({
      id:               String(o.id),
      platform:         'mercadolivre',
      platform_order_id:String(o.id),
      shop_name:        acc.shop_name,
      fulfillment_type: o.shipping?.logistic_type === 'fulfillment' ? 'full' : 'normal',
      status:           o.status,
      buyer_name:       o.buyer?.nickname || '',
      buyer_id:         String(o.buyer?.id || ''),
      total_amount:     o.total_amount || 0,
      platform_fee:     o.payments?.[0]?.marketplace_fee || 0,
      shipping_fee:     o.shipping?.cost || 0,
      tax_amount:       (o.total_amount || 0) * 0.06,
      quantity:         item?.quantity || 1,
      order_date:       o.date_created,
      item_title:       title,
      item_image:       image,
      item_sku:         sku,
    });
  }
  return orders;
}

// ── FETCH PEDIDOS SHOPEE ──
function shopeeSign(pid, path, ts, key) {
  return crypto.createHmac('sha256', key).update(`${pid}${path}${ts}`).digest('hex');
}

async function fetchShopee(acc, days) {
  const since = Math.floor((Date.now() - days * 86400000) / 1000);
  const ts    = Math.floor(Date.now() / 1000);
  const path  = '/api/v2/order/get_order_list';
  const sign  = shopeeSign(process.env.SHOPEE_PARTNER_ID, path, ts, process.env.SHOPEE_PARTNER_KEY);

  const { data } = await axios.get(`https://partner.shopeemobile.com${path}`, {
    params: {
      partner_id: process.env.SHOPEE_PARTNER_ID, shop_id: acc.platform_shop_id,
      access_token: acc.access_token, timestamp: ts, sign,
      time_range_field: 'create_time', time_from: since,
      time_to: Math.floor(Date.now() / 1000), page_size: 50, order_status: 'ALL'
    }
  });

  return ((data.response?.order_list) || []).map(o => ({
    id:               o.order_sn,
    platform:         'shopee',
    platform_order_id:o.order_sn,
    shop_name:        acc.shop_name,
    fulfillment_type: 'normal',
    status:           (o.order_status || 'paid').toLowerCase(),
    buyer_name:       o.buyer_username || '',
    buyer_id:         '',
    total_amount:     o.total_amount || 0,
    platform_fee:     (o.total_amount || 0) * 0.08,
    shipping_fee:     o.actual_shipping_cost || 0,
    tax_amount:       (o.total_amount || 0) * 0.06,
    quantity:         1,
    order_date:       new Date(o.create_time * 1000).toISOString(),
    item_title:       o.item_list?.[0]?.item_name || 'Produto Shopee',
    item_image:       null,
    item_sku:         o.item_list?.[0]?.item_sku || '',
  }));
}

// ── FETCH PEDIDOS MAGALU ──
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
    return data.access_token;
  } catch(e) { console.error('[MAGALU REFRESH]', e.message); return null; }
}

async function fetchMagalu(acc, days) {
  let token = acc.access_token;
  if (acc.token_expires_at && new Date(acc.token_expires_at) <= new Date()) {
    token = await refreshMagaluToken(acc);
    if (!token) throw new Error('Token Magalu expirado');
  }
  const since = new Date(Date.now() - days * 86400000).toISOString();
  const { data } = await axios.get('https://api.magalu.com/orders', {
    params: { created_after: since, limit: 50 },
    headers: { Authorization: `Bearer ${token}` }
  });
  return ((data.results) || []).map(o => ({
    id:               String(o.id),
    platform:         'magalu',
    platform_order_id:String(o.id),
    shop_name:        acc.shop_name,
    fulfillment_type: o.fulfillment_type === 'magalu' ? 'full' : 'normal',
    status:           o.status || 'paid',
    buyer_name:       o.customer?.name || '',
    buyer_id:         '',
    total_amount:     Number(o.total || 0),
    platform_fee:     Number(o.commission || 0),
    shipping_fee:     Number(o.shipping_cost || 0),
    tax_amount:       Number((o.total || 0) * 0.06),
    quantity:         1,
    order_date:       o.created_at || new Date().toISOString(),
    item_title:       o.items?.[0]?.title || 'Produto Magalu',
    item_image:       o.items?.[0]?.image || null,
    item_sku:         o.items?.[0]?.sku   || '',
  }));
}

// ── ENRIQUECE PEDIDOS COM CUSTO DO PRODUTO ──
async function enrichWithCosts(orders, userId) {
  const { rows: products } = await db.query('SELECT sku, cost FROM products WHERE user_id=$1', [userId]);
  const costMap = {};
  products.forEach(p => { costMap[p.sku] = parseFloat(p.cost || 0); });

  return orders.map(o => {
    const cost        = costMap[o.item_sku] || 0;
    const total_cost  = cost * (o.quantity || 1);
    const net_revenue = o.total_amount - o.platform_fee - o.shipping_fee - o.tax_amount;
    const profit      = o.status === 'cancelled' ? 0 : (net_revenue - total_cost);
    const margin      = o.total_amount > 0 ? (profit / o.total_amount * 100) : 0;
    return { ...o, total_cost, net_revenue, profit, profit_margin_pct: margin };
  });
}

// ── API PEDIDOS (tempo real, sem salvar no banco) ──
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
        allOrders = allOrders.concat(cached.data);
        continue;
      }

      try {
        let orders = [];
        if (acc.platform === 'mercadolivre') orders = await fetchML(acc, days);
        else if (acc.platform === 'shopee')  orders = await fetchShopee(acc, days);
        else if (acc.platform === 'magalu')  orders = await fetchMagalu(acc, days);

        CACHE[cacheKey] = { data: orders, ts: Date.now() };
        allOrders = allOrders.concat(orders);

        // Atualiza last_sync
        await db.query(`UPDATE marketplace_accounts SET last_sync_at=NOW() WHERE id=$1`, [acc.id]);
      } catch(e) {
        console.error(`[FETCH ${acc.platform}]`, e.message);
      }
    }

    // Enriquece com custo do produto
    const enriched = await enrichWithCosts(allOrders, req.user.id);

    // Ordena por data
    enriched.sort((a, b) => new Date(b.order_date) - new Date(a.order_date));

    res.json({ success: true, data: enriched, total: enriched.length });
  } catch(e) { res.status(500).json({ error: e.message }); }
});

// ── DASHBOARD (calculado dos pedidos em tempo real) ──
app.get('/api/dashboard', auth, async (req, res) => {
  const { period = '7', platform } = req.query;
  try {
    // Reutiliza a busca de pedidos
    const ordersRes = await axios.get(`http://localhost:${process.env.PORT||3000}/api/orders?period=${period}${platform?'&platform='+platform:''}`, {
      headers: { Authorization: req.headers.authorization }
    });
    const orders = ordersRes.data.data || [];
    const paid   = orders.filter(o => o.status !== 'cancelled');
    const canceled = orders.filter(o => o.status === 'cancelled');

    const sum = (arr, key) => arr.reduce((s, o) => s + parseFloat(o[key]||0), 0);

    const faturamento = sum(paid, 'total_amount');
    const lucro       = sum(paid, 'profit');
    const tarifas     = sum(paid, 'platform_fee');
    const frete       = sum(paid, 'shipping_fee');
    const impostos    = sum(paid, 'tax_amount');
    const custos      = sum(paid, 'total_cost');
    const ticket_medio= paid.length ? faturamento / paid.length : 0;
    const margem_media= faturamento > 0 ? (lucro / faturamento * 100) : 0;

    res.json({
      success: true,
      data: {
        total_orders: paid.length,
        cancelados:   canceled.length,
        faturamento, lucro, tarifas, frete, impostos, custos,
        ticket_medio, margem_media
      }
    });
  } catch(e) { res.status(500).json({ error: e.message }); }
});

// ── SYNC MANUAL (invalida cache e força nova busca) ──
app.get('/api/sync/:platform', auth, async (req, res) => {
  const { platform } = req.params;
  // Invalida cache para forçar nova busca
  Object.keys(CACHE).forEach(k => {
    if (k.startsWith(`${req.user.id}_${platform}`)) delete CACHE[k];
  });
  res.json({ success: true, message: 'Cache invalidado — próxima requisição buscará dados frescos' });
});

// ── SYNC AUTOMÁTICO (a cada 15 min, invalida cache de todos usuários) ──
setInterval(() => {
  const now = Date.now();
  let cleared = 0;
  Object.keys(CACHE).forEach(k => {
    if ((now - CACHE[k].ts) >= CACHE_TTL) { delete CACHE[k]; cleared++; }
  });
  if (cleared) console.log(`[AUTO-SYNC] ${cleared} caches expirados — próximas requisições buscarão dados frescos`);
}, CACHE_TTL);

// ── OAUTH — MERCADO LIVRE ──
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
    console.log(`[ML] ✅ ${info.nickname} conectado`);
    res.redirect('https://salesync.shop?connected=mercadolivre');
  } catch(e) { console.error('[ML]', e.response?.data||e.message); res.redirect('https://salesync.shop?error=ml_failed'); }
});

// ── OAUTH — SHOPEE ──
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
      VALUES ($1,'shopee',$2,$3,$4,$5,$6,'normal',true)
      ON CONFLICT (user_id,platform,platform_shop_id) DO UPDATE SET
        access_token=EXCLUDED.access_token,refresh_token=EXCLUDED.refresh_token,
        token_expires_at=EXCLUDED.token_expires_at,is_active=true,updated_at=NOW()`,
      [uid, String(shop_id), `Shopee Loja ${shop_id}`, tk.access_token, tk.refresh_token, new Date(Date.now()+tk.expire_in*1000)]
    );
    res.redirect('https://salesync.shop?connected=shopee');
  } catch(e) { console.error('[Shopee]', e.response?.data||e.message); res.redirect('https://salesync.shop?error=shopee_failed'); }
});

// ── OAUTH — MAGALU ──
app.get('/auth/magalu', (req, res) => {
  const state = req.query.user_id || '';
  res.redirect('https://id.magalu.com/login?' + new URLSearchParams({
    client_id: process.env.MAGALU_CLIENT_ID, redirect_uri: process.env.MAGALU_REDIRECT_URI,
    scope: 'open:order-order-seller:read', response_type: 'code', choose_tenants: 'true', state
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
    let sellerId='magalu-store', shopName='Loja Magalu';
    try {
      const { data: seller } = await axios.get('https://api.magalu.com/seller', { headers: { Authorization:`Bearer ${tk.access_token}` } });
      sellerId = seller.id || 'magalu-store'; shopName = seller.name || 'Loja Magalu';
    } catch(se) { console.log('[MAGALU SELLER]', se.message); }
    await db.query(`
      INSERT INTO marketplace_accounts (user_id,platform,platform_shop_id,shop_name,access_token,refresh_token,token_expires_at,mode,is_active)
      VALUES ($1,'magalu',$2,$3,$4,$5,$6,'both',true)
      ON CONFLICT (user_id,platform,platform_shop_id) DO UPDATE SET
        access_token=EXCLUDED.access_token,refresh_token=EXCLUDED.refresh_token,
        token_expires_at=EXCLUDED.token_expires_at,shop_name=EXCLUDED.shop_name,is_active=true,updated_at=NOW()`,
      [state, String(sellerId), shopName, tk.access_token, tk.refresh_token, new Date(Date.now()+(tk.expires_in||7200)*1000)]
    );
    console.log(`[Magalu] ✅ ${shopName} conectado`);
    res.redirect('https://salesync.shop?connected=magalu');
  } catch(e) { console.error('[Magalu]', e.response?.data||e.message); res.redirect('https://salesync.shop?error=magalu_failed'); }
});

app.get('/health', (_, res) => res.json({ status:'ok', app:'SalesSync', version:'3.0' }));

const PORT = process.env.PORT || 3000;
app.listen(PORT, '0.0.0.0', () => console.log(`⚡ SalesSync v3 rodando na porta ${PORT}`));
