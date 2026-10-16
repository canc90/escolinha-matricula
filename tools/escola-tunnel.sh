#!/usr/bin/env bash
#
# Sobe um túnel Cloudflare (quick tunnel) apontando para o Laravel em
# localhost:8000 e atualiza a URL nas páginas HTML da raiz do repositório.
#
# Por que existe: o quick tunnel gera uma URL aleatória a cada inicialização
# (ex.: https://algum-nome.trycloudflare.com). Quando o túnel cai/reinicia, a
# URL muda e as páginas index.html, admin.html e cadastro-professora.html
# ficam desatualizadas. Este script reinicia o túnel e ressincroniza as URLs.
#
# Uso:
#   ./tools/escola-tunnel.sh
#
# Variáveis opcionais:
#   PORT=8000                 porta local do Laravel
#   CLOUDFLARED=/caminho/bin  binário do cloudflared
#
set -euo pipefail

PORT="${PORT:-8000}"
CLOUDFLARED="${CLOUDFLARED:-$HOME/.local/bin/cloudflared}"
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
LOG="/tmp/opencode/escola-tunnel.log"
PATTERN="cloudflared tunnel --url http://localhost:${PORT}"

mkdir -p "$(dirname "$LOG")"

current_url() {
  grep -oE 'https://[a-z0-9-]+\.trycloudflare\.com' "$LOG" 2>/dev/null | tail -1 || true
}

if ! pgrep -f "$PATTERN" >/dev/null 2>&1; then
  echo "Iniciando túnel para http://localhost:${PORT} ..."
  setsid "$CLOUDFLARED" tunnel --url "http://localhost:${PORT}" --no-autoupdate \
    >"$LOG" 2>&1 </dev/null &

  for _ in $(seq 1 30); do
    sleep 2
    [ -n "$(current_url)" ] && break
  done
fi

URL="$(current_url)"

if [ -z "$URL" ]; then
  echo "Não foi possível obter a URL do túnel. Veja o log em $LOG." >&2
  exit 1
fi

echo "Túnel ativo: $URL"

for page in index.html admin.html cadastro-professora.html; do
  file="$ROOT/$page"

  [ -f "$file" ] || continue

  sed -i -E "s|https://[a-z0-9-]+\.trycloudflare\.com|${URL}|g" "$file"
  echo "Atualizado: $page"
done
