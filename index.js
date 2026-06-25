// SalesSync v5.13 — Backend Node.js
// v5.13 | 2026-06-16 | /api/ml/token gera app token (client_credentials) para busca de concorrentes
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
    await ensureProductCostHistorySchema();
    await ensureSalesSyncSchema();
    await ensureOrdersReturnsSchema();
  })
  .catch(e => console.error('❌ Erro DB:', e.message));

const CACHE = {};
const CACHE_TTL = 15 * 60 * 1000;

// CPFs de teste do ambiente Magalu — filtrar fora
const MAGALU_TEST_DOCUMENTS = ['39743407006', '00000000000', '12345678909'];


// v5.16 — Histórico de custos por data
async function ensureProductCostHistorySchema() {
  try {
    // Dropa se user_id for integer (tipo errado)
    await db.query(`
      DO $$ BEGIN
        IF EXISTS (
          SELECT 1 FROM information_schema.columns
          WHERE table_name='product_cost_history' AND column_name='user_id' AND data_type='integer'
        ) THEN DROP TABLE product_cost_history; END IF;
      END $$`);
    await db.query(`
      CREATE TABLE IF NOT EXISTS product_cost_history (
        id          SERIAL PRIMARY KEY,
        user_id     TEXT NOT NULL,
        platform    TEXT NOT NULL DEFAULT 'geral',
        sku         TEXT NOT NULL,
        cost        NUMERIC(12,4) NOT NULL,
        effective_from TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        effective_to   TIMESTAMPTZ,
        created_at  TIMESTAMPTZ DEFAULT NOW()
      )
    `);
    await db.query(`CREATE INDEX IF NOT EXISTS pch_user_plat_sku ON product_cost_history(user_id, platform, sku)`);
    console.log('✅ product_cost_history schema OK');
  } catch(e) { console.error('[CostHistory schema]', e.message); }
}

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

// ═══════════════════════════════════════════════════════════════
// v5.14 | 2026-06-19 | Login interno — acesso direto por chave secreta
// Uso: POST /api/internal/login  { "key": "SUA_INTERNAL_KEY" }
// Retorna JWT igual ao login normal. Protegido por INTERNAL_KEY no env.
// ═══════════════════════════════════════════════════════════════
app.post('/api/internal/login', async (req, res) => {
  try {
    const { key } = req.body;
    const INTERNAL_KEY = process.env.INTERNAL_KEY;
    if (!INTERNAL_KEY) return res.status(503).json({ error: 'Login interno não configurado' });
    if (!key || key !== INTERNAL_KEY) {
      console.warn('[Internal Login] Tentativa com chave inválida — IP:', req.ip);
      return res.status(401).json({ error: 'Chave inválida' });
    }
    // Busca o usuário interno pelo email fixo
    const INTERNAL_EMAIL = process.env.INTERNAL_EMAIL || 'holdinglevelup@gmail.com';
    const { rows } = await db.query(
      `SELECT id, name, email, plan FROM users WHERE email=$1 AND is_active=true LIMIT 1`,
      [INTERNAL_EMAIL]
    );
    if (!rows.length) return res.status(404).json({ error: 'Usuário interno não encontrado' });
    const user = rows[0];
    const token = jwt.sign({ id: user.id, email: user.email }, process.env.JWT_SECRET, { expiresIn: '90d' });
    console.log('[Internal Login] ✅ Acesso interno autenticado para', user.name);
    res.json({ success: true, token, user });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// ── PERFIL ATUAL (atualiza plan sem precisar relogar)
app.get('/api/me', auth, async (req, res) => {
  try {
    const { rows } = await db.query(`SELECT id,name,email,plan FROM users WHERE id=$1`, [req.user.id]);
    if (!rows.length) return res.status(404).json({ error: 'Usuário não encontrado' });
    res.json({ user: rows[0] });
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

// Desconecta conta específica por ID (evita deslogar todas as contas da plataforma)
app.post('/api/accounts/by-id/:id/disconnect', auth, async (req, res) => {
  try {
    await db.query(
      `UPDATE marketplace_accounts SET access_token=NULL,refresh_token=NULL,token_expires_at=NULL,is_active=false,updated_at=NOW() WHERE id=$1 AND user_id=$2`,
      [req.params.id, req.user.id]
    );
    Object.keys(CACHE).forEach(k => { if (k.startsWith(req.user.id)) delete CACHE[k]; });
    res.json({ success: true });
  } catch(e) { res.status(500).json({ error: e.message }); }
});

// Mantém compatibilidade — desconecta todas da plataforma (usado só quando não há ID)
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
    // v5.16 — salva custo anterior no histórico antes de atualizar
    const prev = await db.query(
      `SELECT cost, updated_at FROM products WHERE user_id=$1 AND platform=$2 AND sku=$3`,
      [req.user.id, platform, sku]
    );
    if (prev.rows.length && Number(prev.rows[0].cost) !== cost) {
      const prevCost = Number(prev.rows[0].cost);
      const prevFrom = prev.rows[0].updated_at || new Date();
      // Fecha o período do custo anterior
      await db.query(
        `UPDATE product_cost_history SET effective_to=NOW()
         WHERE user_id=$1 AND platform=$2 AND sku=$3 AND effective_to IS NULL`,
        [req.user.id, platform, sku]
      );
      // Registra custo anterior caso não tenha histórico ainda
      const histCount = await db.query(
        `SELECT COUNT(*) FROM product_cost_history WHERE user_id=$1 AND platform=$2 AND sku=$3`,
        [req.user.id, platform, sku]
      );
      if (Number(histCount.rows[0].count) === 0 && prevCost > 0) {
        await db.query(
          `INSERT INTO product_cost_history (user_id, platform, sku, cost, effective_from, effective_to)
           VALUES ($1,$2,$3,$4,$5,NOW())`,
          [req.user.id, platform, sku, prevCost, prevFrom]
        );
      }
      // Novo custo entra em vigor agora
      await db.query(
        `INSERT INTO product_cost_history (user_id, platform, sku, cost, effective_from)
         VALUES ($1,$2,$3,$4,NOW())`,
        [req.user.id, platform, sku, cost]
      );
    } else if (!prev.rows.length && cost > 0) {
      // Primeiro cadastro
      await db.query(
        `INSERT INTO product_cost_history (user_id, platform, sku, cost, effective_from)
         VALUES ($1,$2,$3,$4,NOW())`,
        [req.user.id, platform, sku, cost]
      );
    }

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
// v5.16 — Histórico de custo por SKU: leitura
app.get('/api/products/:sku/cost-history', auth, async (req, res) => {
  const sku = normSku(req.params.sku);
  const platform = normPlatform(req.query.platform || 'geral');
  try {
    const { rows } = await db.query(
      `SELECT id, cost, effective_from, effective_to
       FROM product_cost_history
       WHERE user_id=$1 AND sku=$2 AND platform=$3
       ORDER BY effective_from ASC`,
      [req.user.id, sku, platform]
    );
    res.json({ success: true, history: rows });
  } catch(e) { res.status(500).json({ error: e.message }); }
});

// v5.16 — Define custo a partir de uma data específica
app.post('/api/products/:sku/cost-history', auth, async (req, res) => {
  const sku = normSku(req.params.sku);
  const platform = normPlatform(req.body.platform || req.query.platform || 'geral');
  const cost = Number(req.body.cost || 0);
  const from = req.body.effective_from; // YYYY-MM-DD
  if (!from) return res.status(400).json({ error: 'effective_from obrigatório' });
  try {
    const fromTs = new Date(from + 'T00:00:00Z');
    // Fecha entradas que sobrepõem esse período
    await db.query(
      `UPDATE product_cost_history SET effective_to=$1
       WHERE user_id=$2 AND sku=$3 AND platform=$4
         AND effective_from <= $1 AND (effective_to IS NULL OR effective_to > $1)`,
      [fromTs.toISOString(), req.user.id, sku, platform]
    );
    // Deleta entradas que começam depois (serão substuídas se necessário)
    await db.query(
      `DELETE FROM product_cost_history
       WHERE user_id=$1 AND sku=$2 AND platform=$3 AND effective_from >= $4`,
      [req.user.id, sku, platform, fromTs.toISOString()]
    );
    // Insere novo registro
    await db.query(
      `INSERT INTO product_cost_history (user_id, platform, sku, cost, effective_from)
       VALUES ($1,$2,$3,$4,$5)`,
      [req.user.id, platform, sku, cost, fromTs.toISOString()]
    );
    // Atualiza custo atual no cadastro se for hoje ou futuro
    if (fromTs <= new Date()) {
      await db.query(
        `INSERT INTO products (user_id, platform, sku, name, cost, is_active)
         VALUES ($1,$2,$3,$3,$4,true)
         ON CONFLICT (user_id, platform, sku) DO UPDATE SET cost=$4, updated_at=NOW()`,
        [req.user.id, platform, sku, cost]
      );
    }
    Object.keys(CACHE).forEach(k => { if (k.startsWith(req.user.id)) delete CACHE[k]; });
    res.json({ success: true });
  } catch(e) { res.status(500).json({ error: e.message }); }
});

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
        params: { created_at__gte: since, _limit: 10, _sort: "created_at:desc" },
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
<div class="section"><h2>JSON de cada pedido (clique para expandir)</h2>
${orders.map((o, i) => {
  const d = o.deliveries?.[0] || {};
  const item = d.items?.[0] || {};
  const info = item.info || {};
  const norm = o.amounts?.normalizer || 100;
  const total = (o.amounts?.total || 0) / norm;
  const commO = (o.amounts?.commission?.total || 0) / norm;
  const commD = (d.amounts?.commission?.total || 0) / (d.amounts?.normalizer || norm);
  const fretO = (o.amounts?.freight?.total || 0) / norm;
  const fretD = (d.amounts?.freight?.total || 0) / (d.amounts?.normalizer || norm);
  const nDel = o.deliveries?.length || 0;
  return `<details style="margin-bottom:8px;background:#0D1117;border:1px solid rgba(255,255,255,.07);border-radius:8px;overflow:hidden">
  <summary style="padding:10px 14px;cursor:pointer;list-style:none;display:flex;align-items:center;gap:10px;font-size:12px">
    <span style="color:#A855F7;font-weight:700">#${i+1}</span>
    <span style="color:#F8FAFC;font-weight:600">${info.name || info.description || '—'}</span>
    <span style="color:#64748B">${o.code || o.id}</span>
    <span style="color:#FBBF24">${o.status} / delivery:${d.status||'?'}</span>
    <span style="color:#38BDF8">R$${total.toFixed(2)}</span>
    <span style="color:#F87171">CommOrder:${commO.toFixed(2)} CommDeliv:${commD.toFixed(2)}</span>
    <span style="color:#34D399">FretOrder:${fretO.toFixed(2)} FretDeliv:${fretD.toFixed(2)}</span>
    <span style="color:#94A3B8">${nDel} entrega(s)</span>
    <span style="color:#64748B">${new Date(o.created_at).toLocaleDateString('pt-BR')}</span>
  </summary>
  <pre style="margin:0;border-radius:0;border-top:1px solid rgba(255,255,255,.06)">${JSON.stringify(o, null, 2)}</pre>
</details>`;
}).join('')}
</div>
</body></html>`;
    res.send(html);
  } catch(e) { res.send(`<pre style="padding:20px;color:red">${e.message}\n${e.stack}</pre>`); }
});

// Diagnóstico: busca pedido específico por código e exibe amounts completo
app.get('/debug/magalu-order', auth, async (req, res) => {
  const code = (req.query.code || '').trim();
  if (!code) return res.send('<pre style="padding:20px;color:orange">Passe ?code=CODIGO_DO_PEDIDO</pre>');
  try {
    const { rows } = await db.query(
      `SELECT * FROM marketplace_accounts WHERE user_id=$1 AND platform='magalu' AND is_active=true AND access_token IS NOT NULL LIMIT 1`,
      [req.user.id]
    );
    if (!rows.length) return res.send('<pre style="padding:20px;color:red">Magalu não conectado</pre>');
    const acc = rows[0];
    const headers = { Authorization: `Bearer ${acc.access_token}` };

    // Tenta buscar pelo código direto
    let order = null;
    try {
      const r = await axios.get(`https://api.magalu.com/seller/v1/orders/${encodeURIComponent(code)}`, { headers, validateStatus: () => true });
      if (r.status === 200) order = r.data;
    } catch(_) {}

    // Se não encontrou, busca na listagem recente pelo code
    if (!order) {
      const r2 = await axios.get('https://api.magalu.com/seller/v1/orders', {
        params: { _limit: 50, _sort: 'created_at:desc' },
        headers, validateStatus: () => true
      });
      order = (r2.data?.results || []).find(o => String(o.code || o.id) === code) || null;
    }

    if (!order) return res.send(`<pre style="padding:20px;color:red">Pedido ${code} não encontrado na Magalu API</pre>`);

    const norm = order.amounts?.normalizer || 100;
    const dNorm = order.deliveries?.[0]?.amounts?.normalizer || norm;
    const d = order.deliveries?.[0] || {};

    // Monta breakdown legível dos amounts
    function fmtAmt(obj, n) {
      if (!obj || typeof obj !== 'object') return String(obj || 0);
      return Object.entries(obj).map(([k,v]) => {
        if (typeof v === 'object' && v !== null) return `${k}: {${fmtAmt(v, n)}}`;
        if (typeof v === 'number') return `${k}: R$${(v/n).toFixed(2)}`;
        return `${k}: ${v}`;
      }).join(' | ');
    }

    const css = `*{box-sizing:border-box;margin:0;padding:0;}body{font-family:'Segoe UI',sans-serif;background:#0D1117;color:#e6edf3;padding:20px;}
h1{color:#A855F7;margin-bottom:16px;}h2{color:#94A3B8;font-size:13px;text-transform:uppercase;letter-spacing:.6px;margin:20px 0 10px;}
pre{background:#0D1117;border:1px solid rgba(255,255,255,.08);border-radius:8px;padding:14px;overflow-x:auto;font-size:11px;color:#38BDF8;line-height:1.6;}
.card{background:#161B26;border:1px solid rgba(255,255,255,.08);border-radius:10px;padding:16px;margin-bottom:14px;}
.row{display:flex;justify-content:space-between;font-size:12px;padding:5px 0;border-bottom:1px solid rgba(255,255,255,.04);}
.l{color:#64748B;}.v{color:#F8FAFC;font-weight:600;}.neg{color:#F87171;}.pos{color:#34D399;}`;

    function amtRow(label, val, n=norm) {
      const r = (val||0)/n;
      const cls = r < 0 ? 'neg' : r > 0 ? 'pos' : 'v';
      return `<div class="row"><span class="l">${label}</span><span class="${cls}">R$ ${r.toFixed(2)}</span></div>`;
    }

    const events = order.amounts?.events || d.amounts?.events || [];

    res.send(`<!DOCTYPE html><html lang="pt-BR"><head><meta charset="UTF-8"/><title>Debug Pedido ${code}</title><style>${css}</style></head><body>
<h1>Pedido ${code}</h1>
<div class="card">
  <h2>Resumo</h2>
  <div class="row"><span class="l">Status pedido</span><span class="v">${order.status}</span></div>
  <div class="row"><span class="l">Status delivery</span><span class="v">${d.status||'—'}</span></div>
  <div class="row"><span class="l">Cliente</span><span class="v">${order.customer?.name||'—'}</span></div>
  <div class="row"><span class="l">Produto</span><span class="v">${d.items?.[0]?.info?.name||'—'}</span></div>
</div>

<div class="card">
  <h2>Amounts — ORDER level (normalizer: ${norm})</h2>
  ${amtRow('total', order.amounts?.total)}
  ${amtRow('commission.total', order.amounts?.commission?.total)}
  ${amtRow('commission.intermediation', order.amounts?.commission?.intermediation)}
  ${amtRow('commission.financial (MDR)', order.amounts?.commission?.financial)}
  ${amtRow('commission.technology', order.amounts?.commission?.technology)}
  ${amtRow('freight.total', order.amounts?.freight?.total)}
  ${amtRow('freight.customer', order.amounts?.freight?.customer)}
  ${amtRow('freight.seller', order.amounts?.freight?.seller)}
  ${amtRow('tax.total', order.amounts?.tax?.total)}
  ${amtRow('discount.total', order.amounts?.discount?.total)}
  ${amtRow('discount.coupon', order.amounts?.discount?.coupon)}
  ${amtRow('discount.promotional', order.amounts?.discount?.promotional)}
  ${amtRow('other.total', order.amounts?.other?.total)}
  ${amtRow('net', order.amounts?.net)}
  ${amtRow('liquid', order.amounts?.liquid)}
  ${amtRow('seller_net', order.amounts?.seller_net)}
  ${amtRow('seller_liquid', order.amounts?.seller_liquid)}
  <h2 style="margin-top:10px">Todos os campos do amounts (order):</h2>
  <pre>${JSON.stringify(order.amounts, null, 2)}</pre>
</div>

<div class="card">
  <h2>Amounts — DELIVERY level (normalizer: ${dNorm})</h2>
  ${amtRow('total', d.amounts?.total, dNorm)}
  ${amtRow('commission.total', d.amounts?.commission?.total, dNorm)}
  ${amtRow('freight.total', d.amounts?.freight?.total, dNorm)}
  ${amtRow('discount.total', d.amounts?.discount?.total, dNorm)}
  ${amtRow('other.total', d.amounts?.other?.total, dNorm)}
  ${amtRow('net', d.amounts?.net, dNorm)}
  ${amtRow('seller_net', d.amounts?.seller_net, dNorm)}
  <h2 style="margin-top:10px">Todos os campos do amounts (delivery):</h2>
  <pre>${JSON.stringify(d.amounts, null, 2)}</pre>
</div>

${events.length ? `<div class="card"><h2>Events (${events.length} entradas)</h2><pre>${JSON.stringify(events, null, 2)}</pre></div>` : ''}

<div class="card"><h2>JSON completo do pedido</h2>
<pre>${JSON.stringify(order, null, 2)}</pre></div>
</body></html>`);
  } catch(e) { res.send(`<pre style="padding:20px;color:red">${e.message}\n${e.stack}</pre>`); }
});


// ── DEBUG SHOPEE ──
app.get('/debug/shopee', auth, async (req, res) => {
  const days = parseInt(req.query.days || '30');
  const css = `*{box-sizing:border-box;margin:0;padding:0;}body{font-family:'Segoe UI',sans-serif;background:#0D1117;color:#e6edf3;padding:20px;}
h1{color:#EE4D2D;margin-bottom:4px;}.sub{color:#64748B;font-size:13px;margin-bottom:20px;}
.section{background:#161B26;border:1px solid rgba(255,255,255,.08);border-radius:10px;padding:16px;margin-bottom:16px;}
.section h2{font-size:13px;color:#94A3B8;text-transform:uppercase;letter-spacing:.6px;margin-bottom:12px;}
pre{background:#0D1117;border-radius:8px;padding:12px;overflow-x:auto;font-size:11px;color:#38BDF8;border:1px solid rgba(255,255,255,.06);}
.row{display:flex;justify-content:space-between;font-size:12px;padding:5px 0;border-bottom:1px solid rgba(255,255,255,.04);}
.l{color:#64748B;}.v{color:#F8FAFC;font-weight:600;}
.ok{color:#10B981;}.err{color:#F43F5E;}.warn{color:#FBBF24;}
.step{background:#1E2535;border-radius:8px;padding:12px;margin-bottom:10px;}
.step h3{font-size:12px;color:#A855F7;margin-bottom:8px;}`;

  const html = (body) => `<!DOCTYPE html><html lang="pt-BR"><head><meta charset="UTF-8"/><title>Debug Shopee</title><style>${css}</style></head><body>${body}</body></html>`;

  try {
    // 1. Busca conta no banco
    const { rows } = await db.query(
      `SELECT * FROM marketplace_accounts WHERE user_id=$1 AND platform='shopee' AND is_active=true LIMIT 1`,
      [req.user.id]
    );
    if (!rows.length) return res.send(html(`<h1>🛑 Shopee não conectada</h1><p style="color:#F43F5E;padding:20px">Nenhuma conta Shopee ativa encontrada no banco para este usuário.</p>`));

    const acc = rows[0];
    const pid  = SHOPEE_PID();
    const key  = SHOPEE_KEY();
    const mode = process.env.SHOPEE_ENV === 'test' ? 'SANDBOX' : 'PRODUÇÃO';

    let steps = `<h1>🛒 Debug Shopee</h1>
<div class="sub">Modo: <strong style="color:${mode==='PRODUÇÃO'?'#10B981':'#FBBF24'}">${mode}</strong> · Base: ${SHOPEE_BASE} · ${new Date().toLocaleString('pt-BR')}</div>

<div class="section"><h2>1. Conta no banco</h2>
<div class="row"><span class="l">DB ID</span><span class="v">${acc.id}</span></div>
<div class="row"><span class="l">platform_shop_id</span><span class="v">${acc.platform_shop_id}</span></div>
<div class="row"><span class="l">shop_name (no banco)</span><span class="v">${acc.shop_name || '<span class="warn">vazio</span>'}</span></div>
<div class="row"><span class="l">access_token</span><span class="v">${acc.access_token ? '✅ presente ('+acc.access_token.slice(0,12)+'...)' : '<span class="err">❌ AUSENTE</span>'}</span></div>
<div class="row"><span class="l">refresh_token</span><span class="v">${acc.refresh_token ? '✅ presente' : '<span class="warn">⚠ ausente</span>'}</span></div>
<div class="row"><span class="l">token_expires_at</span><span class="v">${acc.token_expires_at ? new Date(acc.token_expires_at).toLocaleString('pt-BR') : '—'}</span></div>
<div class="row"><span class="l">Partner ID (env)</span><span class="v">${pid || '<span class="err">❌ SHOPEE_PARTNER_ID não definido</span>'}</span></div>
</div>`;

    // 2. Testa GET /api/v2/shop/get_shop_info
    let token = acc.access_token;
    const shopId = String(acc.platform_shop_id);

    const testEndpoint = async (label, path, extraParams = {}) => {
      const ts   = Math.floor(Date.now() / 1000);
      const sign = shopeeSign(pid, path, ts, key, token, shopId);
      const params = { partner_id: pid, shop_id: shopId, access_token: token, timestamp: ts, sign, ...extraParams };
      try {
        const { data } = await axios.get(`${SHOPEE_BASE}${path}`, { params });
        return { ok: true, label, path, data, params: { ...params, access_token: '***', sign: sign.slice(0,8)+'...' } };
      } catch(e) {
        return { ok: false, label, path, error: e.response?.data || e.message, status: e.response?.status, params: { ...params, access_token: '***', sign: sign.slice(0,8)+'...' } };
      }
    };

    // 2a. Shop info
    const shopInfo = await testEndpoint('GET /api/v2/shop/get_shop_info', '/api/v2/shop/get_shop_info');
    steps += `<div class="section"><h2>2. Shop Info (nome da loja)</h2>
<div class="row"><span class="l">Status</span><span class="v ${shopInfo.ok?'ok':'err'}">${shopInfo.ok ? '✅ OK' : '❌ ERRO '+shopInfo.status}</span></div>`;
    if (shopInfo.ok) {
      const si = shopInfo.data?.response || shopInfo.data || {};
      steps += `<div class="row"><span class="l">shop_name</span><span class="v ok">${si.shop_name || si.name || '—'}</span></div>
<div class="row"><span class="l">shop_id</span><span class="v">${si.shop_id || shopId}</span></div>
<div class="row"><span class="l">status</span><span class="v">${si.status || '—'}</span></div>
<div class="row"><span class="l">region</span><span class="v">${si.region || '—'}</span></div>`;

      // Atualiza nome no banco automaticamente se estiver vazio
      const name = si.shop_name || si.name;
      if (name && (!acc.shop_name || acc.shop_name.startsWith('Shopee Loja'))) {
        await db.query(`UPDATE marketplace_accounts SET shop_name=$1, updated_at=NOW() WHERE id=$2`, [name, acc.id]);
        steps += `<div class="row"><span class="l">✅ Nome atualizado no banco</span><span class="v ok">${name}</span></div>`;
      }
    } else {
      steps += `<pre>${JSON.stringify(shopInfo.error, null, 2)}</pre>`;
    }
    steps += `<details style="margin-top:8px"><summary style="cursor:pointer;color:#64748B;font-size:11px">JSON completo</summary><pre>${JSON.stringify(shopInfo.data||shopInfo.error, null, 2)}</pre></details></div>`;

    // 2b. Order list — testa múltiplas combinações para achar o que funciona
    const nowDebug = Math.floor(Date.now() / 1000);
    const W = 15 * 86400;
    steps += `<div class="section"><h2>3. Order List — diagnóstico completo</h2>`;

    // Testa variações de time_range_field e janelas
    // order_status: 'ALL' é INVÁLIDO na Shopee — omitir o parâmetro retorna todos os status
    const combos = [
      { label: 'create_time · últimos 7 dias',   field: 'create_time', from: nowDebug - 7*86400,  to: nowDebug },
      { label: 'create_time · últimos 15 dias',  field: 'create_time', from: nowDebug - W,         to: nowDebug },
      { label: 'create_time · 15-30 dias atrás', field: 'create_time', from: nowDebug - W*2,       to: nowDebug - W },
      { label: 'create_time · 30-45 dias atrás', field: 'create_time', from: nowDebug - W*3,       to: nowDebug - W*2 },
      { label: 'update_time · últimos 15 dias',  field: 'update_time', from: nowDebug - W,         to: nowDebug },
      { label: 'update_time · 15-30 dias atrás', field: 'update_time', from: nowDebug - W*2,       to: nowDebug - W },
    ];

    let orders = [], firstWindowOk = null;
    for (const c of combos) {
      const r = await testEndpoint(c.label, '/api/v2/order/get_order_list', {
        time_range_field: c.field, time_from: c.from, time_to: c.to, page_size: 10
        // order_status omitido = retorna todos os status
      });
      const list = r.data?.response?.order_list || [];
      // Mostra JSON RAW completo (não só .response) para ver error/message do topo
      const rawFull = JSON.stringify(r.data || r.error || {}, null, 2);
      steps += `<div class="row">
        <span class="l" style="font-size:10px">${c.label}</span>
        <span class="v ${r.ok ? (list.length ? 'ok' : 'warn') : 'err'}" style="font-size:10px">
          ${r.ok ? `${list.length} pedido(s)` : '❌ HTTP '+r.status}
        </span>
      </div>
      <details style="margin-bottom:6px"><summary style="cursor:pointer;color:#475569;font-size:10px;padding:2px 8px">▶ ver JSON completo</summary>
      <pre style="font-size:10px;max-height:200px;overflow:auto">${rawFull}</pre></details>`;
      if (r.ok && list.length && !orders.length) { orders = list; firstWindowOk = r; }
    }

    const more = firstWindowOk?.data?.response?.more;
    if (orders.length) {
        steps += `<div class="row"><span class="l">✅ Primeiro order_sn encontrado</span><span class="v ok">${orders[0].order_sn}</span></div>
<div class="row"><span class="l">Tem mais páginas na janela?</span><span class="v">${more ? 'Sim' : 'Não'}</span></div>`;

        // Pega o primeiro pedido NÃO cancelado para ter dados financeiros reais
        const nonCancelledSn = orders.find(x => !String(x.order_sn).startsWith(''))?.order_sn || orders[0].order_sn;
        // Busca detalhes de todos os order_sn encontrados para achar um não-cancelado
        const allSnsList = [...new Set([...orders.map(x=>x.order_sn)])].slice(0,5).join(',');
        const orderDetailAll = await testEndpoint('GET /api/v2/order/get_order_detail (lote)', '/api/v2/order/get_order_detail', {
          order_sn_list: allSnsList,
          response_optional_fields: 'buyer_username,pay_time,item_list,actual_shipping_fee,actual_shipping_fee_confirmed,commission_fee,service_fee,escrow_amount,buyer_total_amount,payment_method,checkout_shipping_carrier,reverse_shipping_fee'
        });
        const allDetailOrders = orderDetailAll.data?.response?.order_list || [];
        // Prefere pedido COMPLETED ou SHIPPED para ter dados financeiros
        const bestOrder = allDetailOrders.find(x => ['COMPLETED','SHIPPED','TO_CONFIRM_RECEIVE','PROCESSED'].includes(x.order_status))
                       || allDetailOrders.find(x => x.order_status !== 'CANCELLED')
                       || allDetailOrders[0] || {};
        const firstSn = bestOrder.order_sn || orders[0].order_sn;

        steps += `</div><div class="section"><h2>4. Order Detail — pedido: ${firstSn} (${bestOrder.order_status||'?'})</h2>
<div class="row"><span class="l">Status HTTP</span><span class="v ${orderDetailAll.ok?'ok':'err'}">${orderDetailAll.ok ? '✅ OK' : '❌ '+orderDetailAll.status}</span></div>`;
        const o = bestOrder;
        steps += `
<div class="row"><span class="l">order_status</span><span class="v">${o.order_status||'—'}</span></div>
<div class="row"><span class="l">buyer_username</span><span class="v">${o.buyer_username||'—'}</span></div>
<div class="row"><span class="l">buyer_total_amount</span><span class="v ${o.buyer_total_amount!=null?'ok':'warn'}">${o.buyer_total_amount??'❌ ausente'}</span></div>
<div class="row"><span class="l">commission_fee</span><span class="v ${o.commission_fee!=null?'ok':'warn'}">${o.commission_fee??'❌ ausente'}</span></div>
<div class="row"><span class="l">service_fee</span><span class="v ${o.service_fee!=null?'ok':'warn'}">${o.service_fee??'❌ ausente'}</span></div>
<div class="row"><span class="l">actual_shipping_fee</span><span class="v ${o.actual_shipping_fee!=null?'ok':'warn'}">${o.actual_shipping_fee??'❌ ausente'}</span></div>
<div class="row"><span class="l">actual_shipping_fee_confirmed</span><span class="v">${o.actual_shipping_fee_confirmed??'—'}</span></div>
<div class="row"><span class="l">escrow_amount</span><span class="v ${o.escrow_amount!=null?'ok':'warn'}">${o.escrow_amount??'❌ ausente'}</span></div>
<div class="row"><span class="l">reverse_shipping_fee</span><span class="v">${o.reverse_shipping_fee??'—'}</span></div>
<div class="row"><span class="l">item_name</span><span class="v">${o.item_list?.[0]?.item_name||'—'}</span></div>
<div class="row"><span class="l">model_sku</span><span class="v">${o.item_list?.[0]?.model_sku||'—'}</span></div>
<div class="row"><span class="l">image_info.image_url</span><span class="v ok">${o.item_list?.[0]?.image_info?.image_url ? '✅ presente' : '❌ ausente'}</span></div>
<details style="margin-top:8px"><summary style="cursor:pointer;color:#64748B;font-size:11px">JSON completo do pedido</summary><pre>${JSON.stringify(o, null, 2)}</pre></details>`;

        // 4b. Testa v2.payment.get_escrow_detail (dados financeiros reais pós-entrega)
        const escrowDetail = await testEndpoint('GET /api/v2/payment/get_escrow_detail', '/api/v2/payment/get_escrow_detail', {
          order_sn: firstSn
        });
        steps += `</div><div class="section"><h2>4b. Escrow/Payment Detail (${firstSn})</h2>
<div class="row"><span class="l">Status</span><span class="v ${escrowDetail.ok?'ok':'err'}">${escrowDetail.ok ? '✅ OK' : '❌ ERRO '+escrowDetail.status}</span></div>`;
        if (escrowDetail.ok) {
          const ed  = escrowDetail.data?.response || {};
          const oi  = ed.order_income || {};  // campos financeiros ficam em order_income
          const bpi = ed.buyer_payment_info || {};
          const ok  = v => v != null && v !== '' ? 'ok' : 'warn';
          const fmt = v => v != null ? `<span class="v ${ok(v)}">${v}</span>` : `<span class="v warn">❌ ausente</span>`;
          steps += `
<div class="row"><span class="l">buyer_total_amount</span>${fmt(oi.buyer_total_amount ?? bpi.buyer_total_amount)}</div>
<div class="row"><span class="l">actual_shipping_fee</span>${fmt(oi.actual_shipping_fee)}</div>
<div class="row"><span class="l">buyer_paid_shipping_fee</span>${fmt(oi.buyer_paid_shipping_fee)}</div>
<div class="row"><span class="l">commission_fee</span>${fmt(oi.commission_fee)}</div>
<div class="row"><span class="l">service_fee</span>${fmt(oi.service_fee)}</div>
<div class="row"><span class="l">net_commission_fee</span>${fmt(oi.net_commission_fee)}</div>
<div class="row"><span class="l">net_service_fee</span>${fmt(oi.net_service_fee)}</div>
<div class="row"><span class="l">escrow_amount</span>${fmt(oi.escrow_amount)}</div>
<div class="row"><span class="l">voucher_from_shopee</span>${fmt(oi.voucher_from_shopee)}</div>
<div class="row"><span class="l">shopee_shipping_rebate</span>${fmt(oi.shopee_shipping_rebate)}</div>
<details style="margin-top:8px"><summary style="cursor:pointer;color:#64748B;font-size:11px">JSON completo escrow</summary><pre>${JSON.stringify(ed, null, 2)}</pre></details>`;
        } else {
          steps += `<pre>${JSON.stringify(escrowDetail.data||escrowDetail.error, null, 2)}</pre>`;
        }
        steps += `</div>`;
      } else {
        steps += `<div style="color:#FBBF24;padding:8px 0">⚠ Nenhum pedido encontrado nas últimas 3 janelas de 15 dias (45 dias no total).</div>`;
      }
    steps += `</div>`;

    // 3. Parâmetros usados
    steps += `<div class="section"><h2>5. Configuração</h2>
<div class="row"><span class="l">SHOPEE_BASE</span><span class="v">${SHOPEE_BASE}</span></div>
<div class="row"><span class="l">SHOPEE_ENV</span><span class="v">${process.env.SHOPEE_ENV || '(não definido = produção)'}</span></div>
<div class="row"><span class="l">SHOPEE_PARTNER_ID</span><span class="v">${pid}</span></div>
<div class="row"><span class="l">SHOPEE_REDIRECT_URI</span><span class="v">${process.env.SHOPEE_REDIRECT_URI||'—'}</span></div>
<div class="row"><span class="l">shop_id no banco</span><span class="v">${shopId}</span></div>
<div class="row"><span class="l">Token expira</span><span class="v">${acc.token_expires_at ? new Date(acc.token_expires_at).toLocaleString('pt-BR') : '—'}</span></div>
</div>`;

    res.send(html(steps));
  } catch(e) {
    res.send(`<pre style="padding:20px;color:red">${e.message}\n${e.stack}</pre>`);
  }
});

// ── REFRESH TOKEN ML ──
// v5.14 — mutex por account.id evita renovações simultâneas (race condition)
const _mlRefreshLocks = new Map();
async function refreshMLToken(account) {
  const lockKey = String(account.id);
  if (_mlRefreshLocks.has(lockKey)) {
    // Já está renovando — aguarda a renovação em curso e retorna o token atualizado
    await _mlRefreshLocks.get(lockKey);
    const { rows } = await db.query(`SELECT access_token FROM marketplace_accounts WHERE id=$1`, [account.id]);
    return rows[0]?.access_token || null;
  }
  let resolve;
  const lock = new Promise(r => { resolve = r; });
  _mlRefreshLocks.set(lockKey, lock);
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
  } finally {
    resolve();
    _mlRefreshLocks.delete(lockKey);
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

  // Prioridade: custo real do vendedor (senders.cost da API /shipments/{id}/costs) primeiro.
  // payment_shipping_cost = o que o comprador pagou, pode ser subsidiado ou diferente do custo do vendedor.
  const candidates = [
    ['shipment_costs_senders_cost', senderCost],
    ['shipment_costs_endpoint', costsEndpointFee],
    ['shipment_shipping_option', shipmentCost],
    ['payment_shipping_cost', paymentShippingFee],
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

// ── SHOPEE ──
// Render está nos EUA → usar endpoint US (.com.br) em produção.
// Sandbox: sempre .shopee.sg (único domínio sandbox disponível para todos).
// Referência: https://open.shopee.com/documents/v2/v2.getting_started?module=87&type=2
const SHOPEE_BASE = process.env.SHOPEE_ENV === 'test'
  ? 'https://openplatform.sandbox.test-stable.shopee.sg'
  : (process.env.SHOPEE_API_BASE || 'https://openplatform.shopee.com.br');
const SHOPEE_PID  = () => String(process.env.SHOPEE_PARTNER_ID || '');
const SHOPEE_KEY  = () => String(process.env.SHOPEE_PARTNER_KEY || '');

// ── ALERTA DE EXPIRAÇÃO DA KEY SHOPEE ──
(function checkShopeeKeyExpiry() {
  const expiresAt = process.env.SHOPEE_KEY_EXPIRES_AT;
  const mode = process.env.SHOPEE_ENV === 'test' ? 'TEST' : 'PRODUÇÃO';
  if (!expiresAt) {
    console.warn(`[Shopee] ⚠ SHOPEE_KEY_EXPIRES_AT não definido! Configure a data de expiração da key (modo: ${mode}).`);
    return;
  }
  const expDate = new Date(expiresAt);
  const now = new Date();
  const daysLeft = Math.ceil((expDate - now) / 86400000);
  if (daysLeft <= 0) {
    console.error(`[Shopee] ❌ API Key EXPIRADA em ${expDate.toLocaleDateString('pt-BR')} (modo: ${mode})! Renove imediatamente no Shopee Partner Center.`);
  } else if (daysLeft <= 7) {
    console.error(`[Shopee] 🚨 URGENTE: API Key expira em ${daysLeft} dia(s) — ${expDate.toLocaleDateString('pt-BR')} (modo: ${mode})! Renove agora.`);
  } else if (daysLeft <= 30) {
    console.warn(`[Shopee] ⚠ API Key expira em ${daysLeft} dia(s) — ${expDate.toLocaleDateString('pt-BR')} (modo: ${mode}). Renove em breve.`);
  } else {
    console.log(`[Shopee] ✅ API Key OK — expira em ${daysLeft} dia(s) (${expDate.toLocaleDateString('pt-BR')}) · modo: ${mode}`);
  }
})();

// Assinatura Shopee v2:
// - Partner-level (sem shop): pid + path + ts
// - Shop-level (com shop): pid + path + ts + access_token + shop_id
function shopeeSign(pid, path, ts, key, accessToken = '', shopId = '') {
  const base = accessToken && shopId
    ? `${pid}${path}${ts}${accessToken}${shopId}`
    : `${pid}${path}${ts}`;
  return crypto.createHmac('sha256', key).update(base).digest('hex');
}

function shopeeParams(path, acc, extra = {}) {
  const ts      = Math.floor(Date.now() / 1000);
  const pid     = SHOPEE_PID();
  const key     = SHOPEE_KEY();
  const shopId  = String(acc.platform_shop_id);
  const token   = acc.access_token || '';
  const sign    = shopeeSign(pid, path, ts, key, token, shopId);
  return { partner_id: pid, shop_id: shopId, access_token: token, timestamp: ts, sign, ...extra };
}

async function refreshShopeeToken(account) {
  try {
    const ts   = Math.floor(Date.now() / 1000);
    const path = '/api/v2/auth/access_token/get';
    const pid  = SHOPEE_PID();
    const sign = shopeeSign(pid, path, ts, SHOPEE_KEY());
    const { data } = await axios.post(
      `${SHOPEE_BASE}${path}?partner_id=${pid}&timestamp=${ts}&sign=${sign}`,
      { refresh_token: account.refresh_token, partner_id: parseInt(pid), shop_id: parseInt(account.platform_shop_id) },
      { headers: { 'Content-Type': 'application/json' } }
    );
    if (!data.access_token) throw new Error(JSON.stringify(data));
    const expiresAt = new Date(Date.now() + (data.expire_in || 14400) * 1000);
    await db.query(
      `UPDATE marketplace_accounts SET access_token=$1, refresh_token=COALESCE($2,refresh_token), token_expires_at=$3, updated_at=NOW() WHERE id=$4`,
      [data.access_token, data.refresh_token || null, expiresAt, account.id]
    );
    console.log('[Shopee] Token renovado');
    return data.access_token;
  } catch(e) {
    console.error('[Shopee refresh]', e.response?.data || e.message);
    return null;
  }
}

const SHOPEE_STATUS = {
  UNPAID: 'pending', READY_TO_SHIP: 'paid', PROCESSED: 'paid',
  RETRY_SHIP: 'paid', SHIPPED: 'shipped', TO_CONFIRM_RECEIVE: 'shipped',
  COMPLETED: 'delivered', CANCELLED: 'cancelled', IN_CANCEL: 'cancelled', TO_RETURN: 'cancelled',
};

// Detecta erros de token inválido da Shopee e marca conta como desconectada no banco.
// Cobre sandbox→produção, token revogado, partner_id trocado, etc.
const SHOPEE_INVALID_TOKEN_ERRORS = ['invalid_access_token', 'invalid_acceess_token', 'access_denied', 'token_expired', 'invalid_token'];
async function shopeeHandleInvalidToken(account, errData) {
  const errCode = String(errData?.error || errData?.message || errData || '').toLowerCase();
  const isInvalid = SHOPEE_INVALID_TOKEN_ERRORS.some(e => errCode.includes(e));
  if (isInvalid) {
    console.warn(`[Shopee] ⚠ Token inválido para conta ${account.id} (shop ${account.platform_shop_id}) — limpando tokens. Causa: ${errCode}`);
    await db.query(
      `UPDATE marketplace_accounts
       SET access_token=NULL, refresh_token=NULL, token_expires_at=NULL,
           shop_name=COALESCE(NULLIF(shop_name,''),'Shopee (reconectar)'),
           updated_at=NOW()
       WHERE id=$1`,
      [account.id]
    ).catch(e => console.error('[Shopee] Erro ao limpar token:', e.message));
    return true;
  }
  return false;
}

async function fetchShopee(acc, days) {
  // Renova token se necessário
  let token = acc.access_token;
  if (acc.token_expires_at && new Date(acc.token_expires_at) <= new Date(Date.now() + 300000)) {
    token = await refreshShopeeToken(acc);
    if (!token) {
      await shopeeHandleInvalidToken(acc, 'token_expired');
      throw new Error('TOKEN_INVALID:Token Shopee expirado — reconecte a loja');
    }
    acc = { ...acc, access_token: token };
  }

  // Shopee limita get_order_list a janelas de 15 dias por request.
  // Para períodos maiores, divide em blocos de 15 dias e concatena.
  const SHOPEE_WINDOW_DAYS = 15;
  const nowTs    = Math.floor(Date.now() / 1000);
  const sinceTs  = Math.floor((Date.now() - days * 86400000) / 1000);
  const listPath = '/api/v2/order/get_order_list';

  // Helper: faz GET e detecta token inválido automaticamente
  async function shopeeGet(path, extraParams) {
    const params = shopeeParams(path, acc, extraParams);
    try {
      const { data } = await axios.get(`${SHOPEE_BASE}${path}`, { params });
      if (data?.error && SHOPEE_INVALID_TOKEN_ERRORS.some(e => String(data.error).toLowerCase().includes(e))) {
        await shopeeHandleInvalidToken(acc, data);
        throw new Error(`TOKEN_INVALID:${data.message || data.error}`);
      }
      return data;
    } catch(e) {
      if (e.message?.startsWith('TOKEN_INVALID:')) throw e;
      const errData = e.response?.data;
      const invalidated = await shopeeHandleInvalidToken(acc, errData);
      if (invalidated) throw new Error(`TOKEN_INVALID:${errData?.message || 'Token inválido'}`);
      throw e;
    }
  }

  // Gera janelas de 15 dias do mais recente para o mais antigo
  const windows = [];
  let winEnd = nowTs;
  while (winEnd > sinceTs) {
    const winStart = Math.max(sinceTs, winEnd - SHOPEE_WINDOW_DAYS * 86400);
    windows.push({ from: winStart, to: winEnd });
    winEnd = winStart;
  }

  // 1. Busca lista de order_sn em todas as janelas
  const allSns = [];
  const seenSns = new Set();
  for (const win of windows) {
    let cursor = '';
    for (let page = 0; page < 20; page++) {
      const data = await shopeeGet(listPath, {
        time_range_field: 'create_time', time_from: win.from, time_to: win.to,
        page_size: 50, cursor,
        // order_status omitido = retorna TODOS os status (ALL não é valor válido na API Shopee)
      });
      const list = data.response?.order_list || [];
      for (const o of list) {
        if (!seenSns.has(o.order_sn)) { seenSns.add(o.order_sn); allSns.push(o.order_sn); }
      }
      if (!data.response?.more || !list.length) break;
      cursor = data.response.next_cursor || '';
    }
  }
  console.log(`[Shopee] ${allSns.length} order_sn coletados em ${windows.length} janela(s) de ${SHOPEE_WINDOW_DAYS} dias`);

  if (!allSns.length) return [];

  // 2. Busca detalhes dos pedidos em lotes de 50
  const detailPath = '/api/v2/order/get_order_detail';
  const optFields  = [
    'buyer_user_id', 'buyer_username', 'pay_time', 'item_list',
    'recipient_address', 'actual_shipping_fee', 'actual_shipping_fee_confirmed',
    'seller_discount', 'shopee_discount', 'voucher_from_seller', 'voucher_from_shopee',
    'payment_method', 'checkout_shipping_carrier', 'package_list',
    'invoice_data', 'reverse_shipping_fee'
  ].join(',');
  const allOrders  = [];

  for (let i = 0; i < allSns.length; i += 50) {
    const batch = allSns.slice(i, i + 50);
    const data = await shopeeGet(detailPath, {
      order_sn_list: batch.join(','),
      response_optional_fields: optFields,
    });
    allOrders.push(...(data.response?.order_list || []));
  }

  // 3. Busca dados financeiros via get_escrow_detail (único endpoint BR que retorna
  //    commission_fee, service_fee, escrow_amount, buyer_total_amount)
  //    Os campos ficam dentro de data.response.order_income
  const escrowPath = '/api/v2/payment/get_escrow_detail';
  const escrowMap  = {};  // order_sn → order_income

  for (const sn of allSns) {
    try {
      const data = await shopeeGet(escrowPath, { order_sn: sn });
      const oi = data?.response?.order_income;
      if (oi) escrowMap[sn] = oi;
    } catch (e) {
      // TOKEN_INVALID deve propagar; outros erros (pedido sem escrow) ignoramos
      if (e.message?.startsWith('TOKEN_INVALID:')) throw e;
      console.warn(`[Shopee] get_escrow_detail falhou para ${sn}:`, e.message);
    }
  }
  console.log(`[Shopee] escrow obtido para ${Object.keys(escrowMap).length}/${allSns.length} pedidos`);

  return allOrders.map(o => {
    const item      = o.item_list?.[0] || {};
    const status    = SHOPEE_STATUS[o.order_status] || 'paid';
    const oi        = escrowMap[o.order_sn] || {};  // order_income do escrow

    // Imagem: API BR retorna dentro de image_info.image_url (não item_thumbnail)
    const itemImage = item.image_info?.image_url || item.item_thumbnail || null;

    // Data: pay_time é null em cancelados/não pagos — usa create_time como fallback
    const orderTs = o.pay_time || o.create_time || 0;
    const orderDate = new Date(orderTs * 1000).toISOString();

    // Preço catálogo × qtd = valor de venda
    const catalogPrice = parseFloat(item.model_discounted_price ?? item.model_original_price ?? item.item_price ?? 0);
    const qty          = parseInt(item.model_quantity_purchased ?? item.quantity_purchased ?? 1, 10);
    const totalAmount  = catalogPrice * qty;

    // Dados financeiros: vêm do get_escrow_detail (order_income), não do get_order_detail
    // actual_shipping_fee_confirmed é boolean (true/false), não um valor numérico!
    const shippingFee        = parseFloat(oi.actual_shipping_fee ?? o.actual_shipping_fee ?? 0);
    const buyerPaid          = parseFloat(oi.buyer_total_amount ?? 0);
    const commission         = parseFloat(oi.commission_fee ?? 0);
    const serviceFee         = parseFloat(oi.service_fee ?? 0);
    const platformFee        = commission + serviceFee;
    const escrow             = parseFloat(oi.escrow_amount ?? 0);
    const reverseShippingFee = parseFloat(oi.reverse_shipping_fee ?? o.reverse_shipping_fee ?? 0);
    const sellerDiscount     = parseFloat(oi.voucher_from_seller ?? o.seller_discount ?? o.voucher_from_seller ?? 0);
    const shopeeDiscount     = parseFloat(oi.voucher_from_shopee ?? o.shopee_discount ?? o.voucher_from_shopee ?? 0);

    return {
      id:                   o.order_sn,
      platform:             'shopee',
      platform_order_id:    o.order_sn,
      shop_name:            acc.shop_name,
      fulfillment_type:     'normal',
      status,
      buyer_name:           o.buyer_username || '',
      total_amount:         totalAmount,          // preço catálogo × qtd (valor de venda)
      paid_amount:          buyerPaid || totalAmount, // o que o cliente pagou (fallback p/ totalAmount)
      platform_fee:         platformFee,          // commission_fee + service_fee (do escrow)
      shipping_fee:         shippingFee,          // frete real do vendedor (do escrow)
      reverse_shipping_fee: reverseShippingFee,   // frete devolução
      tax_amount:           0,                    // Shopee BR não retém imposto — usuário configura
      discount_amount:      sellerDiscount,
      shopee_discount:      shopeeDiscount,
      shopee_escrow:        escrow,               // valor real depositado na conta (do escrow)
      shopee_commission:    commission,
      shopee_service_fee:   serviceFee,
      quantity:             qty,
      order_date:           orderDate,
      // Produto
      item_title:           item.item_name || 'Produto Shopee',
      item_image:           itemImage,
      item_sku:             item.model_sku || item.item_sku || '',
      item_id:              String(item.item_id || ''),
      model_id:             String(item.model_id || ''),
      model_name:           item.model_name || '',
      // Pagamento / envio
      payment_method:       o.payment_method || '',
      shipping_type:        o.checkout_shipping_carrier || '',
      tracking_url:         '',
      // Peso (útil pra cálculo de frete)
      weight_kg:            parseFloat(item.weight ?? 0),
    };
  });
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

  // Pagina todos os resultados com delay para evitar rate limit
  while (true) {
    const { data } = await axios.get('https://api.magalu.com/seller/v1/orders', {
      params: { created_at__gte: since, _limit: limit, _offset: offset, _sort: "created_at:desc" },
      headers: { Authorization: `Bearer ${token}` }
    });

    const page = data.results || [];
    allOrders.push(...page);

    console.log(`[Magalu] página offset=${offset}: ${page.length} pedidos`);

    if (!data.meta?.links?.next || page.length < limit) break;
    offset += limit;
    if (offset >= 300) break; // máx 300 pedidos por sync para evitar rate limit
    await new Promise(r => setTimeout(r, 1500)); // evita TOO_MANY_REQUESTS
  }

  console.log(`[Magalu] Total: ${allOrders.length} pedidos`);

  const statusMap = {
    new:        'pending',    // aguardando pagamento
    approved:   'paid',       // aprovado / pago
    processing: 'paid',       // em processamento
    invoiced:   'invoiced',   // NF aprovada, aguardando envio (era 'shipped' — errado)
    shipped:    'shipped',    // em rota de entrega
    delivered:  'delivered',  // entregue
    finished:   'delivered',  // finalizado
    cancelled:  'cancelled',  // cancelado
    canceled:   'cancelled',
  };

  const brlFmt = v => 'R$' + Number(v).toFixed(2).replace('.', ',').replace(/\B(?=(\d{3})+(?!\d))/g, '.');

  return allOrders
    // Filtra pedidos de teste da Magalu
    .filter(o => !MAGALU_TEST_DOCUMENTS.includes(o.customer?.document_number))
    .map(o => {
      const delivery = o.deliveries?.[0] || {};
      const item     = delivery.items?.[0] || {};
      const info     = item.info || {};
      const norm     = o.amounts?.normalizer || 100;
      const dNorm    = delivery.amounts?.normalizer || norm;

      // ── Amounts order-level ──
      const paidByCustomer     = (o.amounts?.total             || 0) / norm;
      const uNorm              = item.unit_price?.normalizer || norm;
      const unitPriceCatalog   = (item.unit_price?.value      || 0) / uNorm;
      const qty                = item.quantity || 1;
      // total_amount = preço de venda real (catálogo × qtd), não o valor pago após desconto
      const total              = unitPriceCatalog > 0 ? unitPriceCatalog * qty : paidByCustomer;
      const orderCommission    = (o.amounts?.commission?.total || 0) / norm;
      const orderFreight       = (o.amounts?.freight?.total    || 0) / norm;
      const orderDiscount      = (o.amounts?.discount?.total   || 0) / norm;
      const orderTax           = (o.amounts?.tax?.total        || 0) / norm;

      // ── Amounts delivery-level (mais específico por seller) ──
      const deliveryCommission = (delivery.amounts?.commission?.total || 0) / dNorm;
      const deliveryFreight    = (delivery.amounts?.freight?.total    || 0) / dNorm;
      const deliveryDiscount   = (delivery.amounts?.discount?.total   || 0) / dNorm;

      // Tarifa fixa da plataforma (sempre R$5 — diferença entre order e delivery commission)
      const tarifaFixa = Math.max(0, orderCommission - deliveryCommission);

      // Desconto total aplicado no pedido
      const discount = Math.max(orderDiscount, deliveryDiscount);

      // Base de cálculo da comissão Magalu (o que usam pra calcular o %)
      // Fórmula derivada: delivery_commission / 0.18 (taxa padrão Magalu)
      // Isso captura o subsídio da Magalu em descontos (ex: desconto à vista pago pela Magalu)
      const MAGALU_COMMISSION_RATE = 0.18;
      const commissionBase = deliveryCommission > 0
        ? Math.round(deliveryCommission / MAGALU_COMMISSION_RATE * 100) / 100
        : (total - discount); // fallback se não tem comissão

      // Valor líquido real do vendedor (o que a Magalu deposita na conta)
      // = valor pago pelo cliente - comissão total (inclui tarifa fixa)
      const magaluSellerNet = paidByCustomer - orderCommission;

      // Usa o máximo entre order e delivery (mais conservador)
      const commission = Math.max(orderCommission, deliveryCommission);
      const freight    = Math.max(orderFreight, deliveryFreight);

      // ── Pagamento ──
      const payment       = o.payments?.[0] || {};
      const paymentMethod = payment.method || payment.type || '';
      const paymentBrand  = payment.brand || payment.method_brand || '';
      const installments  = payment.installments || 1;

      // ── Envio ──
      const trackingUrl   = delivery.shipping?.tracking?.url || delivery.shipping?.tracking_url || '';
      const shippedAt     = delivery.shipping?.shipped_at || '';
      const shippingType  = delivery.shipping?.provider?.extras?.shipping_type || '';
      const isFull = delivery.shipping?.provider?.extras?.is_fulfillment === true;

      // ── NF-e ──
      const invoiceKey      = delivery.invoices?.[0]?.key || '';
      const invoiceIssuedAt = delivery.invoices?.[0]?.issued_at || '';

      // ── Status ──
      const deliveryStatus = (delivery.status || '').toLowerCase();
      const orderStatus    = (o.status || '').toLowerCase();
      const resolvedStatus = deliveryStatus || orderStatus;
      const status = statusMap[resolvedStatus] || statusMap[orderStatus] || 'paid';
      const image = info.images?.[0]?.url || null;

      const magaluCostInfo = [
        `Comissão: ${brlFmt(commission)}`,
        `Tarifa: ${brlFmt(tarifaFixa)}`,
        `Frete: ${brlFmt(freight)}`,
        `Desconto total: ${brlFmt(discount)}`,
        `Base comissão: ${brlFmt(commissionBase)}`,
        `Líquido estimado: ${brlFmt(magaluSellerNet)}`,
      ].join(' | ');

      return {
        id:               String(o.code || o.id),
        platform:         'magalu',
        platform_order_id:String(o.code || o.id),
        shop_name:        delivery.seller?.name || acc.shop_name,
        fulfillment_type: isFull ? 'full' : 'normal',
        status,
        delivery_id:      delivery.id || null,
        shipping_id:      delivery.id || null,
        magalu_delivery_id: delivery.id || null,
        magalu_channel:   o.channel || o.sales_channel || delivery.channel || 'MagazineLuiza',
        magalu_label_available: Boolean(delivery.id) && !isFull && !['cancelled','delivered'].includes(status),
        buyer_name:       o.customer?.name || '',
        total_amount:     total,            // preço de catálogo × qtd (valor de venda real)
        paid_amount:      paidByCustomer,  // valor pago pelo cliente (após desconto)
        platform_fee:     commission,      // comissão + tarifa (order level = max)
        shipping_fee:     freight,
        tax_amount:       orderTax,
        discount_amount:  discount,        // desconto total aplicado
        quantity:         qty,
        order_date:       o.created_at || o.purchased_at || new Date().toISOString(),
        item_title:       info.name || info.description || 'Produto Magalu',
        item_image:       image,
        item_sku:         info.sku || '',
        // Pagamento
        payment_method:   paymentMethod,
        payment_brand:    paymentBrand,
        installments,
        // Envio
        tracking_url:     trackingUrl,
        shipped_at:       shippedAt,
        shipping_type:    shippingType,
        // NF-e
        invoice_key:      invoiceKey,
        invoice_issued_at: invoiceIssuedAt,
        // Breakdown financeiro Magalu
        magalu_cost_info:           magaluCostInfo,
        magalu_commission_order:    orderCommission,
        magalu_commission_delivery: deliveryCommission,
        magalu_freight_order:       orderFreight,
        magalu_freight_delivery:    deliveryFreight,
        magalu_tarifa_fixa:         tarifaFixa,
        magalu_discount:            discount,
        magalu_commission_base:     commissionBase,
        magalu_seller_net:          magaluSellerNet,
        magalu_total_retained:      commission + freight,
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

  // v5.16 — histórico de custos: busca todos os registros do usuário
  const { rows: histRows } = await db.query(
    `SELECT sku, COALESCE(platform,'geral') AS platform, cost, effective_from, effective_to
     FROM product_cost_history WHERE user_id=$1 ORDER BY effective_from ASC`,
    [userId]
  );
  // Agrupa por platform:sku
  const costHistory = {};
  histRows.forEach(h => {
    const key = `${normPlatform(h.platform)}:${normSku(h.sku)}`;
    if (!costHistory[key]) costHistory[key] = [];
    costHistory[key].push({ cost: parseFloat(h.cost), from: new Date(h.effective_from), to: h.effective_to ? new Date(h.effective_to) : null });
  });
  function getHistoricalCost(platform, sku, orderDate) {
    const key = `${platform}:${sku}`;
    const hist = costHistory[key] || costHistory[`geral:${sku}`];
    if (!hist || !hist.length) return null;
    const d = new Date(orderDate);
    // Encontra o registro vigente na data do pedido
    const match = hist.find(h => d >= h.from && (h.to === null || d < h.to));
    return match ? match.cost : null;
  }

  const returnRows = await db.query(`SELECT platform, platform_order_id, SUM(return_total_cost) AS return_total_cost FROM marketplace_returns WHERE user_id=$1 GROUP BY platform, platform_order_id`, [userId]);
  const returnMap = {};
  for (const r of returnRows.rows) returnMap[`${normPlatform(r.platform)}:${String(r.platform_order_id||'')}`] = parseFloat(r.return_total_cost || 0);

  return orders.map(o => {
    // v5.15 — Code Software: custo vem direto dos campos Karaka (espalhados via raw_json spread)
    if (o.platform === 'codesoftware') {
      const total_amount = parseFloat(o.total_amount || 0);
      const total_cost   = parseFloat(o.custo_total_venda || 0);
      const platform_fee = parseFloat(o.vr_desconto || 0);
      const shipping_fee = parseFloat(o.vr_frete || 0);
      const profit       = o.status === 'cancelled' ? 0 : total_amount - total_cost - platform_fee - shipping_fee;
      const margin       = total_amount > 0 ? (profit / total_amount * 100) : 0;
      return { ...o, unit_cost: total_cost, total_cost, platform_fee, shipping_fee, tax_amount: 0, profit, margin, tax_pct: 0, fee_pct: null };
    }

    const sku = normSku(o.item_sku);
    const platform = normPlatform(o.platform);
    const product = productMap[`${platform}:${sku}`] || productMap[`geral:${sku}`] || { cost: 0, tax_pct: null, fee_pct: null, shipping_fee: null };
    const defaults = productMap[`${platform}:__DEFAULT__`] || productMap[`geral:__DEFAULT__`] || { tax_pct: null, fee_pct: null, shipping_fee: null };

    // v5.16 — usa custo histórico se disponível para a data do pedido
    const historicalCost = getHistoricalCost(platform, sku, o.order_date);
    const unit_cost = historicalCost !== null ? historicalCost : parseFloat(product.cost || 0);
    // Primeiro tenta o SKU. Se estiver vazio, usa o padrão da plataforma.
    const tax_pct    = product.tax_pct === null || product.tax_pct === undefined ? defaults.tax_pct : product.tax_pct;
    const fee_pct    = product.fee_pct === null || product.fee_pct === undefined ? defaults.fee_pct : product.fee_pct;
    const ship_fixed = product.shipping_fee === null || product.shipping_fee === undefined ? defaults.shipping_fee : product.shipping_fee;
    const total_cost = unit_cost * (o.quantity || 1);
    const total_amount = parseFloat(o.total_amount || 0);
    // Para Magalu: paid_amount = valor NF (o que cliente pagou após desconto).
    // total_amount = preço catálogo (para exibição de faturamento). Imposto é sobre NF.
    const paid_amount = platform === 'magalu'
      ? parseFloat(o.paid_amount || o.total_amount || 0)
      : total_amount;
    const platform_fee = fee_pct === null ? parseFloat(o.platform_fee || 0) : (paid_amount * fee_pct / 100);
    // ML e Magalu: frete vem direto da API (valor real cobrado). Não usa ship_fixed do cadastro.
    const shipping_fee = (platform === 'mercadolivre' || platform === 'magalu')
      ? parseFloat(o.shipping_fee || 0)
      : (ship_fixed === null ? parseFloat(o.shipping_fee || 0) : (parseFloat(ship_fixed || 0) * (o.quantity || 1)));
    // Imposto sobre o valor da NF (paid_amount), não sobre o preço catálogo
    const tax_base = platform === 'magalu' ? paid_amount : total_amount;
    const tax_amount = tax_pct === null ? parseFloat(o.tax_amount || 0) : (tax_base * tax_pct / 100);
    // Para Magalu: usa o líquido real (commission_base - order_commission) que já desconta
    // comissão%, tarifa fixa e subsídios de desconto da Magalu. Para outros: cálculo padrão.
    const magalu_seller_net = o.magalu_seller_net != null ? parseFloat(o.magalu_seller_net) : null;
    const shopee_escrow     = o.shopee_escrow     != null ? parseFloat(o.shopee_escrow)     : null;
    const net_revenue = (platform === 'magalu' && magalu_seller_net !== null)
      ? magalu_seller_net - tax_amount
      : (platform === 'shopee' && shopee_escrow !== null)
        ? shopee_escrow - tax_amount
        : total_amount - platform_fee - shipping_fee - tax_amount;
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
    await db.query(`ALTER TABLE marketplace_returns ADD COLUMN IF NOT EXISTS resolution_type TEXT`);
    await db.query(`ALTER TABLE marketplace_returns ADD COLUMN IF NOT EXISTS ml_protected BOOLEAN NOT NULL DEFAULT FALSE`);
    await db.query(`ALTER TABLE marketplace_returns ADD COLUMN IF NOT EXISTS item_sku TEXT`);
    await db.query(`ALTER TABLE marketplace_returns ADD COLUMN IF NOT EXISTS item_title TEXT`);
    await db.query(`ALTER TABLE marketplace_returns ADD COLUMN IF NOT EXISTS order_date TIMESTAMPTZ`);
    await db.query(`ALTER TABLE marketplace_returns ADD COLUMN IF NOT EXISTS total_amount NUMERIC(14,2) NOT NULL DEFAULT 0`);
    await db.query(`ALTER TABLE marketplace_returns ADD COLUMN IF NOT EXISTS return_category TEXT`);
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
      else if (acc.platform === 'tiktok') orders = await fetchTiktok(acc, days);
      await ssUpsertOrders(userId, acc.id, orders);
      all = all.concat(orders || []);
      await db.query(`UPDATE marketplace_accounts SET last_sync_at=NOW() WHERE id=$1`, [acc.id]);
    } catch(e) {
      const msg = e.message || '';
      if (msg.startsWith('TOKEN_INVALID:')) {
        console.warn(`[orders sync] ${acc.platform} conta ${acc.id}: token inválido, conta marcada para reconexão.`);
      } else {
        console.error('[orders sync]', acc.platform, e.response?.data || msg);
      }
    }
  }
  return all;
}

// Sync rápido: só últimas 48h, sem buscar shipment details pesados.
// Usado pelo auto-refresh do frontend pra detectar pedidos novos sem travar.
async function ssQuickSyncOrdersForUser(userId, platform=null) {
  const accounts = await ssGetAccounts(userId, platform);
  let count = 0;
  for (const acc of accounts) {
    try {
      let orders = [];
      if (acc.platform === 'mercadolivre') {
        let token = acc.access_token;
        if (acc.token_expires_at && new Date(acc.token_expires_at) <= new Date(Date.now() + 5*60*1000)) {
          const nt = await refreshMLToken(acc);
          if (nt) token = nt;
        }
        const since = new Date(Date.now() - 2 * 86400000).toISOString();
        const headers = { Authorization: `Bearer ${token}` };
        const { data } = await axios.get('https://api.mercadolibre.com/orders/search', {
          params: { seller: acc.platform_shop_id, sort: 'date_desc', 'order.date_created.from': since, limit: 50, offset: 0 },
          headers
        });
        const raw = Array.isArray(data.results) ? data.results : [];
        const statusMap = { paid:'paid', payment_required:'pending', pending:'pending', confirmed:'paid', shipped:'shipped', delivered:'delivered', cancelled:'cancelled', invalid:'cancelled' };
        orders = raw.map(o => {
          const item = o.order_items?.[0] || {};
          return {
            id: String(o.id), platform: 'mercadolivre', platform_order_id: String(o.id),
            shipping_id: o.shipping?.id || null, tags: Array.isArray(o.tags) ? o.tags : [],
            shop_name: acc.shop_name, status: statusMap[o.status] || o.status,
            buyer_name: o.buyer?.nickname || '', buyer_id: o.buyer?.id || null,
            seller_id: o.seller?.id || acc.platform_shop_id,
            total_amount: parseFloat(o.total_amount || 0), paid_amount: parseFloat(o.paid_amount || 0),
            platform_fee: (o.order_items||[]).reduce((s,it)=>s+parseFloat(it.sale_fee||0)*parseFloat(it.quantity||1),0),
            shipping_fee: 0, item_title: item?.item?.title || '', item_sku: item?.item?.seller_sku || '',
            item_image: null, quantity: parseFloat(item?.quantity || 1), order_date: o.date_created
          };
        });
      } else if (acc.platform === 'shopee') {
        orders = await fetchShopee(acc, 2);
      } else if (acc.platform === 'magalu') {
        orders = await fetchMagalu(acc, 2);
      } else if (acc.platform === 'tiktok') {
        orders = await fetchTiktok(acc, 2);
      }
      if (orders.length) { await ssUpsertOrders(userId, acc.id, orders); count += orders.length; }
      await db.query(`UPDATE marketplace_accounts SET last_sync_at=NOW() WHERE id=$1`, [acc.id]);
    } catch(e) { console.error('[quick sync]', acc.platform, e.response?.data || e.message); }
  }
  return count;
}

async function ssUpsertReturn(userId, acc, r) {
  const platform = normPlatform(r.platform || acc.platform);
  const externalId = String(r.external_return_id || r.id || r.claim_id || r.ticket_return_id || '').trim();
  if (!externalId) return;
  const mlProtected = r.ml_protected === true;

  // Extrai dados do produto/pedido do raw_json (ML retorna dentro de order_items)
  const raw = r.raw_json || r;
  const firstItem = Array.isArray(raw.order_items) ? raw.order_items[0] : null;
  const itemSku   = r.item_sku   || firstItem?.item?.seller_sku || null;
  const itemTitle = r.item_title || firstItem?.item?.title      || null;
  const orderDate = r.order_date || raw.date_created            || null;
  const totalAmt  = ssNum2(r.total_amount || raw.total_amount   || firstItem?.unit_price || 0);

  const total = mlProtected ? 0 : ssNum2(r.return_shipping_cost)+ssNum2(r.return_fee)+ssNum2(r.refund_adjustment)+ssNum2(r.lost_product_cost);

  await db.query(`INSERT INTO marketplace_returns
    (user_id, platform, account_id, platform_order_id, external_return_id, external_ticket_id, status, reason, type,
     buyer_message, return_tracking_code, return_shipping_cost, return_fee, refund_adjustment, lost_product_cost, return_total_cost,
     resolution_type, ml_protected, item_sku, item_title, order_date, total_amount, raw_json, updated_at)
    VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20,$21,$22,$23,NOW())
    ON CONFLICT (user_id, platform, external_return_id) DO UPDATE SET
      account_id=EXCLUDED.account_id, platform_order_id=COALESCE(EXCLUDED.platform_order_id, marketplace_returns.platform_order_id),
      external_ticket_id=EXCLUDED.external_ticket_id, status=EXCLUDED.status, reason=EXCLUDED.reason, type=EXCLUDED.type,
      buyer_message=EXCLUDED.buyer_message, return_tracking_code=EXCLUDED.return_tracking_code,
      return_shipping_cost=CASE WHEN EXCLUDED.ml_protected THEN 0 ELSE GREATEST(marketplace_returns.return_shipping_cost, EXCLUDED.return_shipping_cost) END,
      return_fee=CASE WHEN EXCLUDED.ml_protected THEN 0 ELSE GREATEST(marketplace_returns.return_fee, EXCLUDED.return_fee) END,
      refund_adjustment=CASE WHEN EXCLUDED.ml_protected THEN 0 ELSE GREATEST(marketplace_returns.refund_adjustment, EXCLUDED.refund_adjustment) END,
      lost_product_cost=CASE WHEN EXCLUDED.ml_protected THEN 0 ELSE GREATEST(marketplace_returns.lost_product_cost, EXCLUDED.lost_product_cost) END,
      return_total_cost=CASE WHEN EXCLUDED.ml_protected THEN 0 ELSE GREATEST(marketplace_returns.return_total_cost, EXCLUDED.return_total_cost) END,
      resolution_type=EXCLUDED.resolution_type, ml_protected=EXCLUDED.ml_protected,
      item_sku=COALESCE(EXCLUDED.item_sku, marketplace_returns.item_sku),
      item_title=COALESCE(EXCLUDED.item_title, marketplace_returns.item_title),
      order_date=COALESCE(EXCLUDED.order_date, marketplace_returns.order_date),
      total_amount=CASE WHEN EXCLUDED.total_amount > 0 THEN EXCLUDED.total_amount ELSE marketplace_returns.total_amount END,
      raw_json=EXCLUDED.raw_json, updated_at=NOW()`,
    [userId, platform, acc.id || null, r.platform_order_id || null, externalId, r.external_ticket_id || null,
     r.status || null, r.reason || null, r.type || 'return',
     r.buyer_message || null, r.return_tracking_code || null,
     ssNum2(r.return_shipping_cost), ssNum2(r.return_fee), ssNum2(r.refund_adjustment), ssNum2(r.lost_product_cost), total,
     r.resolution_type || null, mlProtected,
     itemSku, itemTitle, orderDate || null, totalAmt,
     JSON.stringify(raw)]);
}

// Retroativo: preenche item_sku/title/order_date/total_amount de devoluções já no banco a partir do raw_json
async function ssBackfillReturns(userId) {
  const { rows } = await db.query(
    `SELECT id, raw_json, return_total_cost FROM marketplace_returns WHERE user_id=$1`,
    [userId]
  );
  for (const row of rows) {
    const raw = row.raw_json || {};
    const firstItem = Array.isArray(raw.order_items) ? raw.order_items[0] : null;
    const itemSku   = firstItem?.item?.seller_sku || null;
    const itemTitle = firstItem?.item?.title      || null;
    const orderDate = raw.date_created            || null;
    const totalAmt  = ssNum2(raw.total_amount || firstItem?.unit_price || 0);
    const saleCommission = ssNum2(firstItem?.sale_fee || 0);
    const payments  = Array.isArray(raw.payments) ? raw.payments : [];

    // Recalcula custo real a partir do raw_json se return_total_cost está zerado ou só tem frete do comprador
    let newShipping = null, newFee = null, newTotal = null;
    if (ssNum2(row.return_total_cost) === 0 || ssNum2(row.return_total_cost) === payments.reduce((s,p)=>s+Number(p.shipping_cost||0),0)) {
      const refunded = payments.reduce((s,p) => s + ssNum2(p.transaction_amount_refunded), 0);
      if (refunded > 0 && totalAmt > 0) {
        // custo estimado = refundado ao comprador - comissão devolvida
        const estimatedLoss = refunded - saleCommission;
        const productNet    = totalAmt - saleCommission;
        newShipping = Math.max(0, estimatedLoss - productNet);
        newFee      = saleCommission;
        newTotal    = newShipping + newFee;
      }
    }

    await db.query(
      `UPDATE marketplace_returns SET
        item_sku     = COALESCE(item_sku, $1),
        item_title   = COALESCE(item_title, $2),
        order_date   = COALESCE(order_date, $3::timestamptz),
        total_amount = CASE WHEN total_amount=0 AND $4>0 THEN $4 ELSE total_amount END,
        return_shipping_cost = CASE WHEN $5 IS NOT NULL AND return_total_cost <= 0 THEN $5 ELSE return_shipping_cost END,
        return_fee           = CASE WHEN $6 IS NOT NULL AND return_total_cost <= 0 THEN $6 ELSE return_fee END,
        return_total_cost    = CASE WHEN $7 IS NOT NULL AND return_total_cost <= 0 THEN $7 ELSE return_total_cost END,
        updated_at = NOW()
       WHERE id=$8`,
      [itemSku, itemTitle, orderDate, totalAmt, newShipping, newFee, newTotal, row.id]
    );
  }
  return rows.length;
}

function ssMLIsRealReturnFromOrder(o) {
  // v5.14 — só considera devolução REAL se o item foi entregue primeiro.
  // Cancellations sem 'delivered' tag são apenas cancelamentos normais, não devoluções.
  const tags = Array.isArray(o?.tags) ? o.tags.map(String) : [];
  const payments = Array.isArray(o?.payments) ? o.payments : [];
  const payText = payments.map(p => `${p.status || ''} ${p.status_detail || ''}`).join(' ').toLowerCase();
  const delivered = tags.includes('delivered');
  // 'not_delivered' + retorno = entregador não achou, produto voltou ao vendedor
  const notDeliveredReturn = tags.includes('not_delivered') && tags.includes('returned');
  const refunded = /(refunded|bpp_refunded|bpp_covered)/i.test(payText);
  const cancelledAfterDelivery = String(o?.status || '').toLowerCase() === 'cancelled' && delivered;
  // NUNCA usar charged_back isolado — chargeback acontece em pedidos não entregues também
  return notDeliveredReturn || (delivered && refunded) || cancelledAfterDelivery;
}

// v5.14 — classifica o motivo da devolução nos 3 tipos principais
function ssMLReturnCategory(claim) {
  const reason = String(claim?.reason_id || claim?.reason || '').toUpperCase();
  const tags = Array.isArray(claim?.raw_json?.tags) ? claim.raw_json.tags.map(String) : [];
  const shippingStatus = String(claim?.raw_json?.shipping?.status || '').toLowerCase();

  // Entregador não encontrou o endereço / ninguém em casa
  if (tags.includes('not_delivered') || shippingStatus === 'not_delivered' ||
      reason.includes('NR') || reason.includes('NOT_RECEIVED') || reason.includes('NÃO_ENTREGUE')) {
    return 'nao_entregue';
  }
  // Produto com defeito ou problema após uso
  if (['PDD','DFT','DEFECT','DAMAGED','IT','ITEM_NOT_AS_DESCRIBED'].some(r => reason.includes(r))) {
    return 'defeito';
  }
  // Arrependimento / cliente não quis mais após receber
  return 'arrependimento';
}

// Resolve os custos reais de um claim ML a partir da resolução.
// Retorna { return_shipping_cost, return_fee, refund_adjustment, resolution_type, ml_protected }
function ssResolveMLClaimCosts(claim) {
  const resolution = claim?.resolution || {};
  const resType = String(resolution.type || resolution.resolution_type || '').toLowerCase();
  const reasonField = String(claim?.reason_id || claim?.reason || '').toLowerCase();
  const parties = Array.isArray(resolution.parties) ? resolution.parties : [];

  // ml_protected: ML absorveu o custo — vendedor não perde nada financeiramente.
  // Checar tanto resolution.type quanto reason (bpp_covered vem no reason nas orders/search).
  const protectedTypes = ['seller_protection', 'bpp_covered', 'no_action_required', 'no_action', 'rejected'];
  const mlProtected = protectedTypes.some(t => resType.includes(t) || reasonField.includes(t));

  if (mlProtected) {
    return { return_shipping_cost: 0, return_fee: 0, refund_adjustment: 0, resolution_type: resType || 'seller_protection', ml_protected: true };
  }

  // Monta custos a partir de resolution.parties — cada entry tem { role, type, amount }
  // role: "seller" | "buyer" | "marketplace" | "shipping"
  let returnShippingCost = 0;
  let returnFee = 0;
  let refundAdjustment = 0;

  for (const p of parties) {
    const role = String(p.role || p.type || '').toLowerCase();
    const amount = Number(p.amount || p.value || p.cost || 0);
    if (!amount) continue;

    if (role === 'shipping' || role === 'return_shipping' || /frete|shipping/i.test(role)) {
      returnShippingCost += amount;
    } else if (role === 'seller') {
      // Quando o vendedor é debitado, pode ser taxa ou reembolso ao comprador
      if (/fee|commission|taxa/i.test(String(p.description || p.reason || ''))) {
        returnFee += amount;
      } else {
        refundAdjustment += amount;
      }
    }
  }

  // Fallback: se não tem parties mas tem valor total na resolution, trata como refund_adjustment
  if (!parties.length) {
    const total = Number(resolution.total_amount || resolution.amount || resolution.refund_amount || 0);
    if (total > 0) refundAdjustment = total;
  }

  return { return_shipping_cost: returnShippingCost, return_fee: returnFee, refund_adjustment: refundAdjustment, resolution_type: resType || 'refund', ml_protected: false };
}

async function ssFetchMLReturns(acc, days = 365) {
  const headers = { Authorization: `Bearer ${acc.access_token}` };
  const claimsDomain = 'https://api.mercadolibre.com';
  const since = new Date(Date.now() - Math.min(Math.max(Number(days) || 365, 1), 365) * 86400000).toISOString();

  // Tenta claims API primeiro — mais preciso, já filtra só disputas/devoluções reais.
  try {
    const allClaims = [];
    for (let offset = 0; offset < 500; offset += 50) {
      const { data } = await axios.get(`${claimsDomain}/post-purchase/v1/claims/search`, {
        headers,
        params: { seller_id: acc.platform_shop_id, limit: 50, offset, sort: 'date_created:desc', date_created_from: since }
      });
      const page = data?.data || data?.results || [];
      allClaims.push(...page);
      if (!page.length || page.length < 50) break;
      if (data?.paging?.total && offset + 50 >= Number(data.paging.total)) break;
    }

    if (allClaims.length > 0) {
      console.log(`[ML returns] claims API: ${allClaims.length} claims encontrados`);
      // Busca detalhes de cada claim para pegar resolution e custos reais
      const detailed = await ssMapLimit(allClaims, 5, async (c) => {
        try {
          const { data } = await axios.get(`${claimsDomain}/post-purchase/v1/claims/${c.id}`, { headers });
          return data;
        } catch(e) {
          return c; // fallback: usa dados básicos da lista
        }
      });

      return detailed.map(c => {
        const costs = ssResolveMLClaimCosts(c);
        const category = ssMLReturnCategory({ reason_id: c.reason_id, reason: c.reason, raw_json: c });
        return {
          platform: 'mercadolivre',
          external_return_id: `ml-claim-${c.id}`,
          platform_order_id: String(c.resource_id || c.order_id || ''),
          status: c.status || 'open',
          reason: c.reason_id || c.reason || c.stage || '—',
          type: c.type || 'claim',
          return_category: category,          // v5.14: nao_entregue | arrependimento | defeito
          buyer_message: c.players?.find(p => p.role === 'complainant')?.user?.nickname || null,
          return_tracking_code: c.resolution?.return?.tracking_id || null,
          resolution_type: costs.resolution_type,
          ml_protected: costs.ml_protected,
          return_shipping_cost: costs.return_shipping_cost,
          return_fee: costs.return_fee,
          refund_adjustment: costs.refund_adjustment,
          lost_product_cost: 0,
          raw_json: c
        };
      });
    }
  } catch(e) {
    console.error('[ML returns] claims API status:', e.response?.status, e.response?.data || e.message, '— usando orders/search fallback');
  }

  // Fallback: varre orders/search e detecta devolução por sinais nos pagamentos.
  const out = [];
  try {
    const limit = 50;
    for (let page = 0; page < 20; page++) {
      const offset = page * limit;
      const { data } = await axios.get('https://api.mercadolibre.com/orders/search', {
        headers,
        params: { seller: acc.platform_shop_id, sort: 'date_desc', 'order.date_created.from': since, limit, offset }
      });
      const arr = Array.isArray(data.results) ? data.results : [];
      const toProcess = arr.filter(o => ssMLIsRealReturnFromOrder(o));
      // Busca custos reais de envio para cada devolução em paralelo (max 5 simultâneos)
      const processed = await ssMapLimit(toProcess, 5, async (o) => {
        const payments = Array.isArray(o.payments) ? o.payments : [];
        const reason = payments.map(p => p.status_detail || p.status).filter(Boolean).join(', ');
        const bppCovered = payments.some(p => /bpp_covered/i.test(`${p.status||''} ${p.status_detail||''}`));
        const tags = Array.isArray(o.tags) ? o.tags.map(String) : [];
        const category = tags.includes('not_delivered') ? 'nao_entregue' : 'arrependimento';
        const firstItem = Array.isArray(o.order_items) ? o.order_items[0] : null;
        const saleCommission = Number(firstItem?.sale_fee || 0);

        let returnShippingCost = 0;
        let returnFee = saleCommission; // ML devolve a comissão mas cobra tarifa de envio de volta

        if (!bppCovered) {
          // Busca custos reais do envio via API do ML
          const shipId = o.shipping?.id;
          if (shipId) {
            try {
              const { data: sc } = await axios.get(
                `https://api.mercadolibre.com/shipments/${shipId}/costs`,
                { headers }
              );
              // seller_cost = o que foi cobrado do vendedor pelo frete de devolução
              const sellerCost = Number(sc?.seller_cost || sc?.cost?.seller || 0);
              // buyer_cost = frete pago pelo comprador (não é custo do vendedor)
              const buyCost = Number(sc?.buyer_cost || sc?.cost?.buyer || 0);
              // net_cost = custo líquido para o vendedor
              returnShippingCost = sellerCost > 0 ? sellerCost : Math.max(0, sellerCost - buyCost);
              console.log(`[ML returns] shipment ${shipId} costs: seller=${sellerCost} buyer=${buyCost}`);
            } catch(e) {
              // fallback: usa transaction_amount_refunded − total_amount − commission
              const refunded = payments.reduce((s,p) => s + Number(p.transaction_amount_refunded||0), 0);
              const totalAmt = Number(o.total_amount || 0);
              // net_loss = refunded - commission_returned
              // return_shipping = net_loss − product_net
              const productNet = totalAmt - saleCommission;
              returnShippingCost = Math.max(0, refunded - saleCommission - productNet);
            }
          } else {
            // Sem shipment_id: estima por transaction_amount_refunded
            const refunded = payments.reduce((s,p) => s + Number(p.transaction_amount_refunded||0), 0);
            const totalAmt = Number(o.total_amount || 0);
            returnShippingCost = Math.max(0, refunded - totalAmt);
          }
        }

        return {
          platform: 'mercadolivre',
          external_return_id: `ml-order-${o.id}`,
          platform_order_id: String(o.id || ''),
          status: o.status || 'returned',
          reason: reason || 'Pedido entregue com reembolso',
          type: 'return',
          return_category: category,
          resolution_type: bppCovered ? 'seller_protection' : 'refund',
          ml_protected: bppCovered,
          return_shipping_cost: bppCovered ? 0 : returnShippingCost,
          return_fee: bppCovered ? 0 : returnFee,
          refund_adjustment: 0,
          lost_product_cost: 0,
          raw_json: o
        };
      });
      out.push(...processed);
      if (!arr.length || arr.length < limit) break;
      if (data.paging?.total && offset + limit >= Number(data.paging.total)) break;
    }
  } catch(e) {
    console.error('[ML returns orders/search]', e.response?.status, e.response?.data || e.message);
  }
  return out;
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

// v5.14 — deriva categoria da devolução a partir dos dados já armazenados
function ssDeriveCategoryFromStored(r) {
  const reason = String(r.reason || '').toUpperCase();
  const raw = r.raw_json || {};
  const tags = Array.isArray(raw.tags) ? raw.tags.map(String) : [];
  // Extraindo tags de dentro do claim se vier aninhado
  const orderTags = Array.isArray(raw.raw_json?.tags) ? raw.raw_json.tags.map(String) : tags;

  if (orderTags.includes('not_delivered') || reason.includes('NR') || reason.includes('NOT_RECEIVED'))
    return 'nao_entregue';
  if (['PDD','DFT','DEFECT','DAMAGED','IT','ITEM_NOT_AS_DESCRIBED'].some(k => reason.includes(k)))
    return 'defeito';
  return 'arrependimento';
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
  return rows.map(x=>({
    ...x,
    return_shipping_cost: Number(x.return_shipping_cost||0),
    return_fee:           Number(x.return_fee||0),
    refund_adjustment:    Number(x.refund_adjustment||0),
    lost_product_cost:    Number(x.lost_product_cost||0),
    return_total_cost:    Number(x.return_total_cost||0),
    total_amount:         Number(x.total_amount||0),
    // v5.14 — categoria derivada em tempo real dos dados armazenados
    return_category:      ssDeriveCategoryFromStored(x),
  }));
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

app.put('/api/returns/:id', auth, async (req, res) => {
  try {
    const id = Number(req.params.id);
    const b = req.body;
    const { rows } = await db.query(
      `UPDATE marketplace_returns SET
        item_sku             = COALESCE($1, item_sku),
        item_title           = COALESCE($2, item_title),
        order_date           = COALESCE($3::timestamptz, order_date),
        total_amount         = COALESCE($4, total_amount),
        return_shipping_cost = COALESCE($5, return_shipping_cost),
        return_fee           = COALESCE($6, return_fee),
        refund_adjustment    = COALESCE($7, refund_adjustment),
        lost_product_cost    = COALESCE($8, lost_product_cost),
        return_total_cost    = COALESCE($9, return_total_cost),
        updated_at           = NOW()
       WHERE id=$10 AND user_id=$11 RETURNING *`,
      [
        b.item_sku||null, b.item_title||null, b.order_date||null,
        b.total_amount!=null ? ssNum2(b.total_amount) : null,
        b.return_shipping_cost!=null ? ssNum2(b.return_shipping_cost) : null,
        b.return_fee!=null ? ssNum2(b.return_fee) : null,
        b.refund_adjustment!=null ? ssNum2(b.refund_adjustment) : null,
        b.lost_product_cost!=null ? ssNum2(b.lost_product_cost) : null,
        b.return_total_cost!=null ? ssNum2(b.return_total_cost) : null,
        id, req.user.id
      ]
    );
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
    try { await ssBackfillReturns(req.user.id); } catch(be){ console.error('[backfill returns]', be.message); }
    res.json({ success:true, synced:count, data: await ssLoadReturns(req.user.id, platform) });
  } catch(e){ res.status(500).json({ error:e.message }); }
});

// v5.14 — limpa devoluções antigas e faz re-sync limpo
app.post('/api/returns/reset/:platform', auth, async (req, res) => {
  try {
    const uid = req.user.id;
    const platform = String(req.params.platform || '').toLowerCase();
    // Apaga devoluções antigas desta plataforma para este usuário
    const { rowCount } = await db.query(
      `DELETE FROM marketplace_returns WHERE user_id=$1 AND platform=$2`,
      [uid, platform]
    );
    console.log(`[Returns] 🗑️ Limpou ${rowCount} registros antigos de ${platform} para user ${uid}`);
    // Re-sincroniza com lógica corrigida
    const accounts = await ssGetAccounts(uid, platform);
    let count = 0;
    for (const acc of accounts) {
      const list = platform === 'mercadolivre' ? await ssFetchMLReturns(acc) : platform === 'magalu' ? await ssFetchMagaluReturns(acc) : [];
      for (const r of list) { await ssUpsertReturn(uid, acc, r); count++; }
    }
    try { await ssBackfillReturns(uid); } catch(be){ console.error('[backfill returns reset]', be.message); }
    res.json({ success:true, deleted: rowCount, synced: count, data: await ssLoadReturns(uid, platform) });
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

// Sync rápido: só últimas 48h, resposta em ~1s. Usado pelo auto-refresh do frontend.
app.get('/api/sync/quick', auth, async (req, res) => {
  try {
    const platform = req.query.platform || null;
    const count = await ssQuickSyncOrdersForUser(req.user.id, platform);
    res.json({ success: true, upserted: count });
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
// A Shopee NÃO devolve o state/uid no callback.
// Solução: salvar user_id em tabela temporária (nonce) antes de redirecionar,
// e recuperar pelo shop_id no callback.
async function ensureShopeeNonceTable() {
  await db.query(`
    CREATE TABLE IF NOT EXISTS shopee_oauth_nonce (
      nonce      TEXT PRIMARY KEY,
      user_id    UUID NOT NULL,
      created_at TIMESTAMP NOT NULL DEFAULT NOW()
    )
  `).catch(() => {});
}
ensureShopeeNonceTable();

app.get('/auth/shopee', async (req, res) => {
  const uid = req.query.user_id || '';
  if (!uid) return res.status(400).send('user_id obrigatório');

  // Salva nonce → user_id no banco (expira em 10 min, mas não precisamos limpar imediatamente)
  const nonce = crypto.randomBytes(16).toString('hex');
  await db.query(
    `INSERT INTO shopee_oauth_nonce (nonce, user_id) VALUES ($1, $2)
     ON CONFLICT (nonce) DO UPDATE SET user_id=$2, created_at=NOW()`,
    [nonce, uid]
  ).catch(e => console.error('[Shopee nonce save]', e.message));

  const ts   = Math.floor(Date.now() / 1000);
  const path = '/api/v2/shop/auth_partner';
  const sign = shopeeSign(SHOPEE_PID(), path, ts, SHOPEE_KEY());

  // Embutimos o nonce na redirect_uri como query param — a Shopee preserva o path+query do redirect.
  const baseRedirect = process.env.SHOPEE_REDIRECT_URI || '';
  const redirectUri  = `${baseRedirect}?nonce=${nonce}`;

  const authUrl = `${SHOPEE_BASE}${path}?partner_id=${SHOPEE_PID()}&timestamp=${ts}&sign=${sign}&redirect=${encodeURIComponent(redirectUri)}`;
  console.log('[Shopee Auth] uid:', uid, '| nonce:', nonce);
  res.redirect(authUrl);
});

app.get('/callback/shopee', async (req, res) => {
  const { code, shop_id, nonce } = req.query;
  console.log('[Shopee Callback] code:', code ? 'ok' : 'MISSING', '| shop_id:', shop_id, '| nonce:', nonce || '(vazio)');

  if (!code) return res.redirect('https://salesync.shop?error=shopee_no_code');

  // Recupera user_id pelo nonce
  let uid = '';
  if (nonce) {
    try {
      const { rows } = await db.query(
        `DELETE FROM shopee_oauth_nonce WHERE nonce=$1 AND created_at > NOW() - INTERVAL '10 minutes' RETURNING user_id`,
        [nonce]
      );
      uid = rows[0]?.user_id || '';
      if (!uid) console.warn('[Shopee Callback] nonce expirado ou não encontrado:', nonce);
    } catch(e) { console.error('[Shopee nonce lookup]', e.message); }
  }

  if (!uid) {
    console.error('[Shopee Callback] ❌ user_id não encontrado — nonce inválido/expirado');
    return res.redirect('https://salesync.shop?error=shopee_session_expired');
  }

  try {
    const ts   = Math.floor(Date.now() / 1000);
    const path = '/api/v2/auth/token/get';
    const sign = shopeeSign(SHOPEE_PID(), path, ts, SHOPEE_KEY());
    const { data: tk } = await axios.post(
      `${SHOPEE_BASE}${path}?partner_id=${SHOPEE_PID()}&timestamp=${ts}&sign=${sign}`,
      { code, partner_id: parseInt(process.env.SHOPEE_PARTNER_ID), shop_id: parseInt(shop_id) },
      { headers: { 'Content-Type': 'application/json' } }
    );

    if (!tk.access_token) throw new Error(JSON.stringify(tk));

    // Busca nome real da loja
    let shopName = `Shopee Loja ${shop_id}`;
    try {
      const ts2   = Math.floor(Date.now() / 1000);
      const spath = '/api/v2/shop/get_shop_info';
      const ssign = shopeeSign(SHOPEE_PID(), spath, ts2, SHOPEE_KEY(), tk.access_token, String(shop_id));
      const { data: si } = await axios.get(`${SHOPEE_BASE}${spath}`, {
        params: { partner_id: SHOPEE_PID(), shop_id: String(shop_id), access_token: tk.access_token, timestamp: ts2, sign: ssign }
      });
      shopName = si?.response?.shop_name || si?.shop_name || shopName;
    } catch(e) { console.warn('[Shopee] shop_info falhou, usando nome padrão:', e.message); }

    await db.query(`
      INSERT INTO marketplace_accounts (user_id,platform,platform_shop_id,shop_name,access_token,refresh_token,token_expires_at,mode,is_active)
      VALUES ($1,'shopee',$2,$3,$4,$5,$6,'normal',true)
      ON CONFLICT (user_id,platform,platform_shop_id) DO UPDATE SET
        access_token=EXCLUDED.access_token, refresh_token=EXCLUDED.refresh_token,
        token_expires_at=EXCLUDED.token_expires_at, shop_name=EXCLUDED.shop_name,
        is_active=true, updated_at=NOW()`,
      [uid, String(shop_id), shopName, tk.access_token, tk.refresh_token,
       new Date(Date.now() + (tk.expire_in || 14400) * 1000)]
    );

    console.log(`[Shopee] ✅ Conta conectada: ${shopName} (shop_id ${shop_id}) → user ${uid}`);
    res.redirect('https://salesync.shop?connected=shopee');
  } catch(e) {
    console.error('[Shopee callback]', e.response?.data || e.message);
    res.redirect('https://salesync.shop?error=shopee_failed');
  }
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

// ── Busca dados fiscais do comprador no ML (CPF/CNPJ para emissão de NF) ──
// Debug: testa vários endpoints ML para achar custos de devolução
app.get('/api/ml/return-costs-debug/:orderId', auth, async (req, res) => {
  try {
    const { orderId } = req.params;
    const { rows } = await db.query(
      `SELECT access_token, platform_shop_id FROM marketplace_accounts
       WHERE user_id=$1 AND platform='mercadolivre' AND is_active=true LIMIT 1`,
      [req.user.id]
    );
    if (!rows.length) return res.status(404).json({ error: 'ML não conectado' });
    const token = rows[0].access_token;
    const h = { Authorization: `Bearer ${token}` };
    const results = {};

    // 1. Order completo
    try { const { data } = await axios.get(`https://api.mercadolibre.com/orders/${orderId}`, { headers: h }); results.order_shipping_id = data?.shipping?.id; results.order_payments = data?.payments?.map(p=>({status:p.status,status_detail:p.status_detail,transaction_amount:p.transaction_amount,total_paid_amount:p.total_paid_amount,transaction_amount_refunded:p.transaction_amount_refunded,shipping_cost:p.shipping_cost})); } catch(e) { results.order_error = e.response?.data || e.message; }

    // 2. Collections (dados financeiros)
    try { const { data } = await axios.get(`https://api.mercadolibre.com/collections/orders/${orderId}`, { headers: h }); results.collections = data; } catch(e) { results.collections_error = e.response?.data || e.message; }

    // 3. Shipment completo
    const shipId = results.order_shipping_id || req.query.ship_id;
    if (shipId) {
      try { const { data } = await axios.get(`https://api.mercadolibre.com/shipments/${shipId}`, { headers: h }); results.shipment = { base_cost: data.base_cost, cost: data.cost, charges: data.charges, shipping_items: data.shipping_items, mode: data.mode, sender_cost: data.sender?.cost, receiver_cost: data.receiver?.cost }; } catch(e) { results.shipment_error = e.response?.data || e.message; }
      // 4. Shipment costs
      try { const { data } = await axios.get(`https://api.mercadolibre.com/shipments/${shipId}/costs`, { headers: h }); results.shipment_costs = data; } catch(e) { results.shipment_costs_error = e.response?.data || e.message; }
    }

    // 5. Account movements (movimentações financeiras do vendedor)
    try { const { data } = await axios.get(`https://api.mercadolibre.com/users/${rows[0].platform_shop_id}/mercadopago/account/movements?limit=5`, { headers: h }); results.movements_sample = data; } catch(e) { results.movements_error = e.response?.data || e.message; }

    // 6. Order completo raw (procura return_details, mediations, refunds)
    try { const { data } = await axios.get(`https://api.mercadolibre.com/orders/${orderId}?include=returns`, { headers: h }); results.order_full_keys = Object.keys(data); results.order_return_details = data.return_details || data.returns || data.mediations || null; } catch(e) { results.order_full_error = e.response?.data || e.message; }

    // 7. Merchant orders search — tem dados financeiros detalhados
    try { const { data } = await axios.get(`https://api.mercadolibre.com/merchant_orders/search?order_id=${orderId}`, { headers: h }); results.merchant_order = data?.elements?.[0] || data; } catch(e) { results.merchant_order_error = e.response?.data || e.message; }

    // 8. Shipment returns — se o envio gerou um retorno físico
    const shipId2 = results.order_shipping_id;
    if (shipId2) {
      try { const { data } = await axios.get(`https://api.mercadolibre.com/shipments/${shipId2}/returns`, { headers: h }); results.shipment_returns = data; } catch(e) { results.shipment_returns_error = e.response?.data || e.message; }
    }

    // 9. Movimentações com range de datas (junho 2026)
    try {
      const uid = rows[0].platform_shop_id;
      const { data } = await axios.get(
        `https://api.mercadolibre.com/users/${uid}/mercadopago/account/movements?search_type=collection&begin_date=2026-06-01T00:00:00.000Z&end_date=2026-06-30T23:59:59.000Z&limit=50`,
        { headers: h }
      );
      // Filtra movimentações relacionadas ao pedido
      const all = data?.results || data?.movements || (Array.isArray(data) ? data : []);
      results.movements_june = all.filter(m => JSON.stringify(m).includes(orderId));
      results.movements_june_count = all.length;
    } catch(e) { results.movements_june_error = e.response?.data || e.message; }

    // 10. Mediation/Claim — busca detalhes da devolução via mediations array
    const mediationId = Array.isArray(results.order_return_details) && results.order_return_details[0]?.id;
    if (mediationId) {
      results.mediation_id = mediationId;
      // Tenta claim via post-purchase API
      try { const { data } = await axios.get(`https://api.mercadolibre.com/post-purchase/v1/claims/${mediationId}`, { headers: h }); results.claim_v1 = data; } catch(e) { results.claim_v1_error = e.response?.data || e.message; }
      // Tenta mediations direto
      try { const { data } = await axios.get(`https://api.mercadolibre.com/mediations/${mediationId}`, { headers: h }); results.mediation = data; } catch(e) { results.mediation_error = e.response?.data || e.message; }
      // Tenta claims
      try { const { data } = await axios.get(`https://api.mercadolibre.com/claims/${mediationId}`, { headers: h }); results.claim = data; } catch(e) { results.claim_error = e.response?.data || e.message; }
      // Resolver (custos de resolução)
      try { const { data } = await axios.get(`https://api.mercadolibre.com/post-purchase/v1/claims/${mediationId}/resolutions`, { headers: h }); results.claim_resolutions = data; } catch(e) { results.claim_resolutions_error = e.response?.data || e.message; }
      // Return vinculado ao claim
      try { const { data } = await axios.get(`https://api.mercadolibre.com/post-purchase/v1/claims/${mediationId}/return`, { headers: h }); results.claim_return = data; } catch(e) { results.claim_return_error = e.response?.data || e.message; }
      // Returns por claim_id
      try { const { data } = await axios.get(`https://api.mercadolibre.com/post-purchase/v1/returns?claim_id=${mediationId}`, { headers: h }); results.returns_by_claim = data; } catch(e) { results.returns_by_claim_error = e.response?.data || e.message; }
      // Returns por order_id
      try { const { data } = await axios.get(`https://api.mercadolibre.com/post-purchase/v1/returns?order_id=${orderId}`, { headers: h }); results.returns_by_order = data; } catch(e) { results.returns_by_order_error = e.response?.data || e.message; }
      // Return com ID do claim diretamente
      try { const { data } = await axios.get(`https://api.mercadolibre.com/post-purchase/v1/returns/${mediationId}`, { headers: h }); results.return_direct = data; } catch(e) { results.return_direct_error = e.response?.data || e.message; }
      // Claim com todos atributos
      try { const { data } = await axios.get(`https://api.mercadolibre.com/post-purchase/v1/claims/${mediationId}?attributes=ALL`, { headers: h }); results.claim_full = data; } catch(e) { results.claim_full_error = e.response?.data || e.message; }
    }
    // Todos shipments associados ao pedido (inclui shipment de devolução)
    try { const { data } = await axios.get(`https://api.mercadolibre.com/shipments/search?order_id=${orderId}&seller_id=${rows[0].platform_shop_id}`, { headers: h }); results.all_shipments = data; } catch(e) { results.all_shipments_error = e.response?.data || e.message; }
    // Shipments via orders (endpoint alternativo)
    try { const { data } = await axios.get(`https://api.mercadolibre.com/orders/${orderId}/shipments`, { headers: h }); results.order_shipments = data; } catch(e) { results.order_shipments_error = e.response?.data || e.message; }

    res.json(results);
  } catch(e) { res.status(500).json({ error: e.message }); }
});

// GET /orders/{id}/billing_info — só disponível com token do vendedor
app.get('/api/ml/billing/:orderId', auth, async (req, res) => {
  try {
    const { orderId } = req.params;
    const { rows } = await db.query(
      `SELECT access_token, token_expires_at, refresh_token FROM marketplace_accounts
       WHERE user_id=$1 AND platform='mercadolivre' AND is_active=true LIMIT 1`,
      [req.user.id]
    );
    if (!rows.length) return res.status(404).json({ error: 'ML não conectado' });
    let token = rows[0].access_token;
    // Renova token se necessário
    if (rows[0].token_expires_at && new Date(rows[0].token_expires_at) <= new Date(Date.now() + 300000)) {
      try {
        const rr = await axios.post('https://api.mercadolibre.com/oauth/token', null, {
          params: { grant_type:'refresh_token', client_id: process.env.ML_APP_ID, client_secret: process.env.ML_SECRET, refresh_token: rows[0].refresh_token }
        });
        token = rr.data.access_token;
        await db.query(`UPDATE marketplace_accounts SET access_token=$1, token_expires_at=$2 WHERE user_id=$3 AND platform='mercadolivre'`,
          [token, new Date(Date.now() + rr.data.expires_in * 1000), req.user.id]);
      } catch(e) { /* usa token atual */ }
    }

    // Chama billing_info do ML
    const { data } = await axios.get(
      `https://api.mercadolibre.com/orders/${orderId}/billing_info`,
      { headers: { Authorization: `Bearer ${token}` } }
    );

    // Extrai CPF/CNPJ do comprador
    const billing = data?.buyer?.billing_info || data?.billing_info || {};
    const doc = billing.doc_number || billing.cpf || billing.cnpj || null;
    const docType = billing.doc_type || (doc?.length > 11 ? 'CNPJ' : 'CPF');
    const buyerName = data?.buyer?.full_name || data?.buyer?.first_name
      ? `${data?.buyer?.first_name||''} ${data?.buyer?.last_name||''}`.trim()
      : null;

    // Endereço para NF
    const addr = data?.buyer?.billing_info?.address || data?.buyer?.address || {};

    res.json({
      ok: true,
      doc,
      doc_type: docType,
      buyer_name: buyerName,
      address: {
        street:       addr.street_name || '',
        number:       addr.street_number || '',
        complement:   addr.complement || '',
        neighborhood: addr.neighborhood?.name || addr.neighborhood || '',
        city:         addr.city?.name || addr.city || '',
        state:        addr.state?.id || addr.state || '',
        zip:          addr.zip_code || '',
      },
      raw: data,
    });
  } catch(e) {
    const status = e.response?.status || 500;
    const msg    = e.response?.data?.message || e.message;
    // 403 = ML bloqueou acesso ao CPF (política de privacidade, precisa de aprovação)
    if (status === 403) {
      return res.status(403).json({
        ok: false,
        error: 'ML_PRIVACY',
        message: 'Mercado Livre restringiu acesso ao CPF deste comprador. Isso ocorre em vendas via catálogo ou quando a conta não tem permissão billing. O comprador precisa ter feito a venda diretamente (não via catálogo).',
      });
    }
    res.status(status).json({ ok: false, error: msg, raw: e.response?.data });
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
  const nfKey = nfe.key || d.invoices?.[0]?.key || '';
  const cnpjFromKey = nfKey.length >= 20 ? nfKey.slice(6, 20) : '';
  const emitName = nfe.emitName || '';
  const emitCnpj = nfe.emitCnpj || cnpjFromKey;
  const emitIe = nfe.emitIe || '';
  const emitUf = nfe.emitUf || da.state || '';
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
    emitName: nfe.emitName || '',
    emitCnpj: nfe.emitCnpj || (key.length >= 20 ? key.slice(6, 20) : ''),
    emitIe: nfe.emitIe || '',
    emitUf: nfe.emitUf || da.state || '',
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

  const line = Math.min(20 * scale, 26);
  const labelW = Math.min(90 * scale, w * 0.32);
  const valX = x + pad + labelW;
  const ufX = x + w - 44 * scale;
  // 7 kv rows + 1 extra gap; anchor from bottom so text never overflows "DANFE SIMPLIFICADO"
  const numKvRows = 7;
  let yy = y + h - 44 * scale - numKvRows * line - 10 * scale;

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
// v5.16 — usa paid_amount (valor real pago pelo cliente) como faturamento
function ssOrderAmount(o) { return ssNum(o.paid_amount ?? o.total_amount ?? o.amount ?? o.total ?? 0); }
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


/* Endpoint para a IA: lista TODOS os rendimentos ativos sem filtro de mês */
app.get('/api/additional-revenues/all', auth, async (req, res) => {
  try {
    const { rows } = await db.query(
      `SELECT id, name, amount, recurring, starts_at, created_at
       FROM additional_revenues
       WHERE user_id=$1 AND is_active=true
       ORDER BY created_at DESC, id DESC`,
      [req.user.id]
    );
    const items = (rows || []).map(r => ({
      ...r,
      amount: parseFloat(r.amount || 0),
      recurring: !!r.recurring
    }));
    res.json({ items });
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

app.patch('/api/additional-revenues/:id', auth, async (req, res) => {
  try {
    const id = Number(req.params.id);
    if (!Number.isFinite(id)) return res.status(400).json({ error: 'ID inválido' });
    const name = req.body.name ? String(req.body.name).trim() : null;
    const amount = req.body.amount != null ? Math.max(0, Number(String(req.body.amount).replace(',', '.')) || 0) : null;
    const recurring = req.body.recurring != null ? Boolean(req.body.recurring) : null;
    const starts_at = req.body.starts_at ? String(req.body.starts_at) : null;
    const sets = [], vals = [id, req.user.id];
    if (name) { sets.push(`name=$${vals.length+1}`); vals.push(name); }
    if (amount != null) { sets.push(`amount=$${vals.length+1}`); vals.push(amount); }
    if (recurring != null) { sets.push(`recurring=$${vals.length+1}`); vals.push(recurring); }
    if (starts_at) { sets.push(`starts_at=$${vals.length+1}`); vals.push(starts_at); }
    if (!sets.length) return res.status(400).json({ error: 'Nenhum campo para atualizar' });
    sets.push(`updated_at=NOW()`);
    const { rows } = await db.query(
      `UPDATE additional_revenues SET ${sets.join(',')} WHERE id=$1 AND user_id=$2 AND is_active=true RETURNING id, name, amount, recurring, starts_at`,
      vals
    );
    Object.keys(CACHE).forEach(k => { if (k.startsWith(req.user.id)) delete CACHE[k]; });
    if (!rows.length) return res.status(404).json({ error: 'Rendimento não encontrado' });
    res.json({ success: true, item: rows[0] });
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

    let token = acc.access_token;
    if (acc.token_expires_at && new Date(acc.token_expires_at) <= new Date(Date.now() + 5*60*1000)) {
      const nt = await refreshMLToken(acc);
      if (nt) token = nt;
    }

    const headers = { Authorization: `Bearer ${token}` };
    const since = new Date(Date.now() - days * 86400000).toISOString();

    // Tenta primeiro o endpoint de claims/post-purchase que retorna só pedidos com disputa/devolução real.
    // Muito mais rápido e preciso que varrer orders/search inteiro.
    let claimsOk = false;
    let claimsList = [];
    try {
      const claimsRes = await axios.get('https://api.mercadolibre.com/post-purchase/v1/claims/search', {
        headers,
        params: { seller_id: acc.platform_shop_id, limit: 50, sort: 'date_created:desc' }
      });
      const raw = claimsRes.data?.data || claimsRes.data?.results || [];
      if (Array.isArray(raw)) {
        claimsList = raw;
        claimsOk = true;
      }
    } catch(e) {
      console.log('[debug/returns] claims endpoint status:', e.response?.status, '— fallback para orders/search');
    }

    let devolucoes_reais = [];
    let suspeitas = [];
    let total_pedidos_consultados = 0;

    if (claimsOk && claimsList.length >= 0) {
      // Mapeia claims do ML para o formato esperado pelo frontend
      devolucoes_reais = claimsList.map(c => {
        const payments = Array.isArray(c.resolution?.parties) ? [] : [];
        return {
          id: String(c.id || c.claim_id),
          platform_order_id: String(c.resource_id || c.order_id || ''),
          status: c.status || 'unknown',
          status_detail: c.stage || null,
          tags: [],
          date_created: c.date_created,
          date_closed: c.date_last_updated || null,
          total_amount: Number(c.resolution?.amount || 0),
          paid_amount: Number(c.resolution?.amount || 0),
          payments,
          delivered: false,
          refunded: true,
          real_return: true,
          claim_type: c.type || 'claim',
          claim_reason: c.reason_id || c.reason || c.stage || '—',
          item_title: c.item?.title || c.items?.[0]?.title || '—',
          buyer: { nickname: c.players?.find(p=>p.role==='complainant')?.user_id || '—' },
          suspect_signal: false
        };
      });
      total_pedidos_consultados = claimsList.length;
    } else {
      // Fallback: varre orders/search e filtra localmente (lento mas funcional)
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
      total_pedidos_consultados = unique.length;
      const mapOrder = o => {
        const tags = Array.isArray(o.tags) ? o.tags : [];
        const payments = Array.isArray(o.payments) ? o.payments : [];
        const delivered = tags.includes('delivered');
        const notDelivered = tags.includes('not_delivered');
        const refunded = payments.some(p => /refunded|charged_back|chargeback|reimbursed|bpp_refunded|bpp_covered/i.test(`${p.status||''} ${p.status_detail||''}`));
        const real_return = ssMLIsRealReturnFromOrder(o);
        return {
          id:String(o.id), platform_order_id:String(o.id), status:o.status, status_detail:o.status_detail || null,
          tags, shipping_id:o.shipping?.id || null, date_created:o.date_created, date_closed:o.date_closed || null,
          total_amount:Number(o.total_amount || 0), paid_amount:Number(o.paid_amount || 0),
          payments:payments.map(p => ({ id:p.id, status:p.status, status_detail:p.status_detail, total_paid_amount:p.total_paid_amount, shipping_cost:p.shipping_cost })),
          delivered, not_delivered:notDelivered, refunded, real_return,
          suspect_signal:notDelivered || refunded || String(o.status).toLowerCase()==='cancelled'
        };
      };
      const signals = unique.map(mapOrder);
      devolucoes_reais = signals.filter(x => x.real_return);
      suspeitas = signals.filter(x => x.suspect_signal && !x.real_return);
    }

    res.json({
      success:true,
      source: claimsOk ? 'claims_api' : 'orders_search_fallback',
      account:{ shop_name:acc.shop_name, seller_id:acc.platform_shop_id },
      periodo:{ days, from:since, to:new Date().toISOString() },
      total_pedidos_consultados,
      total_devolucoes_reais:devolucoes_reais.length,
      total_sinais_suspeitos:suspeitas.length,
      devolucoes:devolucoes_reais,
      suspeitos:suspeitas.slice(0,200),
      observacao:'Devolução real = claims/disputas abertas no ML (via post-purchase API), ou entregue + reembolso/chargeback nos pedidos.'
    });
  } catch(e) {
    res.status(500).json({ success:false, error:e.response?.data || e.message });
  }
}

app.get('/debug/returns', auth, ssDebugReturnsHandler);
app.get('/api/debug/returns', auth, ssDebugReturnsHandler);

app.get('/health', (_, res) => res.json({ status:'ok', app:'SalesSync', version:'5.0' }));

// ── AI ASSISTANT ──
async function ssGetAiContext(userId) {
  try {
    const hoje = new Date();
    const inicioMes = new Date(hoje.getFullYear(), hoje.getMonth(), 1).toISOString();
    const inicio30 = new Date(Date.now() - 30 * 86400000).toISOString();
    const inicio90 = new Date(Date.now() - 90 * 86400000).toISOString();

    const [ordersRes, returnsRes, productsRes, mesPassadoRes, goalRes] = await Promise.all([
      // Pedidos dos últimos 90 dias com JOIN nos custos de produto
      db.query(`
        SELECT
          o.platform, o.platform_order_id, o.status, o.shop_name,
          o.total_amount, o.paid_amount, o.platform_fee, o.shipping_fee, o.tax_amount,
          o.item_title, o.item_sku, o.order_date, o.quantity, o.fulfillment_type,
          COALESCE(p.cost, 0) AS product_cost,
          COALESCE(p.cost, 0) * o.quantity AS total_product_cost,
          ROUND(
            o.total_amount
            - o.platform_fee
            - o.shipping_fee
            - o.tax_amount
            - COALESCE(p.cost, 0) * o.quantity
          , 2) AS lucro_real
        FROM marketplace_orders o
        LEFT JOIN products p
          ON p.user_id = o.user_id
          AND LOWER(TRIM(p.sku)) = LOWER(TRIM(o.item_sku))
          AND (LOWER(p.platform) = LOWER(o.platform) OR LOWER(p.platform) = 'geral')
        WHERE o.user_id = $1
          AND o.order_date >= $2
        ORDER BY o.order_date DESC
        LIMIT 1000`, [userId, inicio90]),

      // Devoluções dos últimos 90 dias
      db.query(`
        SELECT platform, resolution_type, ml_protected, return_shipping_cost,
               return_fee, lost_product_cost, return_total_cost, reason, status,
               platform_order_id, updated_at
        FROM marketplace_returns
        WHERE user_id=$1 AND updated_at >= $2`, [userId, inicio90]),

      // Produtos cadastrados
      db.query(`
        SELECT sku, platform, cost, fee_pct, tax_pct, shipping_fee, is_active
        FROM products WHERE user_id=$1`, [userId]),

      // Mês passado para comparação
      db.query(`
        SELECT
          COUNT(*) FILTER (WHERE status != 'cancelled') AS pedidos,
          COALESCE(SUM(total_amount) FILTER (WHERE status != 'cancelled'), 0) AS faturamento,
          COALESCE(SUM(platform_fee + shipping_fee + tax_amount) FILTER (WHERE status != 'cancelled'), 0) AS custos_fixos
        FROM marketplace_orders
        WHERE user_id=$1
          AND order_date >= date_trunc('month', NOW() - INTERVAL '1 month')
          AND order_date < date_trunc('month', NOW())`, [userId]),

      // Meta do mês
      db.query(`SELECT monthly_revenue_goal, revenue_goal_enabled FROM user_goals WHERE user_id=$1`, [userId])
    ]);

    const orders = ordersRes.rows;
    const returns = returnsRes.rows;
    const products = productsRes.rows;
    const mesPassado = mesPassadoRes.rows[0] || {};
    const goal = goalRes.rows[0] || {};

    const n = v => Number(v || 0);
    const brl = v => `R$ ${n(v).toFixed(2)}`;
    const pct = (a, b) => b > 0 ? ((a / b) * 100).toFixed(1) + '%' : '0%';

    const paid = orders.filter(o => o.status !== 'cancelled');
    const cancelled = orders.filter(o => o.status === 'cancelled');
    const shipped = paid.filter(o => ['shipped','delivered'].includes(o.status));

    // Totais 30 dias
    const paid30 = paid.filter(o => new Date(o.order_date) >= new Date(inicio30));
    const fat30 = paid30.reduce((s, o) => s + n(o.total_amount), 0);
    const lucro30 = paid30.reduce((s, o) => s + n(o.lucro_real), 0);
    const tarifa30 = paid30.reduce((s, o) => s + n(o.platform_fee), 0);
    const frete30 = paid30.reduce((s, o) => s + n(o.shipping_fee), 0);
    const imposto30 = paid30.reduce((s, o) => s + n(o.tax_amount), 0);
    const custo30 = paid30.reduce((s, o) => s + n(o.total_product_cost), 0);

    // Totais mês atual
    const paidMes = paid.filter(o => new Date(o.order_date) >= new Date(inicioMes));
    const fatMes = paidMes.reduce((s, o) => s + n(o.total_amount), 0);
    const lucroMes = paidMes.reduce((s, o) => s + n(o.lucro_real), 0);

    // Previsão do mês — baseada no ritmo REAL de dias com vendas
    const diaAtual = hoje.getDate();
    const diasNoMes = new Date(hoje.getFullYear(), hoje.getMonth() + 1, 0).getDate();
    const diasRestantes = diasNoMes - diaAtual;
    // Ritmo diário médio (só dias que tiveram venda para ser mais realista)
    const diasComVenda = new Set(paidMes.map(o => new Date(o.order_date).toDateString())).size || 1;
    const ritmoDiario = fatMes / Math.max(diaAtual, 1);
    const previsaoFat = ritmoDiario * diasNoMes;
    const previsaoLucro = lucroMes / Math.max(diaAtual, 1) * diasNoMes;

    // Por plataforma (30 dias)
    const byPlat = {};
    paid30.forEach(o => {
      if (!byPlat[o.platform]) byPlat[o.platform] = { fat: 0, lucro: 0, qtd: 0 };
      byPlat[o.platform].fat += n(o.total_amount);
      byPlat[o.platform].lucro += n(o.lucro_real);
      byPlat[o.platform].qtd++;
    });

    // Top produtos (30 dias) com lucro real
    const prodMap = {};
    paid30.forEach(o => {
      const k = o.item_sku || o.item_title || '?';
      if (!prodMap[k]) prodMap[k] = { title: o.item_title, sku: k, fat: 0, lucro: 0, qtd: 0, custo: n(o.product_cost) };
      prodMap[k].fat += n(o.total_amount);
      prodMap[k].lucro += n(o.lucro_real);
      prodMap[k].qtd += n(o.quantity || 1);
    });
    const topProds = Object.values(prodMap).sort((a, b) => b.fat - a.fat).slice(0, 10);
    const topLucro = Object.values(prodMap).sort((a, b) => b.lucro - a.lucro).slice(0, 5);
    const piorMargem = Object.values(prodMap)
      .filter(p => p.fat > 0)
      .map(p => ({ ...p, margem: p.lucro / p.fat * 100 }))
      .sort((a, b) => a.margem - b.margem).slice(0, 5);

    // Devoluções (90 dias)
    const devolReais = returns.filter(r => !r.ml_protected);
    const devolCobertas = returns.filter(r => r.ml_protected);
    const prejDevol = devolReais.reduce((s, r) => s + n(r.return_total_cost), 0);

    // Vendas por dia da semana (30 dias)
    const diaSemana = ['Dom','Seg','Ter','Qua','Qui','Sex','Sáb'];
    const byDia = Array(7).fill(0).map((_, i) => ({ dia: diaSemana[i], fat: 0, qtd: 0 }));
    paid30.forEach(o => {
      const d = new Date(o.order_date).getDay();
      byDia[d].fat += n(o.total_amount);
      byDia[d].qtd++;
    });
    const melhorDia = [...byDia].sort((a, b) => b.fat - a.fat)[0];

    return {
      data_hoje: hoje.toLocaleDateString('pt-BR'),
      // === MÊS ATUAL ===
      mes_atual: {
        nome: hoje.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' }),
        dia_atual: diaAtual,
        dias_no_mes: diasNoMes,
        dias_restantes: diasRestantes,
        pedidos: paidMes.length,
        faturamento: brl(fatMes),
        lucro_real: brl(lucroMes),
        margem: pct(lucroMes, fatMes),
        ritmo_diario: brl(ritmoDiario),
        previsao_faturamento_mes_completo: brl(previsaoFat),
        previsao_lucro_mes_completo: brl(previsaoLucro),
        meta_configurada: goal.revenue_goal_enabled ? brl(goal.monthly_revenue_goal) : 'Não configurada',
        percentual_meta: goal.revenue_goal_enabled && n(goal.monthly_revenue_goal) > 0
          ? pct(fatMes, n(goal.monthly_revenue_goal)) : 'N/A',
      },
      // === 30 DIAS ===
      ultimos_30_dias: {
        pedidos_pagos: paid30.length,
        pedidos_cancelados: cancelled.filter(o => new Date(o.order_date) >= new Date(inicio30)).length,
        faturamento: brl(fat30),
        lucro_real: brl(lucro30),
        margem_media: pct(lucro30, fat30),
        tarifas_marketplace: brl(tarifa30),
        frete_pago: brl(frete30),
        impostos: brl(imposto30),
        custo_produtos: brl(custo30),
        ticket_medio: brl(paid30.length ? fat30 / paid30.length : 0),
      },
      // === MÊS PASSADO (comparação) ===
      mes_passado: {
        pedidos: n(mesPassado.pedidos),
        faturamento: brl(mesPassado.faturamento),
        variacao_faturamento: mesPassado.faturamento > 0
          ? ((fatMes / n(mesPassado.faturamento) - 1) * 100).toFixed(1) + '%' : 'N/A',
      },
      // === POR PLATAFORMA ===
      por_plataforma: Object.entries(byPlat).map(([plat, v]) => ({
        plataforma: plat,
        faturamento: brl(v.fat),
        lucro: brl(v.lucro),
        pedidos: v.qtd,
        margem: pct(v.lucro, v.fat),
      })),
      // === PRODUTOS ===
      top_10_faturamento: topProds.map(p => ({
        produto: p.title, sku: p.sku,
        faturamento: brl(p.fat), lucro: brl(p.lucro),
        margem: pct(p.lucro, p.fat), qtd_vendida: p.qtd,
        custo_unitario: brl(p.custo),
      })),
      top_5_lucro: topLucro.map(p => ({
        produto: p.title, sku: p.sku,
        lucro: brl(p.lucro), margem: pct(p.lucro, p.fat),
      })),
      produtos_pior_margem: piorMargem.map(p => ({
        produto: p.title, sku: p.sku,
        margem: p.margem.toFixed(1) + '%', lucro: brl(p.lucro), faturamento: brl(p.fat),
      })),
      produtos_sem_custo_cadastrado: topProds.filter(p => p.custo === 0).map(p => p.sku || p.title),
      // === DEVOLUÇÕES ===
      devolucoes_90_dias: {
        total_com_prejuizo: devolReais.length,
        prejuizo_total: brl(prejDevol),
        ml_absorveu: devolCobertas.length,
        frete_reverso_total: brl(devolReais.reduce((s, r) => s + n(r.return_shipping_cost), 0)),
        taxas_total: brl(devolReais.reduce((s, r) => s + n(r.return_fee), 0)),
      },
      // === PADRÕES ===
      melhor_dia_semana: melhorDia ? `${melhorDia.dia} (${brl(melhorDia.fat)}, ${melhorDia.qtd} pedidos)` : 'N/A',
      produtos_cadastrados_total: products.length,
      produtos_ativos: products.filter(p => p.is_active).length,
    };
  } catch(e) {
    console.error('[AI context]', e.message);
    return {};
  }
}

app.post('/api/ai/chat', auth, async (req, res) => {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) return res.status(503).json({ error: 'OPENAI_API_KEY não configurada no servidor.' });

  const { message, history = [] } = req.body;
  if (!message) return res.status(400).json({ error: 'message obrigatório' });

  try {
    const ctx = await ssGetAiContext(req.user.id);
    const systemPrompt = `Você é o assistente de vendas do SalesSync — uma plataforma de gestão para vendedores de marketplace (Mercado Livre, Magalu, Shopee).
Você tem acesso COMPLETO e em TEMPO REAL aos dados financeiros e operacionais do vendedor.
Responda SEMPRE em português, seja direto, use os números reais abaixo, e dê dicas práticas e acionáveis.
NUNCA invente valores — use apenas os dados fornecidos aqui.

======= DADOS REAIS DO VENDEDOR (hoje: ${ctx.data_hoje}) =======

📅 MÊS ATUAL (${ctx.mes_atual?.nome}):
- Dia ${ctx.mes_atual?.dia_atual} de ${ctx.mes_atual?.dias_no_mes} (restam ${ctx.mes_atual?.dias_restantes} dias)
- Pedidos pagos: ${ctx.mes_atual?.pedidos}
- Faturamento até agora: ${ctx.mes_atual?.faturamento}
- Lucro REAL (após custos de produto): ${ctx.mes_atual?.lucro_real}
- Margem: ${ctx.mes_atual?.margem}
- Ritmo diário atual: ${ctx.mes_atual?.ritmo_diario}/dia
- Previsão de faturamento até fim do mês: ${ctx.mes_atual?.previsao_faturamento_mes_completo}
- Previsão de lucro até fim do mês: ${ctx.mes_atual?.previsao_lucro_mes_completo}
- Meta do mês: ${ctx.mes_atual?.meta_configurada} | Atingido: ${ctx.mes_atual?.percentual_meta}

📊 ÚLTIMOS 30 DIAS:
- Pedidos pagos: ${ctx.ultimos_30_dias?.pedidos_pagos} | Cancelados: ${ctx.ultimos_30_dias?.pedidos_cancelados}
- Faturamento: ${ctx.ultimos_30_dias?.faturamento}
- Lucro REAL: ${ctx.ultimos_30_dias?.lucro_real} (margem ${ctx.ultimos_30_dias?.margem_media})
- Ticket médio: ${ctx.ultimos_30_dias?.ticket_medio}
- Tarifas marketplace: ${ctx.ultimos_30_dias?.tarifas_marketplace}
- Frete pago: ${ctx.ultimos_30_dias?.frete_pago}
- Impostos: ${ctx.ultimos_30_dias?.impostos}
- Custo dos produtos vendidos: ${ctx.ultimos_30_dias?.custo_produtos}

📅 MÊS PASSADO (comparação):
- Pedidos: ${ctx.mes_passado?.pedidos} | Faturamento: ${ctx.mes_passado?.faturamento}
- Variação de faturamento vs mês atual: ${ctx.mes_passado?.variacao_faturamento}

🏪 POR PLATAFORMA (30 dias):
${JSON.stringify(ctx.por_plataforma, null, 2)}

🏆 TOP 10 PRODUTOS POR FATURAMENTO (30 dias):
${ctx.top_10_faturamento?.map((p, i) => `${i+1}. ${p.produto} (SKU: ${p.sku}) — Faturamento: ${p.faturamento} | Lucro: ${p.lucro} | Margem: ${p.margem} | Qtd: ${p.qtd_vendida} | Custo unit.: ${p.custo_unitario}`).join('\n') || 'Sem dados'}

⚠️ PRODUTOS COM PIOR MARGEM (foco de atenção):
${ctx.produtos_pior_margem?.map((p, i) => `${i+1}. ${p.produto} (SKU: ${p.sku}) — Margem: ${p.margem} | Lucro: ${p.lucro} | Fat.: ${p.faturamento}`).join('\n') || 'Nenhum'}

⚠️ PRODUTOS SEM CUSTO CADASTRADO (lucro pode estar errado):
${ctx.produtos_sem_custo_cadastrado?.length ? ctx.produtos_sem_custo_cadastrado.join(', ') : 'Todos os produtos têm custo cadastrado ✓'}

↩️ DEVOLUÇÕES (90 dias):
- Com prejuízo para o vendedor: ${ctx.devolucoes_90_dias?.total_com_prejuizo} devoluções = ${ctx.devolucoes_90_dias?.prejuizo_total}
- ML absorveu o custo: ${ctx.devolucoes_90_dias?.ml_absorveu} casos (sem prejuízo)
- Frete reverso total: ${ctx.devolucoes_90_dias?.frete_reverso_total}
- Taxas de devolução: ${ctx.devolucoes_90_dias?.taxas_total}

📆 MELHOR DIA DA SEMANA PARA VENDER: ${ctx.melhor_dia_semana}

📦 PRODUTOS: ${ctx.produtos_ativos} ativos de ${ctx.produtos_cadastrados_total} cadastrados
=======================================================

REGRAS IMPORTANTES:
1. Use SEMPRE os números reais acima — NUNCA invente ou estime valores que não estão aqui.
2. Se algum produto tem margem negativa ou muito baixa (<10%), mencione proativamente.
3. Se pedirem planilha, exportação, CSV ou tabela: OBRIGATORIAMENTE gere o CSV completo com os dados reais fornecidos em bloco \`\`\`csv\n...\`\`\`. Não recuse, não dê template — use os dados reais.
4. Responda sempre em português brasileiro, de forma direta e prática.
5. Quando falar de lucro, deixe claro que é lucro REAL (após custo do produto). Se produto não tem custo cadastrado, avise que o lucro pode estar incorreto.`;

    // Detecta intenção de planilha/exportação para buscar dados completos do banco
    const wantsCsv = /planilha|excel|csv|exportar|exporta|listar.*pedidos|todos.*pedidos|gera.*pedidos|tabela.*pedidos/i.test(message);
    let userContent = message;

    if (wantsCsv) {
      // Busca pedidos reais do banco com custo e lucro calculados
      const period = req.body.period_days || 30;
      const { rows: pedidos } = await db.query(`
        SELECT
          o.platform_order_id, o.platform, o.shop_name, o.item_title, o.item_sku,
          o.order_date, o.status, o.fulfillment_type, o.quantity,
          o.total_amount, o.platform_fee, o.shipping_fee, o.tax_amount,
          COALESCE(p.cost, 0) AS custo_unitario,
          COALESCE(p.cost, 0) * o.quantity AS custo_total,
          ROUND(o.total_amount - o.platform_fee - o.shipping_fee - o.tax_amount - COALESCE(p.cost,0)*o.quantity, 2) AS lucro_real,
          CASE WHEN o.total_amount > 0 THEN
            ROUND((o.total_amount - o.platform_fee - o.shipping_fee - o.tax_amount - COALESCE(p.cost,0)*o.quantity) / o.total_amount * 100, 1)
          ELSE 0 END AS margem_pct
        FROM marketplace_orders o
        LEFT JOIN products p ON p.user_id=o.user_id
          AND LOWER(TRIM(p.sku))=LOWER(TRIM(o.item_sku))
          AND (LOWER(p.platform)=LOWER(o.platform) OR LOWER(p.platform)='geral')
        WHERE o.user_id=$1 AND o.order_date >= NOW() - INTERVAL '${Math.min(period,90)} days'
        ORDER BY o.order_date DESC
        LIMIT 500`, [req.user.id]);

      const csvHeader = 'ID Pedido,Plataforma,Conta,Produto,SKU,Data,Status,Tipo,Qtde,Valor (R$),Tarifa (R$),Frete (R$),Imposto (R$),Custo Unit. (R$),Custo Total (R$),Lucro Real (R$),Margem (%)';
      const csvRows = pedidos.map(o => [
        o.platform_order_id,
        o.platform,
        o.shop_name||'',
        `"${(o.item_title||'').replace(/"/g,"'")}"`,
        o.item_sku||'',
        o.order_date ? new Date(o.order_date).toLocaleDateString('pt-BR') : '',
        o.status||'',
        o.fulfillment_type||'normal',
        o.quantity||1,
        Number(o.total_amount||0).toFixed(2),
        Number(o.platform_fee||0).toFixed(2),
        Number(o.shipping_fee||0).toFixed(2),
        Number(o.tax_amount||0).toFixed(2),
        Number(o.custo_unitario||0).toFixed(2),
        Number(o.custo_total||0).toFixed(2),
        Number(o.lucro_real||0).toFixed(2),
        Number(o.margem_pct||0).toFixed(1)
      ].join(',')).join('\n');

      userContent = `${message}\n\n[PEDIDOS REAIS DO BANCO — últimos ${period} dias — ${pedidos.length} registros]\n\`\`\`csv\n${csvHeader}\n${csvRows}\n\`\`\`\n\nGere o CSV completo acima exatamente como está (ou filtre/reordene conforme o pedido do usuário). Não substitua por template — esses são os dados REAIS.`;
    } else if (req.body.page_data && Array.isArray(req.body.page_data) && req.body.page_data.length) {
      // Fallback: frontend mandou dados da tela
      const rows = req.body.page_data.slice(0, 300);
      const csvHeader = 'ID,Plataforma,Conta,Produto,SKU,Data,Status,Tipo,Qtde,Valor,Tarifa,Frete,Imposto,Custo,Lucro';
      const csvRows = rows.map(o => [
        o.platform_order_id||'', o.platform||'', o.shop_name||'',
        `"${(o.item_title||'').replace(/"/g,"'")}"`, o.item_sku||'',
        o.order_date?new Date(o.order_date).toLocaleDateString('pt-BR'):'',
        o.status||'', o.fulfillment_type||'', o.quantity||1,
        Number(o.total_amount||0).toFixed(2), Number(o.platform_fee||0).toFixed(2),
        Number(o.shipping_fee||0).toFixed(2), Number(o.tax_amount||0).toFixed(2),
        Number(o.total_cost||0).toFixed(2), Number(o.profit||0).toFixed(2)
      ].join(',')).join('\n');
      userContent = `${message}\n\n[DADOS DA TELA — ${rows.length} registros]\n\`\`\`csv\n${csvHeader}\n${csvRows}\n\`\`\``;
    }

    const messages = [
      { role: 'system', content: systemPrompt },
      ...history.slice(-10).map(h => ({ role: h.role, content: h.content })),
      { role: 'user', content: userContent }
    ];

    const { data } = await axios.post('https://api.openai.com/v1/chat/completions', {
      model: 'gpt-4o-mini',
      messages,
      max_tokens: wantsCsv ? 4000 : 700,
      temperature: 0.7
    }, {
      headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' }
    });

    const reply = data.choices?.[0]?.message?.content || 'Sem resposta.';
    res.json({ reply, tokens_used: data.usage?.total_tokens || 0 });
  } catch(e) {
    const msg = e.response?.data?.error?.message || e.message;
    res.status(500).json({ error: msg });
  }
});

// ── ADMIN: invalida todos os tokens Shopee (migração sandbox → produção) ──
// Uso: GET /admin/shopee/invalidate-all-tokens?secret=SEU_ADMIN_SECRET
// Isso força TODOS os usuários a reconectarem a Shopee.
app.get('/admin/shopee/invalidate-all-tokens', async (req, res) => {
  const secret = req.query.secret || '';
  const adminSecret = process.env.ADMIN_SECRET || '';
  if (!adminSecret || secret !== adminSecret) {
    return res.status(403).json({ error: 'Acesso negado. Configure ADMIN_SECRET no Render e passe ?secret=...' });
  }
  try {
    const { rowCount } = await db.query(`
      UPDATE marketplace_accounts
      SET access_token=NULL, refresh_token=NULL, token_expires_at=NULL,
          shop_name=CASE WHEN shop_name NOT LIKE '%(reconectar)%' THEN shop_name || ' (reconectar)' ELSE shop_name END,
          updated_at=NOW()
      WHERE platform='shopee' AND (access_token IS NOT NULL OR refresh_token IS NOT NULL)
    `);
    console.log(`[Admin] ✅ ${rowCount} contas Shopee invalidadas para reconexão.`);
    res.json({ success: true, accounts_invalidated: rowCount, message: `${rowCount} conta(s) Shopee marcada(s) para reconexão. Cada usuário verá o aviso ao entrar.` });
  } catch(e) {
    res.status(500).json({ error: e.message });
  }
});

// ── STATUS DA KEY SHOPEE ──
app.get('/api/shopee/key-status', auth, (req, res) => {
  const expiresAt = process.env.SHOPEE_KEY_EXPIRES_AT;
  const mode = process.env.SHOPEE_ENV === 'test' ? 'test' : 'production';
  if (!expiresAt) return res.json({ ok: true, mode, warning: false, message: 'SHOPEE_KEY_EXPIRES_AT não configurado.' });
  const expDate = new Date(expiresAt);
  const now = new Date();
  const daysLeft = Math.ceil((expDate - now) / 86400000);
  let level = 'ok';
  if (daysLeft <= 0) level = 'expired';
  else if (daysLeft <= 7) level = 'critical';
  else if (daysLeft <= 30) level = 'warning';
  res.json({
    ok: level === 'ok',
    mode,
    level,
    daysLeft,
    expiresAt: expDate.toISOString(),
    expiresFormatted: expDate.toLocaleDateString('pt-BR', { day:'2-digit', month:'2-digit', year:'numeric', hour:'2-digit', minute:'2-digit', timeZone:'America/Sao_Paulo' }),
    message: level === 'expired'
      ? `⛔ Shopee API Key EXPIRADA! Renove no Shopee Partner Center.`
      : level === 'critical'
      ? `🚨 Shopee API Key expira em ${daysLeft} dia(s)! Renove URGENTE.`
      : level === 'warning'
      ? `⚠️ Shopee API Key expira em ${daysLeft} dia(s). Renove em breve.`
      : `✅ Shopee API Key OK — ${daysLeft} dias restantes.`
  });
});

// ═══════════════════════════════════════════════════════════════
// ── TIKTOK SHOP INTEGRATION ─────────────────────────────────────
// ═══════════════════════════════════════════════════════════════

const TIKTOK_BASE    = 'https://open-api.tiktokglobalshop.com';
const TIKTOK_APP_KEY = () => process.env.TIKTOK_APP_KEY || '';
const TIKTOK_SECRET  = () => process.env.TIKTOK_APP_SECRET || '';

// Tabela nonce para OAuth TikTok (mesmo padrão Shopee — TikTok não devolve state)
async function ensureTiktokNonceTable() {
  await db.query(`
    CREATE TABLE IF NOT EXISTS tiktok_oauth_nonce (
      nonce      TEXT PRIMARY KEY,
      user_id    UUID NOT NULL,
      created_at TIMESTAMP NOT NULL DEFAULT NOW()
    )
  `).catch(() => {});
  // Garante coluna refresh_token_expires_at na tabela de contas (pode não existir em bases antigas)
  await db.query(`ALTER TABLE marketplace_accounts ADD COLUMN IF NOT EXISTS refresh_token_expires_at TIMESTAMP`).catch(() => {});
}
ensureTiktokNonceTable();

// Gera assinatura HMAC-SHA256 para TikTok Shop API
function tiktokSign(secret, params, body = '') {
  // Ordena params excluindo sign e access_token, concatena: secret + key+value... + body + secret
  const keys = Object.keys(params).filter(k => k !== 'sign' && k !== 'access_token').sort();
  const str  = secret + keys.map(k => `${k}${params[k]}`).join('') + body + secret;
  return crypto.createHmac('sha256', secret).update(str).digest('hex');
}

// Monta params base para chamadas TikTok API v2
function tiktokParams(path, accessToken, extra = {}) {
  const ts     = Math.floor(Date.now() / 1000);
  const appKey = TIKTOK_APP_KEY();
  const secret = TIKTOK_SECRET();
  const params = { app_key: appKey, timestamp: ts, ...extra };
  if (accessToken) params.access_token = accessToken;
  params.sign = tiktokSign(secret, { ...params, path }, '');
  return params;
}

// Status TikTok → interno SaleSync
const TIKTOK_STATUS = {
  'UNPAID':             'pending',
  'ON_HOLD':            'pending',
  'AWAITING_SHIPMENT':  'paid',
  'AWAITING_COLLECTION':'paid',
  'IN_TRANSIT':         'shipped',
  'DELIVERED':          'delivered',
  'COMPLETED':          'completed',
  'CANCELLED':          'cancelled',
  'PARTIALLY_CANCELLED':'cancelled',
};

// ── OAuth: inicia autorização TikTok ──────────────────────────────
app.get('/auth/tiktok', async (req, res) => {
  const uid = req.query.user_id || '';
  if (!uid) return res.status(400).send('user_id obrigatório');
  // Salva nonce → user_id (TikTok retorna state no callback ✅)
  const nonce = crypto.randomBytes(16).toString('hex');
  await db.query(
    `INSERT INTO tiktok_oauth_nonce (nonce, user_id) VALUES ($1,$2)
     ON CONFLICT (nonce) DO UPDATE SET user_id=$2, created_at=NOW()`,
    [nonce, uid]
  );
  const redirectUri = encodeURIComponent(process.env.TIKTOK_REDIRECT_URI || 'https://api2.salesync.shop/callback/tiktok');
  // URL OAuth correta: usa app_key (não service_id) + redirect_uri + state
  const authUrl = `https://auth.tiktok-shops.com/oauth/authorize?app_key=${TIKTOK_APP_KEY()}&redirect_uri=${redirectUri}&state=${nonce}`;
  console.log(`[TikTok] OAuth iniciado uid=${uid} nonce=${nonce} url=${authUrl}`);
  res.redirect(authUrl);
});

// ── OAuth: callback TikTok ────────────────────────────────────────
app.get('/callback/tiktok', async (req, res) => {
  const { code, state } = req.query;
  console.log(`[TikTok Callback] code=${code ? 'ok' : 'AUSENTE'} | state=${state}`);

  if (!code) return res.status(400).send('Código de autorização ausente');

  // Recupera user_id pelo state/nonce
  let userId = null;
  if (state) {
    const { rows } = await db.query(
      `SELECT user_id FROM tiktok_oauth_nonce WHERE nonce=$1`, [state]
    );
    if (rows.length) {
      userId = rows[0].user_id;
      await db.query(`DELETE FROM tiktok_oauth_nonce WHERE nonce=$1`, [state]);
    }
  }
  if (!userId) {
    console.error('[TikTok] Nonce não encontrado para state:', state);
    return res.status(400).send('Sessão OAuth inválida ou expirada. Tente novamente.');
  }

  try {
    // Troca code por access_token
    const appKey = TIKTOK_APP_KEY();
    const secret = TIKTOK_SECRET();
    const ts     = Math.floor(Date.now() / 1000);

    // TikTok token endpoint: params na query, body separado
    const tokenParams = { app_key: appKey, timestamp: ts };
    const tokenBody   = { app_key: appKey, app_secret: secret, auth_code: code, grant_type: 'authorized_code' };
    tokenParams.sign  = tiktokSign(secret, { ...tokenParams, path: '/api/v2/token/get' }, JSON.stringify(tokenBody));

    console.log('[TikTok] Trocando code por token...');
    const tkRes = await axios.post(
      `${TIKTOK_BASE}/api/v2/token/get`,
      tokenBody,
      { params: tokenParams, headers: { 'Content-Type': 'application/json' } }
    );
    console.log('[TikTok] Resposta token:', JSON.stringify(tkRes.data));
    const tk = tkRes.data?.data || tkRes.data;
    if (!tk?.access_token) {
      console.error('[TikTok] Erro ao obter token:', tkRes.data);
      return res.status(500).send('Erro ao obter token TikTok: ' + JSON.stringify(tkRes.data));
    }

    const accessToken  = tk.access_token;
    const refreshToken = tk.refresh_token;
    // seller_base_region ou open_id identificam o seller
    const openId = String(tk.seller_id || tk.open_id || tk.seller_base_region || code.slice(0,20));
    const expiresAt    = new Date(Date.now() + (tk.access_token_expire_in || 3600) * 1000);
    const refreshExp   = new Date(Date.now() + (tk.refresh_token_expire_in || 86400 * 30) * 1000);

    // Busca nome da loja
    let shopName = 'TikTok Shop';
    try {
      const tsNow = Math.floor(Date.now() / 1000);
      const shopParams = tiktokParams('/api/v2/shop/get_authorized_shop', accessToken, {});
      const shopRes = await axios.get(`${TIKTOK_BASE}/api/v2/shop/get_authorized_shop`, { params: shopParams });
      const shops = shopRes.data?.data?.shop_list || shopRes.data?.data?.shops || [];
      if (shops.length) shopName = shops[0].shop_name || shops[0].name || 'TikTok Shop';
    } catch(e) {
      console.warn('[TikTok] Não conseguiu buscar nome da loja:', e.message);
    }

    // Salva conta no banco
    await db.query(`
      INSERT INTO marketplace_accounts (user_id, platform, platform_shop_id, shop_name, access_token, refresh_token, token_expires_at, mode, is_active)
      VALUES ($1,'tiktok',$2,$3,$4,$5,$6,'production',true)
      ON CONFLICT (user_id, platform, platform_shop_id) DO UPDATE
        SET shop_name=$3, access_token=$4, refresh_token=$5,
            token_expires_at=$6, mode='production', is_active=true, updated_at=NOW()
    `, [userId, openId, shopName, accessToken, refreshToken, expiresAt]);

    console.log(`[TikTok] ✅ Conectado: ${shopName} (open_id=${openId}) uid=${userId}`);
    res.redirect(`${process.env.FRONTEND_URL || 'https://salesync.shop'}?connected=tiktok`);
  } catch(e) {
    console.error('[TikTok] Erro callback:', e.response?.data || e.message);
    res.status(500).send('Erro ao conectar TikTok Shop: ' + (e.response?.data?.message || e.message));
  }
});

// ── Refresh token TikTok ──────────────────────────────────────────
async function refreshTiktokToken(acc) {
  try {
    const appKey = TIKTOK_APP_KEY();
    const secret = TIKTOK_SECRET();
    const ts     = Math.floor(Date.now() / 1000);
    const body   = { app_key: appKey, app_secret: secret, refresh_token: acc.refresh_token, grant_type: 'refresh_token' };
    const sign   = tiktokSign(secret, { app_key: appKey, timestamp: ts }, JSON.stringify(body));
    const res    = await axios.post(`${TIKTOK_BASE}/api/v2/token/refresh`, body, { params: { app_key: appKey, timestamp: ts, sign } });
    const tk     = res.data?.data;
    if (!tk?.access_token) return null;
    const expiresAt = new Date(Date.now() + (tk.access_token_expire_in || 3600) * 1000);
    const refreshExp = new Date(Date.now() + (tk.refresh_token_expire_in || 86400 * 30) * 1000);
    await db.query(
      `UPDATE accounts SET access_token=$1, refresh_token=$2, token_expires_at=$3, refresh_token_expires_at=$4 WHERE id=$5`,
      [tk.access_token, tk.refresh_token || acc.refresh_token, expiresAt, refreshExp, acc.id]
    );
    return tk.access_token;
  } catch(e) {
    console.error('[TikTok] Falha ao renovar token:', e.response?.data || e.message);
    return null;
  }
}

// ── fetchTiktok: busca pedidos ────────────────────────────────────
async function fetchTiktok(acc, days) {
  // Renova token se necessário
  let token = acc.access_token;
  if (acc.token_expires_at && new Date(acc.token_expires_at) <= new Date(Date.now() + 300000)) {
    token = await refreshTiktokToken(acc);
    if (!token) {
      await db.query(`UPDATE accounts SET status='token_invalid' WHERE id=$1`, [acc.id]);
      throw new Error('TOKEN_INVALID:Token TikTok expirado — reconecte a loja');
    }
    acc = { ...acc, access_token: token };
  }

  const nowTs   = Math.floor(Date.now() / 1000);
  const sinceTs = Math.floor((Date.now() - days * 86400000) / 1000);

  // Helper GET TikTok
  async function tiktokGet(path, extra = {}) {
    const params = tiktokParams(path, token, extra);
    const { data } = await axios.get(`${TIKTOK_BASE}${path}`, { params });
    if (data?.code && data.code !== 0) {
      const msg = data.message || data.msg || JSON.stringify(data);
      if (String(data.code) === '105001' || msg.toLowerCase().includes('token')) {
        await db.query(`UPDATE accounts SET status='token_invalid' WHERE id=$1`, [acc.id]);
        throw new Error(`TOKEN_INVALID:${msg}`);
      }
      throw new Error(`[TikTok API] code=${data.code} msg=${msg}`);
    }
    return data;
  }

  // 1. Lista pedidos paginando
  const allOrderIds = [];
  const seenIds     = new Set();
  let cursor        = null;
  let hasMore       = true;

  while (hasMore) {
    const extra = {
      create_time_from: sinceTs,
      create_time_to:   nowTs,
      page_size:        50,
    };
    if (cursor) extra.cursor = cursor;

    const data = await tiktokGet('/api/v2/order/search', extra);
    const list = data?.data?.order_list || data?.data?.orders || [];
    for (const o of list) {
      const id = o.order_id || o.id;
      if (id && !seenIds.has(id)) { seenIds.add(id); allOrderIds.push(id); }
    }
    hasMore = data?.data?.more || data?.data?.has_more || false;
    cursor  = data?.data?.next_cursor || data?.data?.cursor || null;
    if (!list.length || !hasMore) break;
  }
  console.log(`[TikTok] ${allOrderIds.length} pedidos encontrados`);
  if (!allOrderIds.length) return [];

  // 2. Busca detalhes em lotes de 50
  const allOrders = [];
  for (let i = 0; i < allOrderIds.length; i += 50) {
    const batch = allOrderIds.slice(i, i + 50);
    const data  = await tiktokGet('/api/v2/order/get_order_detail', { order_id_list: batch.join(',') });
    const list  = data?.data?.order_list || data?.data?.orders || [];
    allOrders.push(...list);
  }

  return allOrders.map(o => {
    const item    = o.item_list?.[0] || o.line_items?.[0] || {};
    const status  = TIKTOK_STATUS[o.order_status] || 'paid';
    const orderTs = o.paid_time || o.create_time || 0;

    // Valores
    const totalAmount  = parseFloat(o.payment?.total_amount ?? o.subtotal ?? item.sku_sale_price ?? 0);
    const buyerPaid    = parseFloat(o.payment?.buyer_total_amount ?? o.payment?.total_amount ?? totalAmount);
    const platformFee  = parseFloat(o.payment?.platform_fee ?? o.platform_fee ?? 0);
    const shippingFee  = parseFloat(o.payment?.shipping_fee ?? o.shipping_fee ?? 0);
    const commission   = parseFloat(o.payment?.commission_fee ?? o.commission_fee ?? 0);
    const sellerIncome = parseFloat(o.payment?.seller_income ?? o.seller_income ?? 0);

    // Produto
    const itemImage = item.sku_image ?? item.product_image ?? item.image_url ?? null;
    const qty       = parseInt(item.quantity ?? 1, 10);
    const skuPrice  = parseFloat(item.sku_sale_price ?? item.sale_price ?? 0);

    return {
      id:                o.order_id || o.id,
      platform:          'tiktok',
      platform_order_id: o.order_id || o.id,
      shop_name:         acc.shop_name,
      fulfillment_type:  'normal',
      status,
      buyer_name:        o.buyer_email?.split('@')[0] || o.recipient_address?.name || '',
      total_amount:      skuPrice * qty || totalAmount,
      paid_amount:       buyerPaid,
      platform_fee:      platformFee || commission,
      shipping_fee:      shippingFee,
      reverse_shipping_fee: 0,
      tax_amount:        0,
      discount_amount:   parseFloat(o.payment?.discount_total ?? 0),
      shopee_discount:   0,
      shopee_escrow:     sellerIncome,
      shopee_commission: commission,
      shopee_service_fee:0,
      quantity:          qty,
      order_date:        new Date(orderTs * 1000).toISOString(),
      item_title:        item.product_name ?? item.title ?? 'Produto TikTok',
      item_image:        itemImage,
      item_sku:          item.seller_sku ?? item.sku_id ?? '',
      item_id:           String(item.product_id ?? ''),
      model_id:          String(item.sku_id ?? ''),
      model_name:        item.sku_name ?? '',
      payment_method:    o.payment?.payment_method ?? '',
      shipping_type:     o.shipping_type ?? '',
      tracking_url:      '',
      weight_kg:         0,
    };
  });
}

// ═══════════════════════════════════════════════════════════════
// FIM TIKTOK SHOP
// ═══════════════════════════════════════════════════════════════

// ═══════════════════════════════════════════════════════════════
// PESQUISA DE MERCADO (estilo NubMetrics)
// ═══════════════════════════════════════════════════════════════
app.get('/api/ml/pesquisa', auth, async (req, res) => {
  const q     = (req.query.q || '').trim();
  const limit = Math.min(parseInt(req.query.limit || '50'), 100);
  const sort  = req.query.sort || 'sold_quantity';
  if (!q) return res.status(400).json({ ok: false, error: 'q obrigatório' });

  try {
    // Tenta pegar token ML do usuário (para requests autenticados)
    const { rows } = await db.query(
      `SELECT access_token FROM marketplace_accounts
       WHERE user_id=$1 AND platform='mercadolivre' AND is_active=true AND access_token IS NOT NULL
       LIMIT 1`,
      [req.user.id]
    );
    const token   = rows[0]?.access_token || null;
    const headers = token ? { Authorization: `Bearer ${token}` } : {};

    const url = `https://api.mercadolibre.com/sites/MLB/search?q=${encodeURIComponent(q)}&limit=${limit}&sort=${sort}`;
    const r   = await axios.get(url, { headers, timeout: 15000 });
    const items = (r.data.results || []).map(item => ({
      id:                item.id,
      title:             item.title,
      price:             item.price,
      original_price:    item.original_price || null,
      sold_quantity:     item.sold_quantity || 0,
      available_quantity:item.available_quantity || 0,
      listing_type_id:   item.listing_type_id,
      catalog_product_id:item.catalog_product_id || null,
      catalog_listing:   item.catalog_listing || false,
      condition:         item.condition,
      thumbnail:         item.thumbnail,
      permalink:         item.permalink,
      free_shipping:     item.shipping?.free_shipping || false,
      logistic_type:     item.shipping?.logistic_type || null,
      seller_id:         item.seller?.id,
      seller_nickname:   item.seller?.nickname,
      seller_power:      item.seller?.seller_reputation?.power_seller_status || null,
      seller_level:      item.seller?.seller_reputation?.level_id || null,
    }));

    res.json({ ok: true, total: r.data.paging?.total || 0, items });
  } catch (e) {
    const status = e.response?.status || 500;
    res.status(status).json({ ok: false, error: e.response?.data?.message || e.message });
  }
});

// ═══════════════════════════════════════════════════════════════
// v1.8 | 2026-06-16 | Token ML para busca via Cloudflare Worker
// Prioridade: 1) app token (client_credentials, read_catalog scope)
//             2) user token (fallback)
// App token tem read_catalog scope e funciona para buscar concorrentes
// ═══════════════════════════════════════════════════════════════
let _mlAppTokenCache = null; // { token, expiresAt }

async function getMlAppToken() {
  const now = Date.now();
  if (_mlAppTokenCache && _mlAppTokenCache.expiresAt > now + 60000) {
    return _mlAppTokenCache.token;
  }
  try {
    const { data } = await axios.post(
      'https://api.mercadolibre.com/oauth/token',
      new URLSearchParams({
        grant_type:    'client_credentials',
        client_id:     process.env.ML_CLIENT_ID || process.env.ML_APP_ID,
        client_secret: process.env.ML_CLIENT_SECRET || process.env.ML_SECRET,
      }),
      { headers: { 'Content-Type': 'application/x-www-form-urlencoded' }, timeout: 8000 }
    );
    _mlAppTokenCache = { token: data.access_token, expiresAt: now + (data.expires_in || 21600) * 1000 };
    return _mlAppTokenCache.token;
  } catch (e) {
    console.error('ML app token error:', e.response?.data || e.message);
    return null;
  }
}

app.get('/api/ml/token', auth, async (req, res) => {
  try {
    // Tenta gerar app token (client_credentials) — tem read_catalog scope para busca de concorrentes
    const appToken = await getMlAppToken();
    if (appToken) return res.json({ token: appToken, type: 'app' });

    // Fallback: token pessoal do usuário
    const { rows } = await db.query(
      `SELECT access_token FROM marketplace_accounts
       WHERE user_id=$1 AND platform='mercadolivre' AND is_active=true AND access_token IS NOT NULL
       LIMIT 1`,
      [req.user.id]
    );
    res.json({ token: rows[0]?.access_token || null, type: 'user' });
  } catch (e) {
    res.status(500).json({ token: null });
  }
});

// ═══════════════════════════════════════════════════════════════
// Pesquisa de Mercado — implementação futura
// ═══════════════════════════════════════════════════════════════
app.get('/api/ml/search', auth, async (req, res) => {
  res.status(503).json({ ok: false, error: 'Módulo em desenvolvimento' });
});

// ═══════════════════════════════════════════════════════════════
// SKUs do banco para o picker de kits
// ═══════════════════════════════════════════════════════════════
app.get('/api/skus', auth, async (req, res) => {
  try {
    const uid = req.user.id;
    const result = await db.query(
      `SELECT DISTINCT item_sku, platform, title
       FROM orders
       WHERE user_id = $1
         AND item_sku IS NOT NULL
         AND item_sku <> ''
       ORDER BY platform, item_sku`,
      [uid]
    );
    const byPlat = {};
    for (const row of result.rows) {
      const p = row.platform || 'outro';
      if (!byPlat[p]) byPlat[p] = [];
      byPlat[p].push({ sku: row.item_sku, title: row.title || row.item_sku });
    }
    res.json({ ok: true, data: byPlat });
  } catch (e) {
    res.status(500).json({ ok: false, error: e.message });
  }
});


// ═══════════════════════════════════════════════════════════════
// v5.14 | 2026-06-17 | Perguntas & Respostas — Mercado Livre
// GET  /api/questions        → busca perguntas não respondidas de todas as contas ML
// POST /api/questions/:id/answer → envia resposta a uma pergunta
// ═══════════════════════════════════════════════════════════════

app.get('/api/questions', auth, async (req, res) => {
  try {
    const uid = req.user.id;
    // Busca todas as contas ML ativas do usuário
    const { rows: accounts } = await db.query(
      `SELECT * FROM marketplace_accounts
       WHERE user_id=$1 AND platform='mercadolivre' AND is_active=true AND access_token IS NOT NULL`,
      [uid]
    );
    if (!accounts.length) return res.json({ ok: true, questions: [] });

    const allQuestions = [];

    for (const acc of accounts) {
      // Renova token se próximo de expirar
      let token = acc.access_token;
      if (acc.token_expires_at && new Date(acc.token_expires_at) <= new Date(Date.now() + 5*60*1000)) {
        const newToken = await refreshMLToken(acc);
        if (newToken) token = newToken;
      }

      // Busca seller_id
      let sellerId = acc.seller_id;
      if (!sellerId) {
        try {
          const { data: me } = await axios.get('https://api.mercadolibre.com/users/me', {
            headers: { Authorization: `Bearer ${token}` }
          });
          sellerId = me.id;
          await db.query(`UPDATE marketplace_accounts SET seller_id=$1 WHERE id=$2`, [String(sellerId), acc.id]);
        } catch(e) { continue; }
      }

      try {
        const { data } = await axios.get('https://api.mercadolibre.com/my/received_questions/search', {
          headers: { Authorization: `Bearer ${token}` },
          params: { seller_id: sellerId, status: 'UNANSWERED', limit: 50 }
        });

        const questions = (data.questions || []).map(q => ({
          id:           q.id,
          text:         q.text,
          date_created: q.date_created,
          item_id:      q.item_id,
          item_title:   q.item?.title || null,
          item_image:   q.item?.thumbnail || null,
          buyer_id:     q.from?.id || null,
          buyer_name:   q.from?.nickname || null,
          shop_name:    acc.shop_name,
          account_id:   acc.id,
          token,        // necessário para enviar resposta
        }));

        // Busca título/imagem dos itens que vieram sem dados
        const missingItems = questions.filter(q => !q.item_title).map(q => q.item_id).filter(Boolean);
        if (missingItems.length) {
          try {
            const ids = [...new Set(missingItems)].slice(0, 20).join(',');
            const { data: itemsData } = await axios.get(`https://api.mercadolibre.com/items?ids=${ids}`, {
              headers: { Authorization: `Bearer ${token}` }
            });
            const itemMap = {};
            (itemsData || []).forEach(i => { if(i.body) itemMap[i.body.id] = i.body; });
            questions.forEach(q => {
              if (!q.item_title && itemMap[q.item_id]) {
                q.item_title = itemMap[q.item_id].title;
                q.item_image = itemMap[q.item_id].thumbnail;
              }
            });
          } catch(e) { /* ignora erro de item */ }
        }

        allQuestions.push(...questions);
      } catch(e) {
        console.error('[Questions] Erro conta', acc.shop_name, e.response?.data || e.message);
      }
    }

    // Ordena mais recentes primeiro
    allQuestions.sort((a,b) => new Date(b.date_created) - new Date(a.date_created));

    // Remove token do retorno (segurança)
    const safe = allQuestions.map(({ token: _t, ...q }) => q);
    res.json({ ok: true, questions: safe, total: safe.length });
  } catch(e) {
    res.status(500).json({ ok: false, error: e.message });
  }
});

app.post('/api/questions/:questionId/answer', auth, async (req, res) => {
  try {
    const uid = req.user.id;
    const { questionId } = req.params;
    const { text, account_id } = req.body;

    if (!text?.trim()) return res.status(400).json({ ok: false, error: 'Resposta não pode ser vazia' });

    // Busca conta correta
    const { rows } = await db.query(
      `SELECT * FROM marketplace_accounts
       WHERE user_id=$1 AND platform='mercadolivre' AND is_active=true AND access_token IS NOT NULL
       ${account_id ? 'AND id=$2' : ''} LIMIT 1`,
      account_id ? [uid, account_id] : [uid]
    );
    if (!rows.length) return res.status(404).json({ ok: false, error: 'Conta ML não encontrada' });

    const acc = rows[0];
    let token = acc.access_token;
    if (acc.token_expires_at && new Date(acc.token_expires_at) <= new Date(Date.now() + 5*60*1000)) {
      const newToken = await refreshMLToken(acc);
      if (newToken) token = newToken;
    }

    const { data } = await axios.post('https://api.mercadolibre.com/answers', {
      question_id: Number(questionId),
      text: text.trim()
    }, { headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' } });

    console.log('[Questions] ✅ Resposta enviada para pergunta', questionId, 'conta', acc.shop_name);
    res.json({ ok: true, answer: data });
  } catch(e) {
    const mlErr = e.response?.data;
    console.error('[Questions] Erro ao responder', e.response?.status, mlErr || e.message);
    res.status(e.response?.status || 500).json({ ok: false, error: mlErr?.message || e.message });
  }
});

// ═══════════════════════════════════════════════════════════════
// v5.14 | 2026-06-19 | CODE SOFTWARE — Integração API Karaka
// Só disponível para a conta interna (INTERNAL_EMAIL)
// Env: KARAKA_API_URL, KARAKA_API_KEY
// ═══════════════════════════════════════════════════════════════
const KARAKA_API_URL = process.env.KARAKA_API_URL || 'http://177.67.241.33:8085';
const KARAKA_API_KEY = process.env.KARAKA_API_KEY || 'JO3P87QO4B1DmlhAN3Dt';
const KARAKA_INTERNAL_EMAIL = process.env.INTERNAL_EMAIL || 'holdinglevelup@gmail.com';
let _karakaTokenCache = null; // { token, expiresAt }

// v5.15 — Telegram: envia notificação de venda
async function ssTelegramNotify(msg) {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  const chatId = process.env.TELEGRAM_CHAT_ID;
  if (!token || !chatId) return;
  try {
    await axios.post(`https://api.telegram.org/bot${token}/sendMessage`, {
      chat_id: chatId, text: msg, parse_mode: 'HTML'
    }, { timeout: 5000 });
  } catch(e) { console.log('[Telegram]', e.message); }
}

async function karakaGetToken() {
  if (_karakaTokenCache && _karakaTokenCache.expiresAt > Date.now() + 60000)
    return _karakaTokenCache.token;
  const { data } = await axios.post(`${KARAKA_API_URL}/login`, null, {
    headers: { 'x-api-key': KARAKA_API_KEY },
    timeout: 8000
  });
  if (!data.token) throw new Error('Karaka API: token não retornado');
  // JWT expira em ~24h, cacheia por 23h
  _karakaTokenCache = { token: data.token, expiresAt: Date.now() + 23 * 3600 * 1000 };
  console.log('[CodeSoftware] ✅ Token obtido');
  return data.token;
}

function karakaMapOrder(sale) {
  // Monta order_date a partir de DD/MM/YYYY
  const [d, m, y] = (sale.data_emissao || '').split('/');
  const orderDate = d && m && y ? new Date(`${y}-${m}-${d}T12:00:00Z`).toISOString() : new Date().toISOString();

  const cancelled = !!sale.cancelado && sale.cancelado !== '';
  const itens = Array.isArray(sale.itens) ? sale.itens : [];
  const comissaoTotal = itens.reduce((s, i) => s + Number(i.vr_comissao || 0), 0);
  const qty = itens.reduce((s, i) => s + Number(i.quantidade || 1), 0);

  // Título: NOME_FANTASIA (ou razao_social) - VENDEDOR NOME
  const clienteNome = sale.cliente?.nome_fantasia || sale.cliente?.razao_social || 'Cliente';
  const vendedorNome = sale.vendedor?.nome || '';
  const itemTitle = vendedorNome
    ? `${clienteNome} - VENDEDOR ${vendedorNome}`
    : clienteNome;

  // SKU = código do cliente (CLI-{id}) — custo vem da API, não do cadastro de produtos
  const itemSku = sale.cliente?.id ? `CLI-${sale.cliente.id}` : 'CLI-0';

  // Valores conforme mapeamento:
  // vr_produto = valor do produto, vr_desconto = tarifa, vr_frete = frete, custo_total_venda = custo
  const totalAmount = Number(sale.vr_produto || sale.vr_nota_fiscal || 0);
  const platformFee = Number(sale.vr_desconto || 0) + comissaoTotal;
  const freight     = Number(sale.vr_frete || 0);
  const totalCost   = Number(sale.custo_total_venda || 0);
  const profit      = cancelled ? 0 : totalAmount - platformFee - freight - totalCost;

  return {
    platform:           'codesoftware',
    shop_name:          'CODE SOFTWARE',
    platform_order_id:  String(sale.id),
    item_title:         itemTitle,
    item_sku:           itemSku,
    item_image:         null,
    quantity:           qty,
    total_amount:       totalAmount,
    platform_fee:       platformFee,
    shipping_fee:       freight,
    tax_amount:         0,
    total_cost:         totalCost,
    profit:             cancelled ? 0 : profit,
    status:             cancelled ? 'cancelled' : 'paid',
    fulfillment_type:   'normal',
    order_date:         orderDate,
    buyer_name:         sale.cliente?.razao_social || sale.cliente?.nome_fantasia || null,
    payment_method:     sale.modelo_nota || null,
  };
}

// Debug — insere venda falsa para testar notificações
app.post('/api/debug/fake-sale', auth, async (req, res) => {
  if (req.user.email !== (process.env.INTERNAL_EMAIL || 'holdinglevelup@gmail.com'))
    return res.status(403).json({ error: 'Acesso restrito' });
  const fakeId = 'FAKE_' + Date.now();
  const plat = req.body.platform || 'mercadolivre';
  const valor = req.body.valor || 299.90;
  const titulo = req.body.titulo || '🧪 Venda de Teste — SaleSync Debug';
  await db.query(`
    INSERT INTO marketplace_orders
      (user_id, platform, account_id, platform_order_id, shop_name, item_title, item_sku,
       quantity, total_amount, paid_amount, platform_fee, shipping_fee, tax_amount,
       status, fulfillment_type, order_date, updated_at)
    VALUES ($1,$2,NULL,$3,$4,$5,$6,1,$7,$7,0,0,0,'paid','normal',NOW(),NOW())
    ON CONFLICT (user_id, platform, platform_order_id) DO NOTHING`,
    [req.user.id, plat, fakeId, 'DEBUG', titulo, 'SKU-TEST', valor]);
  res.json({ ok: true, order_id: fakeId, platform: plat, valor, titulo });
});

// Debug — apaga vendas fake
app.delete('/api/debug/fake-sale', auth, async (req, res) => {
  if (req.user.email !== (process.env.INTERNAL_EMAIL || 'holdinglevelup@gmail.com'))
    return res.status(403).json({ error: 'Acesso restrito' });
  const { rowCount } = await db.query(
    `DELETE FROM marketplace_orders WHERE user_id=$1 AND platform_order_id LIKE 'FAKE_%'`,
    [req.user.id]);
  res.json({ ok: true, deleted: rowCount });
});

// Debug — retorna raw JSON da Karaka sem salvar
app.get('/api/codesoftware/raw', auth, async (req, res) => {
  if (req.user.email !== KARAKA_INTERNAL_EMAIL)
    return res.status(403).json({ error: 'Acesso restrito' });
  try {
    const days = Number(req.query.days || 30);
    const toDate   = new Date();
    const fromDate = new Date(Date.now() - days * 86400000);
    const fmt = d => d.toISOString().split('T')[0];
    const token = await karakaGetToken();
    const { data } = await axios.get(`${KARAKA_API_URL}/karaka/vendas`, {
      headers: { Authorization: `Bearer ${token}` },
      params: { inicio: fmt(fromDate), fim: fmt(toDate) },
      timeout: 15000
    });
    res.json(data);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// Status da API Karaka
app.get('/api/codesoftware/status', auth, async (req, res) => {
  if (req.user.email !== KARAKA_INTERNAL_EMAIL)
    return res.status(403).json({ ok: false, error: 'Acesso restrito' });
  try {
    await karakaGetToken();
    res.json({ ok: true, online: true });
  } catch (e) {
    res.json({ ok: false, online: false, error: e.message });
  }
});

// Sync de vendas Code Software
app.post('/api/codesoftware/sync', auth, async (req, res) => {
  if (req.user.email !== KARAKA_INTERNAL_EMAIL)
    return res.status(403).json({ ok: false, error: 'Acesso restrito' });
  try {
    const uid = req.user.id;
    const days = Number(req.query.days || 30);
    const toDate   = new Date();
    const fromDate = new Date(Date.now() - days * 86400000);
    const fmt = d => d.toISOString().split('T')[0]; // YYYY-MM-DD

    const token = await karakaGetToken();
    const { data: sales } = await axios.get(`${KARAKA_API_URL}/karaka/vendas`, {
      headers: { Authorization: `Bearer ${token}` },
      params: { inicio: fmt(fromDate), fim: fmt(toDate) },
      timeout: 15000
    });

    const orders = Array.isArray(sales) ? sales : [];
    console.log(`[CodeSoftware] ${orders.length} vendas recebidas (${fmt(fromDate)} → ${fmt(toDate)})`);

    let count = 0;
    for (const sale of orders) {
      const o = karakaMapOrder(sale);
      await db.query(`
        INSERT INTO marketplace_orders
          (user_id, platform, account_id, platform_order_id, shop_name, item_title, item_sku,
           quantity, total_amount, paid_amount, platform_fee, shipping_fee, tax_amount,
           status, fulfillment_type, order_date, buyer_name, raw_json, updated_at)
        VALUES ($1,'codesoftware',NULL,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,NOW())
        ON CONFLICT (user_id, platform, platform_order_id) DO UPDATE SET
          item_title=EXCLUDED.item_title, item_sku=EXCLUDED.item_sku,
          total_amount=EXCLUDED.total_amount, paid_amount=EXCLUDED.paid_amount,
          platform_fee=EXCLUDED.platform_fee, shipping_fee=EXCLUDED.shipping_fee,
          status=EXCLUDED.status, buyer_name=EXCLUDED.buyer_name,
          raw_json=EXCLUDED.raw_json, updated_at=NOW()`,
        [uid, o.platform_order_id, o.shop_name, o.item_title, o.item_sku,
         o.quantity, o.total_amount, o.total_amount, o.platform_fee, o.shipping_fee, o.tax_amount,
         o.status, o.fulfillment_type, o.order_date, o.buyer_name, JSON.stringify(sale)]);
      count++;
    }

    res.json({ ok: true, synced: count, from: fmt(fromDate), to: fmt(toDate) });
  } catch (e) {
    console.error('[CodeSoftware sync]', e.response?.data || e.message);
    res.status(500).json({ ok: false, error: e.message });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, '0.0.0.0', () => console.log(`⚡ SalesSync v5.2 rodando na porta ${PORT}`));
