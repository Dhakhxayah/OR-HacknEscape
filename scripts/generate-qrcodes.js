require('dotenv').config();

const fs = require('fs');
const path = require('path');
const QRCode = require('qrcode');
const qrCodes = require('../config/qr-codes.json');

const BASE_URL = (process.env.BASE_URL || 'http://localhost:3000').replace(/\/+$/, '');
const OUT_DIR = path.join(__dirname, '..', 'qr-output');

async function main() {
  fs.mkdirSync(OUT_DIR, { recursive: true });

  const referenceRows = ['slug,type,label,url'];

  for (const entry of qrCodes) {
    const url = `${BASE_URL}/${entry.slug}`;
    const safeLabel = entry.label.replace(/[^a-zA-Z0-9]+/g, '_').replace(/^_+|_+$/g, '');
    const fileName = `${entry.type}-${safeLabel}.png`;
    const filePath = path.join(OUT_DIR, fileName);

    await QRCode.toFile(filePath, url, { width: 600, margin: 2 });
    console.log(`Generated ${fileName} -> ${url}`);

    referenceRows.push(`${entry.slug},${entry.type},${entry.label},${url}`);
  }

  const referencePath = path.join(OUT_DIR, '_reference_DO_NOT_PRINT.csv');
  fs.writeFileSync(referencePath, referenceRows.join('\n'));

  console.log(`\nDone. ${qrCodes.length} QR codes written to ${OUT_DIR}`);
  console.log('IMPORTANT: print only the PNG files. Keep _reference_DO_NOT_PRINT.csv private —');
  console.log('it reveals which QR codes are legit vs decoy.');
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
