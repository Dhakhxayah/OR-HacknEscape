require('dotenv').config();

const express = require('express');
const session = require('express-session');
const rateLimit = require('express-rate-limit');
const path = require('path');

const { getClue, setClue, recordClick, getAllClicks } = require('./db');
const qrCodes = require('./config/qr-codes.json');

const app = express();
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));
app.use(express.urlencoded({ extended: false }));
app.use(express.static(path.join(__dirname, 'public')));
app.set('trust proxy', 1);

const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'change-me-before-event';
const SESSION_SECRET = process.env.SESSION_SECRET || 'dev-secret-change-me';
const ALLOWED_EMAIL_DOMAIN = (process.env.ALLOWED_EMAIL_DOMAIN || 'slb.com').toLowerCase();

app.use(
  session({
    secret: SESSION_SECRET,
    resave: false,
    saveUninitialized: false,
    cookie: { httpOnly: true, sameSite: 'lax', maxAge: 1000 * 60 * 60 * 8 },
  })
);

const qrBySlug = new Map(qrCodes.map((q) => [q.slug, q]));

function isSlbEmail(email) {
  return email.trim().toLowerCase().endsWith('@' + ALLOWED_EMAIL_DOMAIN);
}

function requireAdmin(req, res, next) {
  if (req.session && req.session.isAdmin) return next();
  return res.redirect('/admin/login');
}

const submitLimiter = rateLimit({ windowMs: 15 * 60 * 1000, max: 200 });
const loginLimiter = rateLimit({ windowMs: 15 * 60 * 1000, max: 30 });

app.get('/', (req, res) => {
  res.send('Hack n Escape — QR round is live. Scan a code to begin.');
});

// ---- Admin ----
// (registered before the generic /:slug catch-all below, so these exact
// paths always win regardless of what slugs exist in qr-codes.json)

app.get('/admin/login', (req, res) => {
  res.render('admin-login', { error: null });
});

app.post('/admin/login', loginLimiter, (req, res) => {
  const { password } = req.body;
  if (password === ADMIN_PASSWORD) {
    req.session.isAdmin = true;
    return res.redirect('/admin');
  }
  return res.status(401).render('admin-login', { error: 'Incorrect password.' });
});

app.post('/admin/logout', requireAdmin, (req, res) => {
  req.session.destroy(() => res.redirect('/admin/login'));
});

app.get('/admin', requireAdmin, (req, res) => {
  const clicks = getAllClicks();
  res.render('admin', { clicks, clue: getClue() });
});

app.post('/admin/clue', requireAdmin, (req, res) => {
  setClue((req.body.clue || '').trim());
  res.redirect('/admin');
});

app.get('/admin/export.csv', requireAdmin, (req, res) => {
  const clicks = getAllClicks();
  const header = 'id,slug,label,team_name,player_name,email,ip,user_agent,created_at';
  const escape = (v) => `"${String(v ?? '').replace(/"/g, '""')}"`;
  const rows = clicks.map((c) =>
    [c.id, c.slug, c.label, c.team_name, c.player_name, c.email, c.ip, c.user_agent, c.created_at]
      .map(escape)
      .join(',')
  );
  const csv = [header, ...rows].join('\n');
  res.setHeader('Content-Type', 'text/csv');
  res.setHeader('Content-Disposition', 'attachment; filename="decoy-clicks.csv"');
  res.send(csv);
});

// ---- Player-facing QR landing pages ----
// Registered last so they never shadow the literal /admin* routes above.

app.get('/:slug', (req, res) => {
  const entry = qrBySlug.get(req.params.slug);
  if (!entry) return res.status(404).render('notfound');

  if (entry.type === 'legit') {
    return res.render('legit', { clue: getClue() });
  }

  return res.render('decoy', { slug: entry.slug, label: entry.label, variant: entry.variant || 'prize' });
});

app.post('/:slug/submit', submitLimiter, (req, res) => {
  const entry = qrBySlug.get(req.params.slug);
  if (!entry || entry.type !== 'decoy') return res.status(404).render('notfound');

  const teamName = (req.body.teamName || '').trim();
  const playerName = (req.body.playerName || '').trim();
  const email = (req.body.email || '').trim();

  if (!teamName || !playerName || !email) {
    return res.status(400).render('decoy', {
      slug: entry.slug,
      label: entry.label,
      variant: entry.variant || 'prize',
      error: 'Please fill in all fields.',
      teamName,
      playerName,
      email,
    });
  }

  if (!isSlbEmail(email)) {
    return res.status(400).render('decoy', {
      slug: entry.slug,
      label: entry.label,
      variant: entry.variant || 'prize',
      error: `Please use your @${ALLOWED_EMAIL_DOMAIN} email address.`,
      teamName,
      playerName,
      email,
    });
  }

  recordClick({
    slug: entry.slug,
    label: entry.label,
    teamName,
    playerName,
    email,
    ip: req.ip,
    userAgent: req.get('user-agent') || '',
  });

  return res.render('busted', { teamName });
});

app.use((req, res) => res.status(404).render('notfound'));

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Hack n Escape server running on port ${PORT}`);
});
