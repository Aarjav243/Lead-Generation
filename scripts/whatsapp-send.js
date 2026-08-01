// Sends a WhatsApp message to each lead in a CSV, via your own WhatsApp Web session.
// Usage:
//   node scripts/whatsapp-send.js --leads <file.csv> --message <file.txt> [--log <file.csv>] [--limit N] [--dry-run|--live]
//
// Leads CSV needs a "phone" column (any format — see lib/normalize-phone.js) and whatever
// columns your message template references, e.g. "title" for a business name.
// Message file is plain text; use {column_name} placeholders matching the CSV's headers.
// See examples/message-template.example.txt and examples/leads.example.csv.

const fs = require("fs");
const path = require("path");
const { parse } = require("csv-parse/sync");
const { normalizePhone } = require("./lib/normalize-phone");

function arg(name, fallback) {
  const flag = process.argv.find(a => a.startsWith(`--${name}=`));
  if (flag) return flag.split("=").slice(1).join("=");
  const idx = process.argv.indexOf(`--${name}`);
  if (idx !== -1 && process.argv[idx + 1]) return process.argv[idx + 1];
  return fallback;
}

const LEADS_CSV = arg("leads");
const MESSAGE_FILE = arg("message");
const LOG_CSV = path.resolve(arg("log", "whatsapp-sent-log.csv"));
const isLive = process.argv.includes("--live");
const LIMIT = arg("limit") ? parseInt(arg("limit"), 10) : null;
const DELAY_MIN_MS = 30_000;
const DELAY_MAX_MS = 60_000;

if (!LEADS_CSV || !MESSAGE_FILE) {
  console.error(
    "Usage: node scripts/whatsapp-send.js --leads <file.csv> --message <file.txt> [--log <file.csv>] [--limit N] [--live]\n" +
    "See examples/message-template.example.txt and examples/leads.example.csv."
  );
  process.exit(1);
}

const MESSAGE_TEMPLATE = fs.readFileSync(path.resolve(MESSAGE_FILE), "utf-8").trim();

function loadAlreadySent() {
  if (!fs.existsSync(LOG_CSV)) return new Set();
  const rows = parse(fs.readFileSync(LOG_CSV, "utf-8"), { columns: true, skip_empty_lines: true });
  return new Set(rows.filter(r => r.status === "sent").map(r => r.phone));
}

function appendLog(phone, title, status, detail) {
  const isNew = !fs.existsSync(LOG_CSV);
  if (isNew) fs.writeFileSync(LOG_CSV, "phone,title,status,detail,timestamp\n");
  const row = [phone, title, status, detail || "", new Date().toISOString()]
    .map(v => `"${String(v).replace(/"/g, '""')}"`)
    .join(",");
  fs.appendFileSync(LOG_CSV, row + "\n");
}

function buildTargets() {
  const records = parse(fs.readFileSync(LEADS_CSV, "utf-8"), { columns: true, skip_empty_lines: true });
  const alreadySent = loadAlreadySent();
  const targets = [];
  for (const r of records) {
    const phone = normalizePhone(r.phone);
    if (!phone) {
      appendLog(r.phone || "(empty)", r.title, "skipped_no_valid_phone");
      continue;
    }
    if (alreadySent.has(phone)) continue;
    const message = MESSAGE_TEMPLATE.replace(/\{(\w+)\}/g, (_, col) => r[col] ?? "");
    targets.push({ phone, title: r.title, message });
  }
  return targets;
}

async function main() {
  let targets = buildTargets();
  if (LIMIT) targets = targets.slice(0, LIMIT);

  if (!isLive) {
    console.log(`DRY RUN — ${targets.length} messages would be sent (no login, nothing sent):\n`);
    for (const t of targets) {
      console.log(`-> ${t.phone} (${t.title})\n   ${t.message}\n`);
    }
    console.log("Run with --live to actually send.");
    return;
  }

  const { Client, LocalAuth } = require("whatsapp-web.js");
  const qrTerminal = require("qrcode-terminal");
  const qrImage = require("qrcode");

  const QR_FILE = path.join(__dirname, "..", "whatsapp-qr.png");
  const client = new Client({ authStrategy: new LocalAuth() });

  client.on("qr", qr => {
    qrTerminal.generate(qr, { small: true });
    qrImage.toFile(QR_FILE, qr, { width: 400 }, err => {
      if (err) console.error("Failed to write QR image:", err.message);
      else console.log(`QR saved to ${QR_FILE} — open it and scan with WhatsApp (Linked Devices).`);
    });
  });

  client.on("ready", async () => {
    console.log(`Logged in. Sending ${targets.length} messages, ${DELAY_MIN_MS / 1000}-${DELAY_MAX_MS / 1000}s apart...\n`);
    for (const t of targets) {
      try {
        await client.sendMessage(`${t.phone}@c.us`, t.message);
        console.log(`sent -> ${t.phone} (${t.title})`);
        appendLog(t.phone, t.title, "sent");
      } catch (err) {
        console.error(`failed -> ${t.phone} (${t.title}): ${err.message}`);
        appendLog(t.phone, t.title, "failed", err.message);
      }
      const wait = DELAY_MIN_MS + Math.random() * (DELAY_MAX_MS - DELAY_MIN_MS);
      await new Promise(res => setTimeout(res, wait));
    }
    console.log("\nDone.");
    await client.destroy();
    process.exit(0);
  });

  client.initialize();
}

main();
