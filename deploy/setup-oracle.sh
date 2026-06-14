#!/usr/bin/env bash
# One-time setup on an Oracle Cloud Always Free Ubuntu VM.
# Run on the VM after copying the project (git clone or scp).
set -euo pipefail

APP_DIR="${APP_DIR:-$HOME/pup-lost-and-found}"
NODE_MAJOR="${NODE_MAJOR:-20}"

echo "==> Installing Node.js ${NODE_MAJOR}.x"
curl -fsSL "https://deb.nodesource.com/setup_${NODE_MAJOR}.x" | sudo -E bash -
sudo apt-get install -y nodejs git

echo "==> Installing app dependencies"
cd "$APP_DIR"
npm install --omit=dev

if [[ ! -f .env ]]; then
  echo "==> Creating .env from .env.example — edit JWT_SECRET and PUBLIC_BASE_URL before going live"
  cp .env.example .env
fi

mkdir -p data

echo "==> Installing systemd service"
sudo cp deploy/ibalik.service /etc/systemd/system/ibalik.service
sudo sed -i "s|/home/ubuntu/pup-lost-and-found|${APP_DIR}|g" /etc/systemd/system/ibalik.service
sudo sed -i "s|User=ubuntu|User=${USER}|g" /etc/systemd/system/ibalik.service

sudo systemctl daemon-reload
sudo systemctl enable ibalik
sudo systemctl restart ibalik

echo "==> Done. Check status: sudo systemctl status ibalik"
echo "    Logs: journalctl -u ibalik -f"
echo "    Open port 3000 in Oracle Cloud security list / NSG, then visit http://<vm-public-ip>:3000"
