// SalesSync Backend v21 — monthly historical revenue snapshots
// Changes:
// - Backfill ignores current month. Example: in May, it fetches only up to 30/04.
// - /api/analytics/summary returns monthly chart with platform breakdown.
// - Each month includes total, Magalu, Mercado Livre and percentage participation.
// - Safe SQL expected: platform_monthly_snapshots.updated_at exists.
//
// IMPORTANT: merge your existing OAuth routes/env values if your production file has extra marketplace connection routes.

const express = require('express');
const { Pool } = require('pg');
const axios = require('axios');
const crypto = require('crypto');
const cors = require('cors');
const jwt = require('jsonwebtoken');
const PDFDocument = require('pdfkit');
const bwipjs = require('bwip-js');
const { PDFDocument: PDFLibDocument } = require('pdf-lib');
require('dotenv').config();

const app = express();
app.use(cors());
app.use(express.json({ limit: '25mb' }));

const db = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

db.connect()
  .then(async () => {
    console.log('✅ Supabase conectado');
    await ensureAnalyticsSchema();
  })
  .catch(e => console.error('❌ Erro DB:', e.message));

function auth(req, res, next) {
  const raw = req.headers.authorization || '';
  const token = raw.startsWith('Bearer ') ? raw.slice(7) : (req.query.token || null);
  if (!token) return res.status(401).json({ error: 'Token não fornecido' });
  try {
    req.user = jwt.verify(token, process.env.JWT_SECRET);
    next();
  } catch {
    res.status(401).json({ error: 'Token inválido' });
  }
}

async function ensureAnalyticsSchema() {
  await db.query(`
    CREATE TABLE IF NOT EXISTS user_goals (
      id BIGSERIAL PRIMARY KEY,
      user_id UUID NOT NULL UNIQUE,
      revenue_goal_enabled BOOLEAN DEFAULT false,
      monthly_revenue_goal NUMERIC(14,2) DEFAULT 0,
      updated_at TIMESTAMP DEFAULT NOW()
    );
  `);

  await db.query(`
    CREATE TABLE IF NOT EXISTS monthly_snapshots (
      id BIGSERIAL PRIMARY KEY,
      user_id UUID NOT NULL,
      snapshot_month DATE NOT NULL,
      gross_sales NUMERIC(14,2) DEFAULT 0,
      net_profit NUMERIC(14,2) DEFAULT 0,
      orders_count INTEGER DEFAULT 0,
      avg_ticket NUMERIC(14,2) DEFAULT 0,
      best_seller_product TEXT,
      most_profitable_product TEXT,
      created_at TIMESTAMP DEFAULT NOW(),
      updated_at TIMESTAMP DEFAULT NOW(),
      UNIQUE(user_id, snapshot_month)
    );
  `);

  await db.query(`
    CREATE TABLE IF NOT EXISTS platform_monthly_snapshots (
      id BIGSERIAL PRIMARY KEY,
      user_id UUID NOT NULL,
      platform TEXT NOT NULL,
      snapshot_month DATE NOT NULL,
      gross_sales NUMERIC(14,2) DEFAULT 0,
      orders_count INTEGER DEFAULT 0,
      created_at TIMESTAMP DEFAULT NOW(),
      updated_at TIMESTAMP DEFAULT NOW(),
      UNIQUE(user_id, platform, snapshot_month)
    );
  `);

  await db.query(`ALTER TABLE user_goals ADD COLUMN IF NOT EXISTS revenue_goal_enabled BOOLEAN DEFAULT false`);
  await db.query(`ALTER TABLE user_goals ADD COLUMN IF NOT EXISTS monthly_revenue_goal NUMERIC(14,2) DEFAULT 0`);
  await db.query(`ALTER TABLE user_goals ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP DEFAULT NOW()`);

  await db.query(`ALTER TABLE monthly_snapshots ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP DEFAULT NOW()`);
  await db.query(`ALTER TABLE platform_monthly_snapshots ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP DEFAULT NOW()`);

  await db.query(`CREATE INDEX IF NOT EXISTS idx_platform_monthly_snapshots_user_month ON platform_monthly_snapshots(user_id, snapshot_month)`);
  await db.query(`CREATE INDEX IF NOT EXISTS idx_platform_monthly_snapshots_platform ON platform_monthly_snapshots(platform)`);
}

// ─────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────

function moneyNum(v) {
  const n = Number(v || 0);
  return Number.isFinite(n) ? n : 0;
}

function firstDayOfMonth(d) {
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), 1, 0, 0, 0));
}

function addMonths(date, delta) {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth() + delta, 1, 0, 0, 0));
}

function monthKey(date) {
  return date.toISOString().slice(0, 7);
}

function monthDateSql(date) {
  return date.toISOString().slice(0, 10);
}

function pct(part, total) {
  if (!total) return 0;
  return Math.round((part / total) * 10000) / 100;
}

function normalizePlatform(p) {
  const s = String(p || '').toLowerCase();
  if (s.includes('magalu') || s.includes('magazine')) return 'magalu';
  if (s.includes('mercado')) return 'mercadolivre';
  if (s.includes('ml')) return 'mercadolivre';
  return s || 'unknown';
}

function platformLabel(p) {
  const key = normalizePlatform(p);
  if (key === 'magalu') return 'Magalu';
  if (key === 'mercadolivre') return 'Mercado Livre';
  if (key === 'shopee') return 'Shopee';
  return p || 'Outros';
}

async function getAccounts(userId) {
  const { rows } = await db.query(
    `SELECT * FROM marketplace_accounts
     WHERE user_id=$1 AND is_active=true AND access_token IS NOT NULL`,
    [userId]
  );
  return rows;
}

async function getMagaluAccount(userId) {
  const { rows } = await db.query(
    `SELECT * FROM marketplace_accounts
     WHERE user_id=$1 AND platform='magalu' AND is_active=true AND access_token IS NOT NULL
     LIMIT 1`,
    [userId]
  );
  return rows[0] || null;
}

async function refreshMLToken(account) {
  if (!account.refresh_token) return account.access_token;
  if (account.token_expires_at && new Date(account.token_expires_at) > new Date(Date.now() + 5 * 60 * 1000)) {
    return account.access_token;
  }

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
    `UPDATE marketplace_accounts
     SET access_token=$1, refresh_token=$2, token_expires_at=$3, updated_at=NOW()
     WHERE id=$4`,
    [data.access_token, data.refresh_token || account.refresh_token, new Date(Date.now() + data.expires_in * 1000), account.id]
  );

  return data.access_token;
}

async function refreshMagaluToken(account) {
  if (!account.refresh_token) return account.access_token;
  if (account.token_expires_at && new Date(account.token_expires_at) > new Date(Date.now() + 5 * 60 * 1000)) {
    return account.access_token;
  }

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
     SET access_token=$1, refresh_token=$2, token_expires_at=$3, updated_at=NOW()
     WHERE id=$4`,
    [data.access_token, data.refresh_token || account.refresh_token, new Date(Date.now() + data.expires_in * 1000), account.id]
  );

  return data.access_token;
}

// ─────────────────────────────────────────────────────────────
// Monthly fetchers
// ─────────────────────────────────────────────────────────────

async function fetchMLMonthlyRevenue(account, start, end) {
  const token = await refreshMLToken(account);
  const headers = { Authorization: `Bearer ${token}` };
  const seller = account.platform_shop_id;
  let offset = 0;
  const limit = 50;
  let gross = 0;
  let orders = 0;

  while (offset < 1000) {
    const { data } = await axios.get('https://api.mercadolibre.com/orders/search', {
      params: {
        seller,
        sort: 'date_desc',
        'order.date_created.from': start.toISOString(),
        'order.date_created.to': end.toISOString(),
        limit,
        offset
      },
      headers
    });

    const results = data.results || [];
    for (const o of results) {
      if (String(o.status).toLowerCase() === 'cancelled') continue;
      gross += moneyNum(o.total_amount || o.paid_amount);
      orders += 1;
    }

    if (results.length < limit) break;
    offset += limit;
  }

  return { platform: 'mercadolivre', gross_sales: gross, orders_count: orders };
}

async function fetchMagaluMonthlyRevenue(account, start, end) {
  const token = await refreshMagaluToken(account);
  const headers = { Authorization: `Bearer ${token}` };
  let offset = 0;
  const limit = 50;
  let gross = 0;
  let orders = 0;

  while (offset < 1000) {
    const { data } = await axios.get('https://api.magalu.com/seller/v1/orders', {
      params: {
        created_at__gte: start.toISOString(),
        created_at__lt: end.toISOString(),
        _limit: limit,
        _offset: offset,
        _sort: 'created_at:desc'
      },
      headers
    });

    const results = data.results || [];
    for (const order of results) {
      const deliveries = order.deliveries || [];
      for (const d of deliveries) {
        const status = String(d.status || order.status || '').toLowerCase();
        if (['cancelled', 'canceled'].includes(status)) continue;
        const normalizer = moneyNum(d.amounts?.normalizer || order.amounts?.normalizer || 100) || 100;
        const total = moneyNum(d.amounts?.total || order.amounts?.total) / normalizer;
        gross += total;
        orders += 1;
      }
    }

    if (results.length < limit) break;
    offset += limit;
  }

  return { platform: 'magalu', gross_sales: gross, orders_count: orders };
}

async function savePlatformSnapshot(userId, platform, monthDate, gross, orders) {
  await db.query(
    `INSERT INTO platform_monthly_snapshots
       (user_id, platform, snapshot_month, gross_sales, orders_count, updated_at)
     VALUES ($1,$2,$3,$4,$5,NOW())
     ON CONFLICT (user_id, platform, snapshot_month)
     DO UPDATE SET
       gross_sales=EXCLUDED.gross_sales,
       orders_count=EXCLUDED.orders_count,
       updated_at=NOW()`,
    [userId, normalizePlatform(platform), monthDateSql(monthDate), gross, orders]
  );
}

async function rebuildMonthlySnapshotFromPlatforms(userId, monthDate) {
  const { rows } = await db.query(
    `SELECT
       COALESCE(SUM(gross_sales),0) AS gross_sales,
       COALESCE(SUM(orders_count),0) AS orders_count
     FROM platform_monthly_snapshots
     WHERE user_id=$1 AND snapshot_month=$2`,
    [userId, monthDateSql(monthDate)]
  );

  const gross = moneyNum(rows[0]?.gross_sales);
  const orders = Number(rows[0]?.orders_count || 0);
  const avg = orders ? gross / orders : 0;

  await db.query(
    `INSERT INTO monthly_snapshots
       (user_id, snapshot_month, gross_sales, orders_count, avg_ticket, updated_at)
     VALUES ($1,$2,$3,$4,$5,NOW())
     ON CONFLICT (user_id, snapshot_month)
     DO UPDATE SET
       gross_sales=EXCLUDED.gross_sales,
       orders_count=EXCLUDED.orders_count,
       avg_ticket=EXCLUDED.avg_ticket,
       updated_at=NOW()`,
    [userId, monthDateSql(monthDate), gross, orders, avg]
  );
}

// ─────────────────────────────────────────────────────────────
// Auth minimal
// ─────────────────────────────────────────────────────────────

app.post('/api/auth/login', async (req, res) => {
  const { email, password } = req.body;
  try {
    const { rows } = await db.query(
      `SELECT id,name,email,plan
       FROM users
       WHERE email=$1 AND password_hash=crypt($2,password_hash) AND is_active=true`,
      [email, password]
    );
    if (!rows.length) return res.status(401).json({ error: 'E-mail ou senha incorretos' });
    const token = jwt.sign({ id: rows[0].id, email }, process.env.JWT_SECRET, { expiresIn: '30d' });
    res.json({ success: true, token, user: rows[0] });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// ─────────────────────────────────────────────────────────────
// Goals
// ─────────────────────────────────────────────────────────────

app.get('/api/user-goals', auth, async (req, res) => {
  try {
    const { rows } = await db.query(
      `SELECT revenue_goal_enabled, monthly_revenue_goal
       FROM user_goals WHERE user_id=$1`,
      [req.user.id]
    );

    res.json({
      success: true,
      data: rows[0] || {
        revenue_goal_enabled: false,
        monthly_revenue_goal: 0
      }
    });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

app.post('/api/user-goals', auth, async (req, res) => {
  try {
    const enabled = Boolean(req.body.revenue_goal_enabled);
    const goal = moneyNum(req.body.monthly_revenue_goal);

    const { rows } = await db.query(
      `INSERT INTO user_goals
         (user_id, revenue_goal_enabled, monthly_revenue_goal, updated_at)
       VALUES ($1,$2,$3,NOW())
       ON CONFLICT (user_id)
       DO UPDATE SET
         revenue_goal_enabled=EXCLUDED.revenue_goal_enabled,
         monthly_revenue_goal=EXCLUDED.monthly_revenue_goal,
         updated_at=NOW()
       RETURNING revenue_goal_enabled, monthly_revenue_goal`,
      [req.user.id, enabled, goal]
    );

    res.json({ success: true, data: rows[0] });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// ─────────────────────────────────────────────────────────────
// Debug: monthly backfill excluding current month
// ─────────────────────────────────────────────────────────────

app.post('/api/debug/monthly-revenue-backfill', auth, async (req, res) => {
  const months = Math.min(Math.max(parseInt(req.query.months || '5', 10), 1), 24);
  const dryRun = String(req.query.dry_run || 'false') === 'true';

  try {
    const now = new Date();
    const currentMonthStart = firstDayOfMonth(now);

    // Last complete months only.
    // Example: current date in May, months=5 => Dec, Jan, Feb, Mar, Apr.
    const monthStarts = [];
    for (let i = months; i >= 1; i--) {
      monthStarts.push(addMonths(currentMonthStart, -i));
    }

    const accounts = await getAccounts(req.user.id);
    const activePlatforms = accounts.map(a => normalizePlatform(a.platform));

    const results = [];

    for (const monthStart of monthStarts) {
      const monthEnd = addMonths(monthStart, 1);
      const monthResult = {
        month: monthKey(monthStart),
        from: monthStart.toISOString(),
        to_exclusive: monthEnd.toISOString(),
        platforms: [],
        total: 0,
        orders_count: 0
      };

      for (const acc of accounts) {
        const platform = normalizePlatform(acc.platform);
        let r = null;

        if (platform === 'mercadolivre') {
          r = await fetchMLMonthlyRevenue(acc, monthStart, monthEnd);
        } else if (platform === 'magalu') {
          r = await fetchMagaluMonthlyRevenue(acc, monthStart, monthEnd);
        } else {
          continue;
        }

        monthResult.platforms.push(r);
        monthResult.total += r.gross_sales;
        monthResult.orders_count += r.orders_count;

        if (!dryRun) {
          await savePlatformSnapshot(req.user.id, r.platform, monthStart, r.gross_sales, r.orders_count);
        }
      }

      if (!dryRun) {
        await rebuildMonthlySnapshotFromPlatforms(req.user.id, monthStart);
      }

      // Add percentages
      monthResult.platforms = monthResult.platforms.map(p => ({
        ...p,
        label: platformLabel(p.platform),
        percentage: pct(p.gross_sales, monthResult.total)
      }));

      results.push(monthResult);
    }

    res.json({
      success: true,
      message: dryRun
        ? 'Backfill simulado. Mês atual NÃO incluído.'
        : 'Backfill salvo. Mês atual NÃO incluído.',
      current_month_skipped: monthKey(currentMonthStart),
      months_requested: months,
      platforms_found: activePlatforms,
      data: results
    });
  } catch (e) {
    console.error('[monthly backfill]', e.response?.data || e.message);
    res.status(500).json({
      error: e.message,
      details: e.response?.data || null
    });
  }
});

// ─────────────────────────────────────────────────────────────
// Analytics summary
// ─────────────────────────────────────────────────────────────

app.get('/api/analytics/summary', auth, async (req, res) => {
  try {
    const now = new Date();
    const currentMonthStart = firstDayOfMonth(now);
    const currentMonthKey = monthKey(currentMonthStart);

    const { rows: goalRows } = await db.query(
      `SELECT revenue_goal_enabled, monthly_revenue_goal
       FROM user_goals WHERE user_id=$1`,
      [req.user.id]
    );
    const goals = goalRows[0] || { revenue_goal_enabled: false, monthly_revenue_goal: 0 };

    // Historical monthly chart: includes saved snapshots only.
    const { rows: platformRows } = await db.query(
      `SELECT
         snapshot_month,
         platform,
         gross_sales,
         orders_count
       FROM platform_monthly_snapshots
       WHERE user_id=$1
       ORDER BY snapshot_month ASC, platform ASC`,
      [req.user.id]
    );

    const byMonth = new Map();

    for (const row of platformRows) {
      const key = row.snapshot_month.toISOString
        ? row.snapshot_month.toISOString().slice(0, 7)
        : String(row.snapshot_month).slice(0, 7);

      if (!byMonth.has(key)) {
        byMonth.set(key, {
          month: key,
          total: 0,
          orders_count: 0,
          platforms: {}
        });
      }

      const bucket = byMonth.get(key);
      const platform = normalizePlatform(row.platform);
      const value = moneyNum(row.gross_sales);
      const orders = Number(row.orders_count || 0);

      bucket.total += value;
      bucket.orders_count += orders;
      bucket.platforms[platform] = {
        platform,
        label: platformLabel(platform),
        gross_sales: value,
        orders_count: orders,
        percentage: 0
      };
    }

    const monthlyChart = Array.from(byMonth.values()).map(m => {
      const platforms = Object.values(m.platforms).map(p => ({
        ...p,
        percentage: pct(p.gross_sales, m.total)
      }));

      return {
        month: m.month,
        total: Math.round(m.total * 100) / 100,
        orders_count: m.orders_count,
        avg_ticket: m.orders_count ? Math.round((m.total / m.orders_count) * 100) / 100 : 0,
        magalu: m.platforms.magalu?.gross_sales || 0,
        mercadolivre: m.platforms.mercadolivre?.gross_sales || 0,
        platforms
      };
    });

    // Current month from monthly_snapshots if exists, otherwise 0.
    const { rows: currentRows } = await db.query(
      `SELECT gross_sales, net_profit, orders_count, avg_ticket
       FROM monthly_snapshots
       WHERE user_id=$1 AND snapshot_month=$2
       LIMIT 1`,
      [req.user.id, monthDateSql(currentMonthStart)]
    );

    const current = currentRows[0] || {
      gross_sales: 0,
      net_profit: 0,
      orders_count: 0,
      avg_ticket: 0
    };

    const revenue = moneyNum(current.gross_sales);
    const goal = moneyNum(goals.monthly_revenue_goal);
    const goalEnabled = Boolean(goals.revenue_goal_enabled);
    const missing = goalEnabled ? Math.max(0, goal - revenue) : 0;
    const progress = goalEnabled && goal ? pct(revenue, goal) : 0;

    // Simple projection: current revenue / elapsed days * days in month
    const elapsedDay = now.getUTCDate();
    const daysInMonth = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 0)).getUTCDate();
    const projected = elapsedDay ? (revenue / elapsedDay) * daysInMonth : 0;

    res.json({
      success: true,
      data: {
        current_month: currentMonthKey,
        current: {
          gross_sales: revenue,
          net_profit: moneyNum(current.net_profit),
          orders_count: Number(current.orders_count || 0),
          avg_ticket: moneyNum(current.avg_ticket)
        },
        goal: {
          enabled: goalEnabled,
          monthly_revenue_goal: goal,
          missing_to_goal: missing,
          progress_pct: progress,
          projected_revenue: Math.round(projected * 100) / 100,
          will_hit_goal: goalEnabled && goal > 0 ? projected >= goal : null
        },
        monthly_chart: monthlyChart,
        monthly_platform_chart: monthlyChart,
        tooltip_hint: 'Use platforms[] para mostrar Magalu/Mercado Livre e participação percentual ao passar o mouse.'
      }
    });
  } catch (e) {
    console.error('[analytics summary]', e.message);
    res.status(500).json({ error: e.message });
  }
});

// ─────────────────────────────────────────────────────────────
// Printable deliveries placeholder route
// Keep your production printing routes from v14/v19.
// ─────────────────────────────────────────────────────────────

app.get('/api/magalu/printable-deliveries', auth, async (req, res) => {
  res.json({
    success: true,
    warning: 'Mantenha aqui a rota de impressão da sua versão v19/v14. Este arquivo v21 foca no backfill mensal e summary.',
    data: []
  });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`🚀 SalesSync backend v21 rodando na porta ${PORT}`));
