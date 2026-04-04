# VPS Docker Deployment (No change to existing local/prod files)

This guide uses **new files only**:
- `infra/docker-compose.vps.yml`
- `infra/.env.vps.example`
- `infra/nginx/vps/nginx.conf`
- `infra/nginx/vps/app.conf`

## Local (unchanged)
Keep using existing local flow exactly as before.

## VPS commands

```bash
# 1) Docker + compose plugin
sudo apt-get update
sudo apt-get install -y ca-certificates curl gnupg
sudo install -m 0755 -d /etc/apt/keyrings
curl -fsSL https://download.docker.com/linux/ubuntu/gpg | sudo gpg --dearmor -o /etc/apt/keyrings/docker.gpg
sudo chmod a+r /etc/apt/keyrings/docker.gpg
echo "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.gpg] https://download.docker.com/linux/ubuntu $(. /etc/os-release && echo $VERSION_CODENAME) stable" | sudo tee /etc/apt/sources.list.d/docker.list > /dev/null
sudo apt-get update
sudo apt-get install -y docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin

# 2) Firewall
sudo apt-get install -y ufw
sudo ufw default deny incoming
sudo ufw default allow outgoing
sudo ufw allow OpenSSH
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp
sudo ufw --force enable

# 3) Clone
sudo mkdir -p /opt/managora && sudo chown -R $USER:$USER /opt/managora
cd /opt/managora
git clone <YOUR_REPO_URL> Managora-System
cd Managora-System/infra

# 4) Env
cp .env.vps.example .env.vps
nano .env.vps

# 5) Start stack (http)
docker compose --env-file .env.vps -f docker-compose.vps.yml up -d --build

# 6) Issue cert
docker compose --env-file .env.vps -f docker-compose.vps.yml run --rm certbot certonly --webroot -w /var/www/certbot -d managora.online -d www.managora.online --email admin@managora.online --agree-tos --no-eff-email

# 7) Restart nginx + start renew
docker compose --env-file .env.vps -f docker-compose.vps.yml restart nginx
docker compose --env-file .env.vps -f docker-compose.vps.yml up -d certbot

# 8) Safe restart later
docker compose --env-file .env.vps -f docker-compose.vps.yml up -d --build
```