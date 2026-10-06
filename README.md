# Hack n Escape — QR Phishing-Awareness Round

A small Express app for the QR round: 12 printed QR codes are scattered around
the room, only 2 are legitimate. Scanning a decoy QR leads to a fake
"claim your prize" / "verify your account" page — if a player submits the
form there, their team, name, and SLB email are logged and the team is
flagged out of the round. Scanning a legitimate QR shows the next-round clue.

## How the "spot the phishing" mechanic works here

All 12 QR codes are hosted on the same real domain (the free Render
subdomain), so the actual hostname never changes. The trick is baked into
the **URL text itself**, mimicking how real phishing links hide a fake
"domain" in plain sight:

- Legit: `.../slb-clue-portal.com` — the string literally ends in `.com`,
  reading like a real, correctly-formed link.
- Decoy: `.../prize-claim.xyz` — ends in a sketchy TLD (`.xyz`, `.co`,
  `.info`, `.live`, `.top`, `.click`, `.site`, `.online`, `.vip`, `.icu`)
  with urgency/prize/"verify now" bait words — exactly like a real
  typosquat link.

**Important limitation:** the real domain (your Render subdomain, e.g.
`or-hacknescape.onrender.com`) always appears *first* in the actual URL —
nothing can move the crafted text in front of it, that's just how URLs
work. Slugs are kept short deliberately so that a QR scanner's truncated
preview still shows enough of the crafted ending before cutting off. Do a
real test scan after deploying to confirm your phone's scanner shows
enough of the URL — if it's still getting cut off, shortening your Render
service name itself (in the Render dashboard) frees up more visible room.

The debrief point: the fake `.xyz`/`.co` text is just part of the path, not
a real domain — the *actual* domain (the part after `https://` and before
the first `/`) is identical on every single QR code. Players who only
eyeball the flashy part of the link and never check the real domain are
exactly who falls for real phishing. Edit `config/qr-codes.json` to tune
wording or add more TLD/bait variations.

## 1. Local setup

```powershell
npm install
copy .env.example .env
npm run dev
```

Visit `http://localhost:3000/slb-clue-portal.com` (legit) or
`http://localhost:3000/prize-claim.xyz` (decoy) to test.

## 2. Edit the QR list

`config/qr-codes.json` has 12 entries — 2 `"type": "legit"`, 10
`"type": "decoy"`. Change slugs/labels/wording freely; the `variant` field on
decoys (`prize` or `account`) picks which bait copy is shown.

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
`_reference_DO_NOT_PRINT.csv` is also written there mapping every slug to
legit/decoy — keep that file private, don't print or post it.

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
