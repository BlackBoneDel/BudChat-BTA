#!/usr/bin/env bash
# Obfusca y valida los credentials sin mostrar valores completos.
# Uso: ./obfuscate.sh [supabase.env] [cloudflare.env]
#
# Para cada KEY=VALUE muestra:
#   - si el valor está VACÍO:  [KEY] = (vacio)
#   - si tiene valor:          [KEY] = <primer3>...<ultimo3>  (máscara)
# Así se puede verificar que el archivo existe y las keys están bien,
# sin exponer secretos en el chat o logs.

set -u

show_file() {
  local file="$1"
  echo "===== $file ====="
  if [ ! -f "$file" ]; then
    echo "  (no existe — no se ha creado todavía)"
    return
  fi
  # Leer linealmente KEY=VALUE, ignorando comentarios y líneas vacías
  while IFS= read -r line || [ -n "$line" ]; do
    case "$line" in
      \#*|"") continue ;;
    esac
    key="${line%%=*}"
    val="${line#*=}"
    # quitar espacios alrededor del valor
    val="${val#"${val%%[![:space:]]*}"}"
    val="${val%"${val##*[![:space:]]}"}"
    if [ -z "$val" ]; then
      printf "  %-32s = (vacio)\n" "$key"
    else
      n=${#val}
      if [ "$n" -le 8 ]; then
        # muy corto: mostrar len + tipo, sin caracteres
        printf "  %-32s = [len=%d (valor muy corto, no se muestra)]\n" "$key" "$n"
      else
        prefix="${val:0:3}"
        suffix="${val: -3}"
        printf "  %-32s = %s...%s  [len=%d]\n" "$key" "$prefix" "$suffix" "$n"
      fi
    fi
  done < "$file"
  echo ""
}

cd "$(dirname "$0")" || exit 1

if [ $# -eq 0 ]; then
  show_file supabase.env
  show_file cloudflare.env
else
  for f in "$@"; do show_file "$f"; done
fi

echo "Obfuscación completada. Los valores completos solo están en los .env locales."
