# OduDoc Files Service (Hostinger VPS)

This folder contains the file-storage service that runs on the Hostinger VPS at
`files.odudoc.com`. It is uploaded from the dev machine to the VPS via `scp`
and then run under PM2 (process manager).

## Deploy to VPS — one-time setup

Assumes Phase 1 commands (apt install nginx + node + pm2, UFW firewall, SSL)
have already been run on the VPS.

### 1. Upload this folder from your dev machine

From Windows PowerShell / Git Bash at `E:\odudoc`:

```bash
# Copy the folder contents to /opt/odudoc-files on the VPS
scp -r vps-files/* root@69.62.77.194:/opt/odudoc-files/
```

### 2. On the VPS, install dependencies + configure env

```bash
ssh root@69.62.77.194
cd /opt/odudoc-files

# Install node deps as the service user
chown -R odudoc:odudoc /opt/odudoc-files
sudo -u odudoc npm ci --only=production

# Generate strong secrets and save to .env
FILES_API_KEY=$(openssl rand -hex 32)
FILES_SIGNING_SECRET=$(openssl rand -hex 32)
cat > .env <<EOF
FILES_API_KEY=$FILES_API_KEY
FILES_SIGNING_SECRET=$FILES_SIGNING_SECRET
FILES_STORAGE_ROOT=/var/www/files
FILES_PUBLIC_BASE_URL=https://files.odudoc.com
PORT=3000
EOF
chown odudoc:odudoc .env
chmod 600 .env

echo "==============================================="
echo "COPY THIS KEY INTO VERCEL ENV VARS AS FILES_API_KEY:"
echo "$FILES_API_KEY"
echo "==============================================="
```

Record the FILES_API_KEY value — you'll add it to Vercel as an env var.

### 3. Install nginx config

```bash
cp /opt/odudoc-files/nginx.conf /etc/nginx/sites-available/files.odudoc.com
# (symlink + certbot already done in Phase 1 Step 3)
nginx -t && systemctl reload nginx
```

### 4. Start the service under PM2

```bash
cd /opt/odudoc-files
pm2 start ecosystem.config.js --env production
pm2 save
pm2 startup systemd   # follow the printed command to enable boot-time start
```

### 5. Install the retention cron

```bash
chmod +x /opt/odudoc-files/retention-cleanup.sh
# Run daily at 03:00 server time
(crontab -l 2>/dev/null; echo "0 3 * * * /opt/odudoc-files/retention-cleanup.sh") | crontab -
```

### 6. Smoke test

From your dev machine:

```bash
curl https://files.odudoc.com/health
# → {"ok":true,"uptime":...}

# Upload test (replace YOUR_API_KEY):
echo "hello" > test.pdf
curl -H "X-API-Key: YOUR_API_KEY" -F "file=@test.pdf" \
  https://files.odudoc.com/upload/cvs
# → {"success":true,"url":"https://files.odudoc.com/file/cvs/..."}
# Open the returned URL in a browser — should download the file.
```

## Updating the service later

```bash
# Edit files locally, then:
scp -r vps-files/server.js vps-files/ecosystem.config.js root@69.62.77.194:/opt/odudoc-files/
ssh root@69.62.77.194 "cd /opt/odudoc-files && pm2 restart odudoc-files"
```

## Categories & limits

| Category | Max size | Retention | Allowed |
|---|---|---|---|
| cvs | 10 MB | 365 days | .pdf .doc .docx |
| prescriptions | 10 MB | 365 days | .pdf |
| recordings | 2 GB | 365 days | .mp4 .webm .mkv |

## Security model

- **API key** (shared with Vercel) authorizes uploads and deletes.
- **Signed URLs** (HMAC-SHA256) authorize downloads — no session needed.
  Default 7-day TTL per upload; admin can mint fresh URLs via `/sign`.
- Nginx terminates TLS; Node listens on `127.0.0.1:3000` (not exposed publicly).
- Path-traversal guards on filename inputs.
- Retention cron auto-deletes files >365 days old.
