// SalesSync — Backend Node.js
// Banco: Supabase (PostgreSQL) | Deploy: Railway

const express = require('express');
const { Pool } = require('pg');
const axios   = require('axios');
const crypto  = require('crypto');
const cors    = require('cors');
const jwt     = require('jsonwebtoken');
require('dotenv').config();

const app = express();
app.use(cors({
  origin: ['https://salesync.shop','https://www.salesync.shop','http://localhost:3000','http://localhost:5173'],
  credentials: true
}));
app.use(express.json());

// ─── BANCO SUPABASE ───────────────────────────
const db = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }  // obrigatório no Supabase
});
db.connect()
  .then(() => console.log('✅ Supabase conectado!'))
  .catch(e => console.error('❌ Erro DB:', e.message));

// ─── MIDDLEWARE JWT ───────────────────────────
function auth(req, res, next) {
  const token = req.headers.authorization?.split(' ')[1];
  if (!token) return res.status(401).json({ error: 'Token não fornecido' });
  try { req.user = jwt.verify(token, process.env.JWT_SECRET); next(); }
  catch { res.status(401).json({ error: 'Token inválido' }); }
}

// ══════════════════════════════════════════════
// AUTH
// ══════════════════════════════════════════════

app.post('/api/auth/register', async (req, res) => {
  const { name, email, password, cnpj } = req.body;
  if (!name || !email || !password)
    return res.status(400).json({ error: 'name, email e password são obrigatórios' });
  try {
    const { rows } = await db.query(
      `INSERT INTO users (name,email,password_hash,cnpj)
       VALUES ($1,$2,crypt($3,gen_salt('bf')),$4) RETURNING id,name,email,plan`,
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
      `SELECT id,name,email,plan FROM users
       WHERE email=$1 AND password_hash=crypt($2,password_hash) AND is_active=true`,
      [email, password]
    );
    if (!rows.length) return res.status(401).json({ error: 'E-mail ou senha incorretos' });
    const token = jwt.sign({ id: rows[0].id, email }, process.env.JWT_SECRET, { expiresIn: '30d' });
    res.json({ success: true, token, user: rows[0] });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// ══════════════════════════════════════════════
// DASHBOARD
// ══════════════════════════════════════════════

app.get('/api/dashboard', auth, async (req, res) => {
  const { period = '7' } = req.query;
  try {
    const { rows } = await db.query(`
      SELECT
        COUNT(*) FILTER (WHERE status!='cancelled')              AS total_orders,
        COUNT(*) FILTER (WHERE status='cancelled')               AS cancelados,
        COALESCE(SUM(total_amount)  FILTER (WHERE status!='cancelled'),0) AS faturamento,
        COALESCE(SUM(profit)        FILTER (WHERE status!='cancelled'),0) AS lucro,
        COALESCE(SUM(platform_fee)  FILTER (WHERE status!='cancelled'),0) AS tarifas,
        COALESCE(SUM(shipping_fee)  FILTER (WHERE status!='cancelled'),0) AS frete,
        COALESCE(SUM(tax_amount)    FILTER (WHERE status!='cancelled'),0) AS impostos,
        COALESCE(SUM(total_cost)    FILTER (WHERE status!='cancelled'),0) AS custos,
        COALESCE(AVG(total_amount)  FILTER (WHERE status!='cancelled'),0) AS ticket_medio,
        COALESCE(AVG(profit_margin_pct) FILTER (WHERE status!='cancelled'),0) AS margem_media
      FROM orders_with_profit
      WHERE user_id=$1 AND order_date >= NOW()-($2||' days')::INTERVAL`,
      [req.user.id, parseInt(period)]
    );
    res.json({ success: true, data: rows[0] });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// ══════════════════════════════════════════════
// PEDIDOS
// ══════════════════════════════════════════════

app.get('/api/orders', auth, async (req, res) => {
  const { period='7', platform, status, page=1, limit=50 } = req.query;
  const params = [req.user.id, parseInt(period)];
  let where = `WHERE user_id=$1 AND order_date>=NOW()-($2||' days')::INTERVAL`;
  if (platform) { params.push(platform); where+=` AND platform=$${params.length}`; }
  if (status)   { params.push(status);   where+=` AND status=$${params.length}`; }
  const offset = (parseInt(page)-1)*parseInt(limit);
  try {
    const { rows } = await db.query(
      `SELECT * FROM orders_with_profit ${where} ORDER BY order_date DESC LIMIT ${parseInt(limit)} OFFSET ${offset}`,
      params
    );
    const { rows: cnt } = await db.query(`SELECT COUNT(*) FROM orders_with_profit ${where}`, params);
    res.json({ success:true, data:rows, total:parseInt(cnt[0].count), page:parseInt(page) });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.get('/api/orders/:id', auth, async (req, res) => {
  try {
    const { rows } = await db.query(
      'SELECT * FROM orders_with_profit WHERE id=$1 AND user_id=$2',
      [req.params.id, req.user.id]
    );
    if (!rows.length) return res.status(404).json({ error: 'Não encontrado' });
    const { rows: items } = await db.query('SELECT * FROM order_items WHERE order_id=$1',[req.params.id]);
    res.json({ success:true, data:{ ...rows[0], items } });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// ══════════════════════════════════════════════
// PRODUTOS
// ══════════════════════════════════════════════

app.get('/api/products', auth, async (req,res) => {
  try {
    const { rows } = await db.query(
      'SELECT * FROM products WHERE user_id=$1 AND is_active=true ORDER BY sku',[req.user.id]
    );
    res.json({ success:true, data:rows });
  } catch(e) { res.status(500).json({ error:e.message }); }
});

app.post('/api/products', auth, async (req,res) => {
  const { sku, name, cost, description } = req.body;
  try {
    const { rows } = await db.query(
      'INSERT INTO products (user_id,sku,name,cost,description) VALUES ($1,$2,$3,$4,$5) RETURNING *',
      [req.user.id, sku, name, cost||0, description||null]
    );
    res.json({ success:true, data:rows[0] });
  } catch(e) {
    if (e.code==='23505') return res.status(409).json({ error:'SKU já existe' });
    res.status(500).json({ error:e.message });
  }
});

app.put('/api/products/:sku/cost', auth, async (req,res) => {
  const { cost } = req.body;
  try {
    await db.query('UPDATE products SET cost=$1,updated_at=NOW() WHERE sku=$2 AND user_id=$3',[cost,req.params.sku,req.user.id]);
    await db.query('UPDATE order_items SET unit_cost=$1 WHERE sku=$2',[cost,req.params.sku]);
    res.json({ success:true });
  } catch(e) { res.status(500).json({ error:e.message }); }
});

// ══════════════════════════════════════════════
// CONTAS
// ══════════════════════════════════════════════

app.get('/api/accounts', auth, async (req,res) => {
  try {
    const { rows } = await db.query(`
      SELECT id,platform,shop_name,seller_email,mode,is_active,last_sync_at,total_orders,
             (access_token IS NOT NULL) AS is_connected
      FROM marketplace_accounts WHERE user_id=$1 ORDER BY platform`,[req.user.id]
    );
    res.json({ success:true, data:rows });
  } catch(e) { res.status(500).json({ error:e.message }); }
});

// ══════════════════════════════════════════════
// OAUTH — MERCADO LIVRE
// Você criou o app em developers.mercadolivre.com.br (uma única vez)
// O seller só clica "Conectar ML" no SalesSync e autoriza no popup
// ══════════════════════════════════════════════

app.get('/auth/mercadolivre', (req, res) => {
  const state = req.query.user_id || '';
  const url = 'https://auth.mercadolivre.com.br/authorization'
    + `?response_type=code`
    + `&client_id=${process.env.ML_CLIENT_ID}`
    + `&redirect_uri=${encodeURIComponent(process.env.ML_REDIRECT_URI)}`
    + `&state=${state}`;
  res.redirect(url);
});

app.get('/callback/mercadolivre', async (req, res) => {
  const { code, state } = req.query;
  if (!code) return res.redirect('https://salesync.shop?error=ml_no_code');
  try {
    const { data: tk } = await axios.post(
      'https://api.mercadolibre.com/oauth/token',
      new URLSearchParams({ grant_type:'authorization_code', client_id:process.env.ML_CLIENT_ID,
        client_secret:process.env.ML_CLIENT_SECRET, code, redirect_uri:process.env.ML_REDIRECT_URI }),
      { headers: { 'Content-Type':'application/x-www-form-urlencoded' } }
    );
    const { data: info } = await axios.get(`https://api.mercadolibre.com/users/${tk.user_id}`,
      { headers: { Authorization:`Bearer ${tk.access_token}` } }
    );
    await db.query(`
      INSERT INTO marketplace_accounts
        (user_id,platform,platform_shop_id,shop_name,seller_email,access_token,refresh_token,token_expires_at,mode,is_active)
      VALUES ($1,'mercadolivre',$2,$3,$4,$5,$6,$7,'both',true)
      ON CONFLICT (user_id,platform,platform_shop_id) DO UPDATE SET
        access_token=EXCLUDED.access_token, refresh_token=EXCLUDED.refresh_token,
        token_expires_at=EXCLUDED.token_expires_at, is_active=true, updated_at=NOW()`,
      [state, String(tk.user_id), info.nickname, info.email,
       tk.access_token, tk.refresh_token, new Date(Date.now()+tk.expires_in*1000)]
    );
    console.log(`[ML] ✅ ${info.nickname} conectado`);
    res.redirect('https://salesync.shop?connected=mercadolivre');
  } catch(e) {
    console.error('[ML]', e.response?.data||e.message);
    res.redirect('https://salesync.shop?error=ml_failed');
  }
});

// ══════════════════════════════════════════════
// OAUTH — SHOPEE
// Você criou o app em open.shopee.com (uma única vez)
// ══════════════════════════════════════════════

function shopeeSign(pid, path, ts, key) {
  return crypto.createHmac('sha256', key).update(`${pid}${path}${ts}`).digest('hex');
}

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
      INSERT INTO marketplace_accounts
        (user_id,platform,platform_shop_id,shop_name,access_token,refresh_token,token_expires_at,mode,is_active)
      VALUES ($1,'shopee',$2,$3,$4,$5,$6,'normal',true)
      ON CONFLICT (user_id,platform,platform_shop_id) DO UPDATE SET
        access_token=EXCLUDED.access_token, refresh_token=EXCLUDED.refresh_token,
        token_expires_at=EXCLUDED.token_expires_at, is_active=true, updated_at=NOW()`,
      [uid, String(shop_id), `Shopee Loja ${shop_id}`,
       tk.access_token, tk.refresh_token, new Date(Date.now()+tk.expire_in*1000)]
    );
    console.log(`[Shopee] ✅ Loja ${shop_id} conectada`);
    res.redirect('https://salesync.shop?connected=shopee');
  } catch(e) {
    console.error('[Shopee]', e.response?.data||e.message);
    res.redirect('https://salesync.shop?error=shopee_failed');
  }
});

// ══════════════════════════════════════════════
// OAUTH — MAGALU
// Você solicitou acesso em developers.magazineluiza.com.br (uma única vez)
// ══════════════════════════════════════════════

app.get('/auth/magalu', (req, res) => {
  const url='https://id.magalu.com/oauth/auth'
    +`?response_type=code&client_id=${process.env.MAGALU_CLIENT_ID}`
    +`&redirect_uri=${encodeURIComponent(process.env.MAGALU_REDIRECT_URI)}`
    +`&scope=orders:read products:read financial:read fulfillment:read`
    +`&state=${req.query.user_id||''}`;
  res.redirect(url);
});

app.get('/callback/magalu', async (req, res) => {
  const { code, state } = req.query;
  if (!code) return res.redirect('https://salesync.shop?error=magalu_no_code');
  try {
    const creds=Buffer.from(`${process.env.MAGALU_CLIENT_ID}:${process.env.MAGALU_CLIENT_SECRET}`).toString('base64');
    const { data:tk } = await axios.post('https://id.magalu.com/oauth/token',
      new URLSearchParams({ grant_type:'authorization_code', code, redirect_uri:process.env.MAGALU_REDIRECT_URI }),
      { headers:{ Authorization:`Basic ${creds}`, 'Content-Type':'application/x-www-form-urlencoded' } }
    );
    await db.query(`
      INSERT INTO marketplace_accounts
        (user_id,platform,platform_shop_id,shop_name,access_token,refresh_token,token_expires_at,mode,is_active)
      VALUES ($1,'magalu',$2,'Minha Loja Magalu',$3,$4,$5,'both',true)
      ON CONFLICT (user_id,platform,platform_shop_id) DO UPDATE SET
        access_token=EXCLUDED.access_token, refresh_token=EXCLUDED.refresh_token,
        token_expires_at=EXCLUDED.token_expires_at, is_active=true, updated_at=NOW()`,
      [state, tk.seller_id||'mg-001', tk.access_token, tk.refresh_token,
       new Date(Date.now()+(tk.expires_in||3600)*1000)]
    );
    console.log('[Magalu] ✅ Conectado');
    res.redirect('https://salesync.shop?connected=magalu');
  } catch(e) {
    console.error('[Magalu]', e.response?.data||e.message);
    res.redirect('https://salesync.shop?error=magalu_failed');
  }
});

// ══════════════════════════════════════════════
// SINCRONIZAÇÃO
// ══════════════════════════════════════════════

app.get('/api/sync/:platform', auth, async (req, res) => {
  const { platform } = req.params;
  try {
    const { rows:accounts } = await db.query(
      `SELECT * FROM marketplace_accounts
       WHERE user_id=$1 AND platform=$2 AND is_active=true AND access_token IS NOT NULL`,
      [req.user.id, platform]
    );
    if (!accounts.length) return res.json({ success:false, error:`Conta ${platform} não conectada` });
    const acc = accounts[0];
    const since = acc.last_sync_at ? new Date(acc.last_sync_at) : new Date(Date.now()-7*86400000);
    let orders = [];
    if (platform==='mercadolivre') orders=await fetchML(acc,since);
    else if (platform==='shopee')  orders=await fetchShopee(acc,since);
    else if (platform==='magalu')  orders=await fetchMagalu(acc,since);
    let newCount=0;
    for (const o of orders) {
      const r = await db.query(`
        INSERT INTO orders (user_id,account_id,platform,platform_order_id,fulfillment_type,
          status,buyer_name,total_amount,platform_fee,shipping_fee,tax_amount,order_date)
        VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12)
        ON CONFLICT (platform,platform_order_id) DO UPDATE SET status=EXCLUDED.status,updated_at=NOW()
        RETURNING (xmax=0) AS inserted`,
        [req.user.id,acc.id,o.platform,o.platform_order_id,o.fulfillment_type,
         o.status,o.buyer_name,o.total_amount,o.platform_fee,o.shipping_fee,o.tax_amount,o.order_date]
      );
      if (r.rows[0]?.inserted) newCount++;
    }
    await db.query(`UPDATE marketplace_accounts SET last_sync_at=NOW() WHERE id=$1`,[acc.id]);
    res.json({ success:true, platform, fetched:orders.length, new:newCount });
  } catch(e) { res.status(500).json({ error:e.message }); }
});

async function fetchML(acc, since) {
  const { data } = await axios.get('https://api.mercadolibre.com/orders/search', {
    params: { seller:acc.platform_shop_id, sort:'date_desc', 'order.date_created.from':since.toISOString() },
    headers: { Authorization:`Bearer ${acc.access_token}` }
  });
  return (data.results||[]).map(o=>({
    platform:'mercadolivre', platform_order_id:String(o.id),
    fulfillment_type:o.shipping?.logistic_type==='fulfillment'?'full':'normal',
    status:o.status, buyer_name:o.buyer?.nickname||'',
    total_amount:o.total_amount||0, platform_fee:o.payments?.[0]?.marketplace_fee||0,
    shipping_fee:o.shipping?.cost||0, tax_amount:(o.total_amount||0)*0.06, order_date:o.date_created
  }));
}

async function fetchShopee(acc, since) {
  const ts=Math.floor(Date.now()/1000), path='/api/v2/order/get_order_list';
  const sign=shopeeSign(process.env.SHOPEE_PARTNER_ID,path,ts,process.env.SHOPEE_PARTNER_KEY);
  const { data } = await axios.get(`https://partner.shopeemobile.com${path}`, {
    params:{ partner_id:process.env.SHOPEE_PARTNER_ID, shop_id:acc.platform_shop_id,
             access_token:acc.access_token, timestamp:ts, sign,
             time_range_field:'create_time', time_from:Math.floor(since.getTime()/1000),
             time_to:ts, page_size:50, order_status:'ALL' }
  });
  return ((data.response?.order_list)||[]).map(o=>({
    platform:'shopee', platform_order_id:o.order_sn, fulfillment_type:'normal',
    status:(o.order_status||'paid').toLowerCase(), buyer_name:o.buyer_username||'',
    total_amount:o.total_amount||0, platform_fee:(o.total_amount||0)*0.08,
    shipping_fee:o.actual_shipping_cost||0, tax_amount:(o.total_amount||0)*0.06,
    order_date:new Date(o.create_time*1000).toISOString()
  }));
}

async function fetchMagalu(acc, since) {
  const { data } = await axios.get('https://api.magalu.com/v1/orders', {
    params:{ created_after:since.toISOString(), limit:50 },
    headers:{ Authorization:`Bearer ${acc.access_token}` }
  });
  return ((data.results)||[]).map(o=>({
    platform:'magalu', platform_order_id:o.id,
    fulfillment_type:o.fulfillment_type==='magalu'?'full':'normal',
    status:o.status, buyer_name:o.customer?.name||'',
    total_amount:o.total||0, platform_fee:o.commission||0,
    shipping_fee:o.shipping_cost||0, tax_amount:(o.total||0)*0.06, order_date:o.created_at
  }));
}

app.get('/health', (_,res) => res.json({ status:'ok', app:'SalesSync' }));

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`\n⚡ SalesSync rodando em http://localhost:${PORT}\n`);
});
