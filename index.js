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
app.use(cors());  // aceita qualquer origem — restrinja depois em produção
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
// OAUTH — MAGALU (ATUALIZADO)
// ══════════════════════════════════════════════

// URL para seller conectar conta Magalu
app.get('/auth/magalu', (req, res) => {

  const state = req.query.user_id || '';

  const params = new URLSearchParams({
    response_type: 'code',
    client_id: process.env.MAGALU_CLIENT_ID,
    redirect_uri: process.env.MAGALU_REDIRECT_URI,
    state
  });

  const url =
    'https://id.magalu.com/oauth/authorize?' +
    params.toString();

  console.log('[MAGALU AUTH URL]', url);

  res.redirect(url);

});

// CALLBACK OAuth
app.get('/callback/magalu', async (req, res) => {
  const { code, state } = req.query;

  if (!code) {
    return res.redirect('https://salesync.shop?error=magalu_no_code');
  }

  try {

    // TROCA CODE POR TOKEN
    const { data: tk } = await axios.post(
      'https://id.magalu.com/oauth/token',
      new URLSearchParams({
        grant_type: 'authorization_code',
        client_id: process.env.MAGALU_CLIENT_ID,
        client_secret: process.env.MAGALU_CLIENT_SECRET,
        code,
        redirect_uri: process.env.MAGALU_REDIRECT_URI
      }),
      {
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded'
        }
      }
    );

    console.log('[MAGALU TOKEN]', tk);

    // TENTA PEGAR INFORMAÇÕES DO SELLER
    let sellerId = 'magalu-store';
    let shopName = 'Loja Magalu';

    try {

      const { data: seller } = await axios.get(
        'https://api.magalu.com/seller',
        {
          headers: {
            Authorization: `Bearer ${tk.access_token}`
          }
        }
      );

      sellerId = seller.id || seller.seller_id || 'magalu-store';
      shopName = seller.name || seller.shop_name || 'Loja Magalu';

    } catch (sellerErr) {

      console.log(
        '[MAGALU SELLER]',
        sellerErr.response?.data || sellerErr.message
      );

    }

    // SALVA/ATUALIZA CONTA
    await db.query(`
      INSERT INTO marketplace_accounts (
        user_id,
        platform,
        platform_shop_id,
        shop_name,
        access_token,
        refresh_token,
        token_expires_at,
        mode,
        is_active
      )
      VALUES (
        $1,
        'magalu',
        $2,
        $3,
        $4,
        $5,
        $6,
        'both',
        true
      )
      ON CONFLICT (user_id, platform, platform_shop_id)
      DO UPDATE SET
        access_token = EXCLUDED.access_token,
        refresh_token = EXCLUDED.refresh_token,
        token_expires_at = EXCLUDED.token_expires_at,
        shop_name = EXCLUDED.shop_name,
        is_active = true,
        updated_at = NOW()
    `, [
      state,
      String(sellerId),
      shopName,
      tk.access_token,
      tk.refresh_token,
      new Date(Date.now() + (tk.expires_in || 7200) * 1000)
    ]);

    console.log(`[MAGALU] ✅ ${shopName} conectado`);

    res.redirect('https://salesync.shop?connected=magalu');

  } catch (e) {

    console.error(
      '[MAGALU CALLBACK]',
      e.response?.data || e.message
    );

    res.redirect('https://salesync.shop?error=magalu_failed');
  }
});

// ══════════════════════════════════════════════
// REFRESH TOKEN — MAGALU
// ══════════════════════════════════════════════

async function refreshMagaluToken(account) {

  try {

    const { data } = await axios.post(
      'https://id.magalu.com/oauth/token',
      new URLSearchParams({
        grant_type: 'refresh_token',
        refresh_token: account.refresh_token,
        client_id: process.env.MAGALU_CLIENT_ID,
        client_secret: process.env.MAGALU_CLIENT_SECRET
      }),
      {
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded'
        }
      }
    );

    await db.query(`
      UPDATE marketplace_accounts
      SET
        access_token = $1,
        refresh_token = $2,
        token_expires_at = $3,
        updated_at = NOW()
      WHERE id = $4
    `, [
      data.access_token,
      data.refresh_token,
      new Date(Date.now() + data.expires_in * 1000),
      account.id
    ]);

    console.log('[MAGALU] 🔄 Token renovado');

    return data.access_token;

  } catch (e) {

    console.error(
      '[MAGALU REFRESH]',
      e.response?.data || e.message
    );

    return null;
  }
}

// ══════════════════════════════════════════════
// FETCH PEDIDOS — MAGALU
// ══════════════════════════════════════════════

async function fetchMagalu(acc, since) {

  let token = acc.access_token;

  // VERIFICA EXPIRAÇÃO
  if (
    acc.token_expires_at &&
    new Date(acc.token_expires_at) <= new Date()
  ) {

    console.log('[MAGALU] Token expirado, renovando...');

    token = await refreshMagaluToken(acc);

    if (!token) {
      throw new Error('Não foi possível renovar token Magalu');
    }
  }

  const { data } = await axios.get(
    'https://api.magalu.com/orders',
    {
      params: {
        created_after: since.toISOString(),
        limit: 50
      },
      headers: {
        Authorization: `Bearer ${token}`
      }
    }
  );

  console.log(
    `[MAGALU] ${data.results?.length || 0} pedidos encontrados`
  );

  return (data.results || []).map(o => ({

    platform: 'magalu',

    platform_order_id: String(o.id),

    fulfillment_type:
      o.fulfillment_type === 'magalu'
        ? 'full'
        : 'normal',

    status: o.status || 'paid',

    buyer_name:
      o.customer?.name ||
      o.buyer?.name ||
      'Cliente',

    total_amount:
      Number(o.total || 0),

    platform_fee:
      Number(o.commission || 0),

    shipping_fee:
      Number(o.shipping_cost || 0),

    tax_amount:
      Number((o.total || 0) * 0.06),

    order_date:
      o.created_at || new Date().toISOString()

  }));
}

// ══════════════════════════════════════════════
// WEBHOOK — MAGALU
// ══════════════════════════════════════════════

app.post('/webhooks/magalu', async (req, res) => {

  try {

    console.log(
      '[MAGALU WEBHOOK]',
      JSON.stringify(req.body, null, 2)
    );

    // TODO:
    // atualizar pedido
    // inserir pedido novo
    // atualizar status
    // fila async

    res.sendStatus(200);

  } catch (e) {

    console.error(
      '[MAGALU WEBHOOK ERROR]',
      e.message
    );

    res.sendStatus(500);
  }
});

app.get('/health', (_,res) => res.json({ status:'ok', app:'SalesSync' }));

const PORT = process.env.PORT || 3000;
app.listen(PORT, '0.0.0.0', () => {
  console.log(`⚡ SalesSync rodando na porta ${PORT}`);
});
