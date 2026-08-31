#!/bin/sh
set -eu

API_URL="${VITE_API_URL:-${API_URL:-}}"

cat > /usr/share/nginx/html/config.js <<EOF
window.__GM_CONFIG__ = {
  API_URL: ${API_URL:+"$API_URL"}
};
EOF
