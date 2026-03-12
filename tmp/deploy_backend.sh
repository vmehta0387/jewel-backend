#!/usr/bin/env bash
set -e

sudo apt update
sudo apt install -y ca-certificates curl gnupg
if ! command -v node >/dev/null 2>&1; then
  curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
  sudo apt install -y nodejs
fi

sudo mkdir -p /opt/salesplatform
sudo chown ubuntu:ubuntu /opt/salesplatform
rm -rf /opt/salesplatform/backend
tar -xzf ~/backend-deploy.tar.gz -C /opt/salesplatform
cd /opt/salesplatform/backend
npm install
npm run build

cat > /opt/salesplatform/backend/.env <<'EOF'
NODE_ENV=production
PORT=3000
DATABASE_HOST=ballast.proxy.rlwy.net
DATABASE_PORT=29398
DATABASE_USER=root
DATABASE_PASSWORD=cVKgVLfpoyOvbqQTCNWrhsSQVxIkmoZm
DATABASE_NAME=railway
JWT_SECRET=TenqV9meuswV0IyiYc5C6XMIMH9rO5szgijsWmEJbmy9UrvpNBO20FnSaLuS8fEAhjYVy3zF0uteX4pCNaV/5A==
JWT_EXPIRATION=7d
CORS_ORIGIN=
EOF

sudo tee /etc/systemd/system/jewelry-backend.service > /dev/null <<'SERVICE'
[Unit]
Description=Jewelry Platform Backend
After=network.target

[Service]
Type=simple
User=ubuntu
WorkingDirectory=/opt/salesplatform/backend
EnvironmentFile=/opt/salesplatform/backend/.env
ExecStart=/usr/bin/node dist/main.js
Restart=on-failure
RestartSec=5

[Install]
WantedBy=multi-user.target
SERVICE

sudo systemctl daemon-reload
sudo systemctl enable jewelry-backend.service
sudo systemctl restart jewelry-backend.service
sudo systemctl status jewelry-backend.service --no-pager -l | sed -n '1,8p'
