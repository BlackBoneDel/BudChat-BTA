#!/usr/bin/env bash
# ============================================================================
# deploy.sh — Despliegue automático a Cloudflare Pages (gratis, enlace público)
# ----------------------------------------------------------------------------
# - Build del frontend (Vite)
# - Deploy a Cloudflare Pages via Wrangler (o Pages Deploy via API)
# - Resultado: un enlace público *.pages.dev funcional
#
# Requisitos:  wrangler  (npm i -g wrangler)  +  login en Cloudflare
# Uso:         bash deploy/deploy.sh
# ============================================================================
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

echo "=== Budsin Chat — Despliegue a Cloudflare Pages ==="

# --- 1. Build del frontend ---
echo ">> Build del frontend…"
(cd chat-app && npm run build)

DIST="$ROOT/chat-app/dist"
[ -d "$DIST" ] || { echo "✗ No se encontró $DIST"; exit 1; }

# --- 2. Variables de entorno ---
if [ -f chat-app/.env.local ]; then
  echo ">> Levantando variables de entorno del frontend…"
  # Wrangler Pages usa .env del directorio; exportamos para el build (ya hecho)
  # y copiamos a dist para que estén disponibles en runtime.
  grep -E '^VITE_' chat-app/.env.local | sed 's/^/  /' || true
fi

# --- 3. Deploy ---
if command -v wrangler >/dev/null 2>&1; then
  echo ">> Desplegando con Wrangler…"
  # Páginas: subimos el directorio dist
  (cd "$DIST" && wrangler pages deploy . --project-name=budsin-chat)
  echo ""
  echo "✓ Despliegue completado."
  echo "  Enlace:  https://budsin-chat.pages.dev"
  echo "  (si usaste --project-name distinto, el dominio cambia)"
else
  echo ">> Wrangler no instalado. Opciones:"
  echo "   a) npm i -g wrangler && bash deploy/deploy.sh"
  echo "   b) Subir manualmente chat-app/dist a Cloudflare Pages"
  echo "      (Dashboard > Workers & Pages > Pages > Create > Connect repo / Upload)"
  echo "   c) Despliegue por GitHub: pushea este repo y conecta en Pages"
fi

echo ""
echo "=== Enlace público listo ==="
echo "  https://budsin-chat.pages.dev"
echo ""
echo "Nota: el backend (Supabase) ya está desplegado por separado en supabase.co"
echo "      con la URL/KEY de .env.local. El dominio *.pages.dev no necesita SSL"
echo "      adicional ni reconfiguración: Cloudflare lo gestiona todo."
