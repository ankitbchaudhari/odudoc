/**
 * OduDoc File Storage Service
 * -----------------------------------------------
 * Runs on Hostinger VPS (files.odudoc.com).
 * Accepts uploads from the Vercel Next.js app over HTTPS,
 * stores them on disk, and serves them back via signed URLs.
 *
 * Shared-secret authentication via X-API-Key header.
 * Nginx handles TLS termination in front of this service on port 3000.
 */

const express = require("express");
const multer = require("multer");
const morgan = require("morgan");
const path = require("path");
const fs = require("fs");
const crypto = require("crypto");

const PORT = process.env.PORT || 3000;
const API_KEY = process.env.FILES_API_KEY;
const SIGNING_SECRET = process.env.FILES_SIGNING_SECRET;
const STORAGE_ROOT = process.env.FILES_STORAGE_ROOT || "/var/www/files";
const PUBLIC_BASE_URL = process.env.FILES_PUBLIC_BASE_URL || "https://files.odudoc.com";

if (!API_KEY || !SIGNING_SECRET) {
  console.error("FATAL: FILES_API_KEY and FILES_SIGNING_SECRET env vars required");
  process.exit(1);
}

const CATEGORIES = {
  cvs: { maxMb: 10, retentionDays: 365, allowed: [".pdf", ".doc", ".docx"] },
  prescriptions: { maxMb: 10, retentionDays: 365, allowed: [".pdf"] },
  recordings: { maxMb: 2048, retentionDays: 365, allowed: [".mp4", ".webm", ".mkv"] },
};

const app = express();
app.use(morgan("combined"));

// Require shared secret on all upload + admin routes
function requireApiKey(req, res, next) {
  if (req.header("x-api-key") !== API_KEY) {
    return res.status(401).json({ error: "Unauthorized" });
  }
  next();
}

// Per-request multer configured for the target category
function buildUploader(category) {
  const cfg = CATEGORIES[category];
  return multer({
    storage: multer.diskStorage({
      destination: (_req, _file, cb) => {
        const dir = path.join(STORAGE_ROOT, category);
        fs.mkdirSync(dir, { recursive: true });
        cb(null, dir);
      },
      filename: (_req, file, cb) => {
        const ext = path.extname(file.originalname).toLowerCase();
        const id = `${Date.now()}-${crypto.randomBytes(6).toString("hex")}`;
        cb(null, `${id}${ext}`);
      },
    }),
    limits: { fileSize: cfg.maxMb * 1024 * 1024 },
    fileFilter: (_req, file, cb) => {
      const ext = path.extname(file.originalname).toLowerCase();
      if (!cfg.allowed.includes(ext)) {
        return cb(new Error(`File type ${ext} not allowed for ${category}`));
      }
      cb(null, true);
    },
  });
}

// --- Signed URLs --------------------------------------------------------
// Format: /file/<category>/<filename>?exp=<unix>&sig=<hmac>
function sign(category, filename, expUnix) {
  return crypto
    .createHmac("sha256", SIGNING_SECRET)
    .update(`${category}/${filename}:${expUnix}`)
    .digest("hex");
}

function verifySig(category, filename, expUnix, sig) {
  if (!sig || !expUnix) return false;
  if (Number(expUnix) < Math.floor(Date.now() / 1000)) return false;
  const expected = sign(category, filename, expUnix);
  return crypto.timingSafeEqual(Buffer.from(sig), Buffer.from(expected));
}

// --- Routes -------------------------------------------------------------

app.get("/health", (_req, res) => res.json({ ok: true, uptime: process.uptime() }));

// Upload: POST /upload/<category>  (multipart form, field name "file")
app.post("/upload/:category", requireApiKey, (req, res, next) => {
  const category = req.params.category;
  if (!CATEGORIES[category]) {
    return res.status(400).json({ error: "Unknown category" });
  }
  const uploader = buildUploader(category).single("file");
  uploader(req, res, (err) => {
    if (err) return res.status(400).json({ error: err.message });
    if (!req.file) return res.status(400).json({ error: "No file uploaded" });

    // Default signed URL valid for 7 days; admin can request longer via ?ttl=
    const ttl = Math.min(Number(req.query.ttl) || 7 * 86400, 30 * 86400);
    const expUnix = Math.floor(Date.now() / 1000) + ttl;
    const sig = sign(category, req.file.filename, expUnix);
    const url = `${PUBLIC_BASE_URL}/file/${category}/${req.file.filename}?exp=${expUnix}&sig=${sig}`;

    res.json({
      success: true,
      category,
      filename: req.file.filename,
      size: req.file.size,
      url, // signed URL the admin page will link to
    });
  });
});

// Generate a fresh signed URL for an existing file (admin convenience)
app.post("/sign/:category/:filename", requireApiKey, (req, res) => {
  const { category, filename } = req.params;
  if (!CATEGORIES[category]) return res.status(400).json({ error: "Unknown category" });
  const filePath = path.join(STORAGE_ROOT, category, filename);
  if (!fs.existsSync(filePath)) return res.status(404).json({ error: "Not found" });
  const ttl = Math.min(Number(req.query.ttl) || 3600, 30 * 86400);
  const expUnix = Math.floor(Date.now() / 1000) + ttl;
  const sig = sign(category, filename, expUnix);
  res.json({
    url: `${PUBLIC_BASE_URL}/file/${category}/${filename}?exp=${expUnix}&sig=${sig}`,
    expiresAt: expUnix,
  });
});

// File download with signed URL verification (no API key required — URL is the auth)
app.get("/file/:category/:filename", (req, res) => {
  const { category, filename } = req.params;
  const { exp, sig } = req.query;

  if (!CATEGORIES[category]) return res.status(400).send("Bad category");
  // Basic path traversal guard
  if (filename.includes("/") || filename.includes("..")) {
    return res.status(400).send("Bad filename");
  }
  if (!verifySig(category, filename, exp, sig)) {
    return res.status(403).send("Invalid or expired signature");
  }
  const filePath = path.join(STORAGE_ROOT, category, filename);
  if (!fs.existsSync(filePath)) return res.status(404).send("Not found");

  res.sendFile(filePath);
});

// Admin: delete a specific file immediately
app.delete("/file/:category/:filename", requireApiKey, (req, res) => {
  const { category, filename } = req.params;
  if (!CATEGORIES[category]) return res.status(400).json({ error: "Bad category" });
  if (filename.includes("/") || filename.includes("..")) {
    return res.status(400).json({ error: "Bad filename" });
  }
  const filePath = path.join(STORAGE_ROOT, category, filename);
  if (!fs.existsSync(filePath)) return res.status(404).json({ error: "Not found" });
  fs.unlinkSync(filePath);
  res.json({ success: true });
});

app.listen(PORT, "127.0.0.1", () => {
  console.log(`OduDoc files service listening on 127.0.0.1:${PORT}`);
  console.log(`Storage root: ${STORAGE_ROOT}`);
  console.log(`Categories: ${Object.keys(CATEGORIES).join(", ")}`);
});
