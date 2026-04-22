#!/usr/bin/env bash
# One-shot installer for the odudoc file storage service on the VPS.
# Run as root. Expects server.js and package.json to be next to this script.
set -euo pipefail

DOMAIN="files.odudoc.com"
UPLOAD_DIR="/var/www/odudoc-uploads"
APP_DIR="/opt/odudoc-files"
SECRET_FILE="/root/.odudoc-files-secret"
EMAIL_FOR_CERTBOT="admin@odudoc.com"

if [ "$EUID" -ne 0 ]; then
  echo "Run as root (sudo bash install.sh)"; exit 1
fi

SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"

# --- Secret --------------------------------------------------------------
if [ ! -s "$SECRET_FILE" ]; then
  openssl rand -hex 32 > "$SECRET_FILE"
  chmod 600 "$SECRET_FILE"
fi
SECRET="$(cat "$SECRET_FILE")"

# --- Directories ---------------------------------------------------------
mkdir -p "$UPLOAD_DIR"
chown -R www-data:www-data "$UPLOAD_DIR"
chmod 755 "$UPLOAD_DIR"

mkdir -p "$APP_DIR"
cp -f "$SCRIPT_DIR/server.js" "$APP_DIR/server.js"
cp -f "$SCRIPT_DIR/package.json" "$APP_DIR/package.json"
chown -R www-data:www-data "$APP_DIR"

# --- Node deps -----------------------------------------------------------
if ! command -v node >/dev/null 2>&1; then
  echo "Node not installed. Installing Node 20 via Nodesource..."
  curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
  apt-get install -y nodejs
fi

cd "$APP_DIR"
sudo -u www-data npm install --omit=dev

# --- Systemd unit --------------------------------------------------------
cat > /etc/systemd/system/odudoc-files.service <<EOF
[Unit]
Description=OduDoc Files Upload Service
After=network.target

[Service]
Type=simple
User=www-data
Group=www-data
WorkingDirectory=$APP_DIR
Environment=PORT=3001
Environment=UPLOAD_DIR=$UPLOAD_DIR
Environment=PUBLIC_BASE_URL=https://$DOMAIN
Environment=UPLOAD_SECRET=$SECRET
Environment=MAX_FILE_MB=25
ExecStart=/usr/bin/node $APP_DIR/server.js
Restart=on-failure
RestartSec=3
NoNewPrivileges=true
ProtectSystem=full
ProtectHome=true
ReadWritePaths=$UPLOAD_DIR

[Install]
WantedBy=multi-user.target
EOF

systemctl daemon-reload
systemctl enable --now odudoc-files
systemctl restart odudoc-files

# --- nginx ---------------------------------------------------------------
if ! command -v nginx >/dev/null 2>&1; then
  apt-get install -y nginx
fi

cat > /etc/nginx/sites-available/files.odudoc.com <<EOF
server {
    listen 80;
    listen [::]:80;
    server_name $DOMAIN;

    client_max_body_size 30M;

    # Read endpoints (public, static)
    location / {
        root $UPLOAD_DIR;
        try_files \$uri =404;
        add_header Cache-Control "public, max-age=31536000, immutable" always;
        access_log off;
    }

    # Write + admin endpoints (require shared secret; upstream enforces it)
    location = /upload   { proxy_pass http://127.0.0.1:3001; proxy_set_header Host \$host; proxy_set_header X-Real-IP \$remote_addr; proxy_request_buffering off; }
    location = /delete   { proxy_pass http://127.0.0.1:3001; proxy_set_header Host \$host; }
    location = /list     { proxy_pass http://127.0.0.1:3001; proxy_set_header Host \$host; }
    location = /health   { proxy_pass http://127.0.0.1:3001; access_log off; }
}
EOF

ln -sf /etc/nginx/sites-available/files.odudoc.com /etc/nginx/sites-enabled/files.odudoc.com
nginx -t
systemctl reload nginx

# --- Firewall ------------------------------------------------------------
if command -v ufw >/dev/null 2>&1; then
  ufw allow 'Nginx Full' >/dev/null || true
fi

# --- TLS -----------------------------------------------------------------
if ! command -v certbot >/dev/null 2>&1; then
  apt-get install -y certbot python3-certbot-nginx
fi

certbot --nginx -d "$DOMAIN" --non-interactive --agree-tos -m "$EMAIL_FOR_CERTBOT" --redirect || {
  echo "Certbot failed. DNS for $DOMAIN may not be pointing at this server yet."
  echo "Re-run: certbot --nginx -d $DOMAIN --agree-tos -m $EMAIL_FOR_CERTBOT --redirect"
}

# --- Summary -------------------------------------------------------------
echo
echo "=================================================================="
echo "odudoc-files installed."
echo
echo "Service status:"
systemctl --no-pager --lines=0 status odudoc-files | head -n 5 || true
echo
echo "Upload secret (add to Vercel env as FILES_UPLOAD_SECRET):"
echo "   $SECRET"
echo
echo "Also add to Vercel env:"
echo "   FILES_BASE_URL = https://$DOMAIN"
echo
echo "Test: curl -fsS https://$DOMAIN/health"
echo "=================================================================="
