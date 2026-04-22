// Minimal upload/delete/list service for odudoc file storage on the VPS.
// Sits behind nginx (which handles TLS + static GETs) and exposes three
// endpoints: POST /upload, DELETE /delete, GET /list. All writes require
// the shared secret in the X-Upload-Secret header. Files land under
// UPLOAD_DIR and are served publicly by nginx at PUBLIC_BASE_URL/<pathname>.

const express = require("express");
const multer = require("multer");
const path = require("path");
const fs = require("fs");

const UPLOAD_DIR = process.env.UPLOAD_DIR || "/var/www/odudoc-uploads";
const SECRET = process.env.UPLOAD_SECRET;
const PORT = parseInt(process.env.PORT || "3001", 10);
const MAX_FILE_MB = parseInt(process.env.MAX_FILE_MB || "25", 10);
const PUBLIC_BASE_URL =
  process.env.PUBLIC_BASE_URL || "https://files.odudoc.com";

if (!SECRET || SECRET.length < 16) {
  console.error("UPLOAD_SECRET env is required and must be >=16 chars");
  process.exit(1);
}

fs.mkdirSync(UPLOAD_DIR, { recursive: true });

const app = express();
app.use(express.json({ limit: "1mb" }));
app.disable("x-powered-by");

function auth(req, res, next) {
  if (req.get("x-upload-secret") !== SECRET) {
    return res.status(401).json({ ok: false, error: "unauthorized" });
  }
  next();
}

// Normalize + validate a requested pathname to keep writes inside UPLOAD_DIR.
function sanitizePath(p) {
  if (!p || typeof p !== "string") throw new Error("path required");
  const clean = path.posix
    .normalize("/" + p.replace(/\\/g, "/"))
    .replace(/^\/+/, "");
  if (!clean || clean.includes("..") || clean.startsWith("/")) {
    throw new Error("invalid path");
  }
  return clean;
}

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: MAX_FILE_MB * 1024 * 1024 },
});

app.post("/upload", auth, upload.single("file"), (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ ok: false, error: "no file" });
    const requested = req.body.path || req.file.originalname;
    const pathname = sanitizePath(requested);
    const dest = path.join(UPLOAD_DIR, pathname);
    fs.mkdirSync(path.dirname(dest), { recursive: true });
    fs.writeFileSync(dest, req.file.buffer);
    res.json({
      ok: true,
      url: `${PUBLIC_BASE_URL}/${pathname}`,
      pathname,
      size: req.file.size,
      contentType: req.file.mimetype,
    });
  } catch (e) {
    res.status(400).json({ ok: false, error: e.message });
  }
});

app.delete("/delete", auth, (req, res) => {
  try {
    const raw = req.body?.pathname || req.query.pathname;
    if (!raw) throw new Error("pathname required");
    const pathname = sanitizePath(raw);
    const target = path.join(UPLOAD_DIR, pathname);
    if (fs.existsSync(target)) fs.unlinkSync(target);
    res.json({ ok: true });
  } catch (e) {
    res.status(400).json({ ok: false, error: e.message });
  }
});

app.get("/list", auth, (req, res) => {
  const prefix = (req.query.prefix || "").toString();
  const blobs = [];
  function walk(dir) {
    if (!fs.existsSync(dir)) return;
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) walk(full);
      else {
        const rel = path.relative(UPLOAD_DIR, full).replace(/\\/g, "/");
        if (!prefix || rel.startsWith(prefix)) {
          const st = fs.statSync(full);
          blobs.push({
            url: `${PUBLIC_BASE_URL}/${rel}`,
            pathname: rel,
            size: st.size,
            uploadedAt: st.mtime.toISOString(),
          });
        }
      }
    }
  }
  walk(UPLOAD_DIR);
  res.json({ blobs });
});

app.get("/health", (_req, res) => res.json({ ok: true }));

app.listen(PORT, "127.0.0.1", () => {
  console.log(
    `[odudoc-files] listening on 127.0.0.1:${PORT}, dir=${UPLOAD_DIR}, max=${MAX_FILE_MB}MB`
  );
});
