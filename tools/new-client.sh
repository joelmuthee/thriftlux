#!/usr/bin/env bash
# new-client.sh — Spin up a new WhatsApp catalog site (clone of ThriftLux)
#
# What this does (one command, ~30 seconds):
#   1. Copies the ThriftLux repo as the template
#   2. Generates a fresh admin password and worker token
#   3. Creates a new Cloudflare Worker + KV namespace for this client
#   4. Sets the admin token as a Worker secret (never in source code)
#   5. Deploys the worker
#   6. Rewrites admin.js / main.js / index.html with this client's values
#   7. Seeds the worker's KV with empty bag data
#   8. Initialises a fresh git repo ready for push
#
# Pre-requisites (one-time, on this machine):
#   • git, bash, python3, curl
#   • Node.js + npx (for wrangler)
#   • `npx wrangler login` already done at least once
#   • `gh` CLI installed (optional — for auto repo creation)
#
# Usage:
#   ./tools/new-client.sh <slug> <whatsapp> <"Business Name">
#
# Example:
#   ./tools/new-client.sh mamambogabakery 254712345678 "Mama Mboga Bakery"
#
# Slug rules: lowercase, no spaces, no special chars (used for worker name + dir name).

set -euo pipefail

# ---- Args -----------------------------------------------------------------
if [ "$#" -lt 3 ]; then
  echo "Usage: $0 <slug> <whatsapp_no_plus> \"<Business Name>\""
  echo "Example: $0 mamambogabakery 254712345678 \"Mama Mboga Bakery\""
  exit 1
fi

SLUG="$1"
WHATSAPP="$2"
BIZ_NAME="$3"

# ---- Paths ----------------------------------------------------------------
TEMPLATE_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
PARENT_DIR="$(dirname "$TEMPLATE_DIR")"
TARGET_DIR="$PARENT_DIR/$SLUG"

if [ -d "$TARGET_DIR" ]; then
  echo "❌ $TARGET_DIR already exists. Pick a different slug or delete the old one."
  exit 1
fi

echo "▶ Cloning template → $TARGET_DIR"
cp -r "$TEMPLATE_DIR" "$TARGET_DIR"
cd "$TARGET_DIR"

# Strip ThriftLux history + sample bags + dev artefacts
rm -rf .git .claude .tmp .playwright-mcp tools
rm -f images/bags/*.jpg
rm -f data.json

# ---- Generate fresh secrets ----------------------------------------------
PASSWORD="$(python3 -c 'import secrets;print(secrets.token_urlsafe(8))')"
TOKEN="$(python3 -c 'import secrets;print(secrets.token_urlsafe(32))')"
TOKEN_B64="$(printf '%s' "$TOKEN" | base64 | tr -d '\n')"
WORKER_NAME="${SLUG}-api"

echo "▶ Generated:"
echo "    admin password: $PASSWORD"
echo "    worker name:    $WORKER_NAME"

# ---- Cloudflare: KV + Worker ---------------------------------------------
cd worker

# Worker name in wrangler.toml
sed -i.bak "s|^name = \".*\"|name = \"$WORKER_NAME\"|" wrangler.toml && rm wrangler.toml.bak

# Create a new KV namespace and capture the id
echo "▶ Creating KV namespace…"
KV_RAW="$(npx wrangler kv namespace create BAGS 2>&1 | tee /dev/stderr)"
KV_ID="$(printf '%s\n' "$KV_RAW" | grep -oE '"id": *"[a-f0-9]{32}"' | head -1 | sed 's/.*"\([a-f0-9]*\)".*/\1/')"
if [ -z "$KV_ID" ]; then
  echo "❌ Failed to parse KV namespace id from wrangler output"
  exit 1
fi
echo "    KV id: $KV_ID"

# Replace the placeholder KV id (the ThriftLux one) with the new one
sed -i.bak "s|id = \"[a-f0-9]\{32\}\"|id = \"$KV_ID\"|" wrangler.toml && rm wrangler.toml.bak

# Set the ADMIN_TOKEN secret (this token is the only thing that can write to the KV)
echo "▶ Setting ADMIN_TOKEN secret on Worker…"
printf '%s' "$TOKEN" | npx wrangler secret put ADMIN_TOKEN

# Deploy
echo "▶ Deploying Worker…"
DEPLOY_OUT="$(npx wrangler deploy 2>&1 | tee /dev/stderr)"
WORKER_URL="$(printf '%s\n' "$DEPLOY_OUT" | grep -oE 'https://[a-z0-9.-]+\.workers\.dev' | head -1)"
if [ -z "$WORKER_URL" ]; then
  echo "❌ Failed to parse worker URL from wrangler output"
  exit 1
fi
echo "    worker URL: $WORKER_URL"

cd ..

# ---- Rewrite frontend with this client's values --------------------------
echo "▶ Customising admin.js / main.js / index.html…"

# admin.js: API_BASE, ADMIN_TOKEN, ADMIN_PASSWORD
python3 - <<PY
import re, pathlib
p = pathlib.Path("admin.js")
s = p.read_text(encoding="utf-8")
s = re.sub(r"const API_BASE = '[^']+'", "const API_BASE = '$WORKER_URL'", s)
s = re.sub(r"const ADMIN_TOKEN = atob\('[^']+'\)", "const ADMIN_TOKEN = atob('$TOKEN_B64')", s)
s = re.sub(r"const ADMIN_PASSWORD = '[^']+'", "const ADMIN_PASSWORD = '$PASSWORD'", s)
p.write_text(s, encoding="utf-8")
PY

# main.js: API_BASE
python3 - <<PY
import re, pathlib
p = pathlib.Path("main.js")
s = p.read_text(encoding="utf-8")
s = re.sub(r"const API_BASE = '[^']+'", "const API_BASE = '$WORKER_URL'", s)
# Reset image cache version
s = re.sub(r"const IMG_VERSION = '[^']+'", "const IMG_VERSION = 'v1'", s)
p.write_text(s, encoding="utf-8")
PY

# index.html: business name, WhatsApp number, OG tags
python3 - <<PY
import re, pathlib
biz = """$BIZ_NAME"""
wa  = "$WHATSAPP"
p = pathlib.Path("index.html")
s = p.read_text(encoding="utf-8")
s = s.replace("ThriftLux", biz)
s = s.replace("254705044940", wa)
# Strip the old OG image (point to a placeholder so the client can update later)
s = re.sub(r'images/bags/reel_[A-Za-z0-9_]+\.jpg', 'images/logo.jpg', s)
p.write_text(s, encoding="utf-8")

p2 = pathlib.Path("admin.html")
s2 = p2.read_text(encoding="utf-8")
s2 = s2.replace("ThriftLux", biz)
p2.write_text(s2, encoding="utf-8")
PY

# Drop the CNAME until the client points a domain
rm -f CNAME

# ---- Seed empty catalog --------------------------------------------------
echo "▶ Seeding empty catalog in KV…"
curl -s -X POST "$WORKER_URL/api/bulk" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d "{\"bags\":[],\"settings\":{\"whatsappNumber\":\"$WHATSAPP\"}}" > /dev/null

# ---- Fresh git repo ------------------------------------------------------
echo "▶ Initialising git repo…"
git init -q -b main
git add -A
git commit -q -m "Initial commit for $BIZ_NAME"

# ---- Done ----------------------------------------------------------------
cat <<EOF

✅ Done! New client site spun up for: $BIZ_NAME

  Local dir:       $TARGET_DIR
  Worker URL:      $WORKER_URL
  Admin password:  $PASSWORD
  WhatsApp number: $WHATSAPP

📝 You still need to (one-time per client):

  1. Push to GitHub:
       cd "$TARGET_DIR"
       gh repo create $SLUG --public --source=. --push
       (or: create repo manually and 'git push -u origin main')

  2. Enable GitHub Pages:
       Repo → Settings → Pages → Source = main branch / root → Save

  3. (Optional) Custom domain:
       Add CNAME file with the domain
       Point DNS CNAME to <your-github-username>.github.io
       In Pages settings: enter the custom domain → tick Enforce HTTPS once cert is ready

  4. Replace assets:
       images/logo.jpg              ← client's logo
       images/favicon-32.png        ← favicon
       images/apple-touch-icon.png  ← iOS icon

  5. Hand over to client:
       Admin URL:      https://<their-site>/admin.html
       Admin password: $PASSWORD

🔒 Save the password somewhere safe (1Password, Bitwarden, notes app).
   It's not stored anywhere else — losing it means re-running this script.

EOF
