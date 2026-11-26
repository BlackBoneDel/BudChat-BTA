#!/usr/bin/env bash
# ============================================================================
# setup.sh — Configuración automática de Budsin Chat (stack 100% gratuito)
# ----------------------------------------------------------------------------
# Prepara todo para levantar el proyecto y obtener un enlace funcional:
#   - Scripts CLI / wrangler / supabase CLI (opcional)
#   - Variables de entorno (.env.local)
#   - Esquema de Supabase
#   - Frontend (Vite)
# Uso:  bash deploy/setup.sh
# ============================================================================
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

echo "=== Budsin Chat — Configuración ==="

# --- 1. Variables de entorno ---
if [ ! -f chat-app/.env.local ]; then
  echo ">> Creando chat-app/.env.local"
  cat > chat-app/.env.local <<'EOF'
# Crea un proyecto en https://supabase.com y copia estos valores:
#   Project Settings > API
VITE_SUPABASE_URL=https://YOUR-PROJECT-REF.supabase.co
VITE_SUPABASE_ANON_KEY=YOUR-ANON-KEY
EOF
  echo "   Edita chat-app/.env.local con tu URL y KEY de Supabase."
else
  echo ">> chat-app/.env.local ya existe (no se toca)."
fi

# --- 2. Dependencias del frontend ---
if [ -d chat-app/node_modules ]; then
  echo ">> node_modules presente."
else
  echo ">> Instalando dependencias del frontend (npm install)…"
  (cd chat-app && npm install)
fi

# --- 3. Esquema de Supabase ---
echo ">> Esquema SQL disponible en supabase/migrations/0001_init.sql"
echo "   Para aplicarlo en tu proyecto Supabase:"
echo "     supabase db push        # con supabase CLI autenticado"
echo "   o copia-pega el SQL en SQL Editor del dashboard de Supabase."

# --- 4. Verificación de stack ---
echo ">> Verificando herramientas…"
if command -v npm >/dev/null 2>&1; then
  echo "   ✓ npm $(npm --version)"
else
  echo "   ✗ Falta npm (instala Node.js 20+)"; exit 1
fi
if command -v supabase >/dev/null 2>&1; then
  echo "   ✓ supabase CLI (opcional)"
else
  echo "   — supabase CLI no instalado (opcional; puedes usar el dashboard)"
fi

echo ""
echo "=== Listo. Siguientes pasos ==="
echo "  1. Edita chat-app/.env.local con tu Supabase URL/KEY."
echo "  2. Aplica supabase/migrations/0001_init.sql en tu proyecto Supabase."
echo "  3. Configura OAuth en Supabase (Google/GitHub) si lo usas."
echo "  4. Levanta el frontend:  cd chat-app && npm run dev"
echo "  5. (Producción) Despliega en Cloudflare Pages:  bash deploy/deploy.sh"
