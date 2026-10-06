# Hack n Escape — QR Phishing-Awareness Round

A small Express app for the QR round: 12 printed QR codes are scattered around
the room, only 2 are legitimate. Scanning a decoy QR leads to a fake
"claim your prize" / "verify your account" page — if a player submits the
form there, their team, name, and SLB email are logged and the team is
flagged out of the round. Scanning a legitimate QR shows the next-round clue.

## How the "spot the phishing" mechanic works here

Every printed QR code encodes the exact same short pattern:
`https://<your-render-url>/scan/<id>` — a random unguessable 7-character id,
nothing else. A QR scanner's own built-in preview is unreliable (some apps
truncate long URLs, some show nothing meaningful, behavior varies by phone),
so instead of relying on it, scanning takes the player to **our own preview
page**. That page displays the crafted, phishing-style URL as a clickable
link — e.g. `https://clue-portal-hacknescape-slb.com` for a legit code, or
`https://prize-claim-hacknescape.xyz` for a decoy — and that's the actual
judgment moment. Tapping the link opens the real clue or decoy-capture page.

This sidesteps every domain/hosting limitation entirely: the displayed text
is just a string we control, so it can end in a real `.com` or a sketchy
`.xyz`/`.co`/`.info`/etc. exactly as written, with no length limit, no
character restrictions, and no dependency on what's actually hosting the
site. Edit the `displayUrl` field per entry in `config/qr-codes.json` to
change what's shown.

The debrief point: the *real* URL (what's in the QR code and the browser's
address bar) is identical and boring for every single code —
`/scan/<random-id>`. The flashy `.com`/`.xyz`-looking text only ever
appears as page content we wrote, never as an actual domain. That mirrors
how real phishing often works: the boring real domain is the part people
skip past, while a trustworthy-looking brand name elsewhere is what
actually gets read.

## 1. Local setup

```powershell
npm install
copy .env.example .env
npm run dev
```

Visit `http://localhost:3000/scan/zpkrdeg` (legit) or
`http://localhost:3000/scan/y9hjnr8` (decoy) to test — each opens the
preview page first, then click the displayed link to continue through.

## 2. Edit the QR list

`config/qr-codes.json` has 12 entries — 2 `"type": "legit"`, 10
`"type": "decoy"`. Each entry has:
- `id` — the random string used in the actual QR/URL (`/scan/<id>`). Keep
  these unguessable — don't make them sequential, or players could just
  guess other ids in the address bar without scanning anything.
- `displayUrl` — the fake "link preview" text shown to players, free-form,
  can look like any domain/TLD you want.
- `label` / `type` / `variant` (`prize` or `account`, decoys only, picks
  which bait copy is shown on the capture form).

## 3. Deploy to Render (free)

1. Push this folder to a GitHub repo (private is fine).
2. On [render.com](https://render.com), **New + → Web Service**, connect the repo.
3. Build command: `npm install`  |  Start command: `npm start`
4. Add environment variables (Render dashboard → Environment):
   - `ADMIN_PASSWORD` — pick something only organizers know
   - `SESSION_SECRET` — any long random string
   - `ALLOWED_EMAIL_DOMAIN` — `slb.com`
   - `BASE_URL` — fill in *after* the first deploy, once you know your Render
     URL, e.g. `https://hacknescape-slb.onrender.com`
5. Deploy. Render gives you a free `https://<name>.onrender.com` URL.

**Free-tier caveat:** Render's free web services spin down after ~15 minutes
of no traffic and take ~30s to wake on the next request. Do a warm-up scan
5–10 minutes before the event starts, and avoid redeploying mid-event (the
SQLite file resets on redeploy/restart). For a smoother experience during
the live event, consider temporarily upgrading to a paid instance for just
that day.

## 4. Generate the printable QR codes

Once `BASE_URL` in `.env` matches your deployed URL:

```powershell
npm run generate-qr
```

This writes PNGs to `qr-output/` named like `legit-Legit_QR_1.png` and
`decoy-Decoy_3.png` — those filenames are for your own organizing only
(never shown to players). Print and scatter the **PNG files**. A
`_reference_DO_NOT_PRINT.csv` is also written there mapping every id to
legit/decoy — keep that file private, don't print, post, or commit it (it's
gitignored already, same as the whole `qr-output/` folder).

## 5. Admin dashboard

Go to `https://<your-url>/admin`, log in with `ADMIN_PASSWORD`.

- See every decoy click in real time: team, player name, email, which QR,
  timestamp. Use the search box to filter, or **Export CSV** for the
  disqualification list.
- Edit the **next-round clue** text any time — it updates instantly on all
  3 legit QR pages, no redeploy needed. It currently says "Clue coming
  soon" as a placeholder.

## Data captured

Only on a decoy-click submission: **team name, player name, SLB email**
(must end in `@slb.com`), plus IP/user-agent and timestamp for
troubleshooting. Nothing is captured just from scanning — only if the form
is submitted.
