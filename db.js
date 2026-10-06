const Database = require('better-sqlite3');
const path = require('path');

const DB_PATH = process.env.DB_PATH || path.join(__dirname, 'data.db');
const db = new Database(DB_PATH);

db.pragma('journal_mode = WAL');

db.exec(`
  CREATE TABLE IF NOT EXISTS clicks (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    slug TEXT NOT NULL,
    label TEXT,
    team_name TEXT NOT NULL,
    player_name TEXT NOT NULL,
    email TEXT NOT NULL,
    ip TEXT,
    user_agent TEXT,
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS settings (
    key TEXT PRIMARY KEY,
    value TEXT NOT NULL
  );
`);

const DEFAULT_CLUE = 'Clue coming soon — check back closer to the event!';

const seedClue = db.prepare(
  `INSERT INTO settings (key, value) SELECT 'clue', ? WHERE NOT EXISTS (SELECT 1 FROM settings WHERE key = 'clue')`
);
seedClue.run(DEFAULT_CLUE);

function getClue() {
  const row = db.prepare(`SELECT value FROM settings WHERE key = 'clue'`).get();
  return row ? row.value : DEFAULT_CLUE;
}

function setClue(value) {
  db.prepare(
    `INSERT INTO settings (key, value) VALUES ('clue', ?)
     ON CONFLICT(key) DO UPDATE SET value = excluded.value`
  ).run(value);
}

function recordClick({ slug, label, teamName, playerName, email, ip, userAgent }) {
  db.prepare(
    `INSERT INTO clicks (slug, label, team_name, player_name, email, ip, user_agent)
     VALUES (?, ?, ?, ?, ?, ?, ?)`
  ).run(slug, label, teamName, playerName, email, ip, userAgent);
}

function getAllClicks() {
  return db.prepare(`SELECT * FROM clicks ORDER BY created_at DESC`).all();
}

module.exports = { db, getClue, setClue, recordClick, getAllClicks };
