# Despliegue de tu app de chat (BudChat) en un dominio nuevo

Esta guía configura **Budsin Chat** como base de tu propia app de chat.
Todo lo que era hardcodeado de Budsin ahora vive en un archivo de configuración
central y en variables de entorno.

## 1. Archivos que configurar

| Archivo | Qué configura |
|---|---|
| `public/chat/chat-config.js` | **Tu app**: nombre, dominio, Firebase, legal, analítica, enlaces permitidos, contacto. Lo editas y vuelves a desplegar. |
| `server/chat/env.example` | **Servidor**: puerto, data dir, proyecto Firebase, admins, orígenes, dominios/enlaces permitidos. Se copia a `/etc/budsin-chat.env`. |
| `server/chat/caddy-snippet.txt` | Reverse proxy `/api/chat/*` → `127.0.0.1:3104` (sin cambios). |

## 2. Prerrequisitos del VPS (Ubuntu + Caddy)

- Ubuntu 22.04+ con Caddy instalado y tu dominio apuntando al VPS.
- `install.sh` instala **bun** (con checksum) y **ffmpeg** automáticamente.

## 3. Paso a paso

### A. Preparar el dominio y el SSL
1. Apuntar el dominio (p. ej. `chat.example.com`) al VPS en la DNS.
2. En el `Caddyfile`, tener el sitio sirviendo `public/` con HTTPS automático.

### B. Configurar el frontend
1. Editar **`public/chat/chat-config.js`**:
   - `APP_NAME`: tu nombre de app.
   - `DOMAIN`: tu dominio.
   - `BACK_URL`: enlace "Volver" (o null para ocultar).
   - `LEGAL`: rutas/URLs de términos, privacidad y normas.
   - `FB`: los 6 valores de tu proyecto Firebase (SDK web).
   - `GTM_ID` / `ADSENSE_CLIENT`: vacío = no se cargan.
   - `HOTKEY_SRC`: null = chat sin juegos; `"/classroom-hotkey.js"` si quieres el botón en juegos.
   - `ALLOWED_LINKS`: dominios permitidos en mensajes (mantén consistente con el env).
   - `CONTACT_EMAIL`: correo mostrado en sanciones.

### C. Configurar Firebase (Auth de Google)
1. Crear un proyecto Firebase.
2. **Authentication → Sign-in method → Google**: activar.
3. **Authentication → Settings**: autorizar tu dominio
   (`chat.example.com`) en *Authorized domains*.
4. Copiar la config web (SDK) al campo `FB` de `chat-config.js`.
5. El chat **solo usa Auth**: no necesita Firestore/Storage para el chat
   (los mensajes viven en SQLite local).

### D. Configurar el servidor
1. Editar **`server/chat/env.example`** con:
   - `FIREBASE_PROJECT_ID` = id de tu proyecto Firebase.
   - `CHAT_ADMIN_EMAILS` = tus correos admin (verificados).
   - `CHAT_ORIGINS` = `https://chat.example.com`.
   - `CHAT_ALLOWED_DOMAINS` = dominios que pueden entrar
     (p. ej. `*.edu,*.edu.??,*.ac.??` o `*` para todos, o tus dominios).
   - `CHAT_ALLOWED_LINKS` = mismo dominio que `ALLOWED_LINKS`.
   - `CHAT_IMAGES=0` (apagado por defecto; ver nota de CSAM abajo).
2. Lanzar el instalador (como root, desde `server/chat/`):
   ```bash
   sudo bash install.sh
   ```
   Instala bun, ffmpeg, el usuario `budsin-chat`, systemd y añade/actualiza
   el bloque Caddy para `/api/chat/*`.
3. Si quieres imágenes/stickers propios **solo después** de tener una defensa
   real contra CSAM (hashes + revisión humana; el detector NSFW no basta):
   ```bash
   sudo WITH_SCAN=1 bash install.sh   # + CHAT_IMAGES=1 en /etc/budsin-chat.env
   ```

### E. Desplegar el frontend
1. Copiar `public/` (al menos `public/chat/`, `public/bm-mini.js`,
   `public/images.jpeg` y, si se usa, `public/classroom-hotkey.js`) al
   directorio web de Caddy (p. ej. `/var/www/chat/`).
2. Reiniciar/verificar: `systemctl status budsin-chat`, `journalctl -u budsin-chat`.
3. Probar:
   - `curl https://chat.example.com/chat/` → carga el login.
   - `curl https://chat.example.com/api/chat/health` → `{"ok":true,...}`.
   - Iniciar sesión con una cuenta Google verificada de un dominio permitido.

## 4. Notas importantes

- **CSAM / menores**: `CHAT_IMAGES=1` activa subidas de imágenes y fotos de
  perfil. El detector NSFW incluido **no** detecta CSAM ni sustituye la
  detección por hashes ni la revisión humana. No activarlo sin una defensa
  real (p. ej. Cloudflare CSAM Scanning Tool + procedimiento de denuncia).
- **Solo cuentas de colegio**: por defecto solo entran cuentas Google
  verificadas de `*.edu`, `*.edu.??`, `*.ac.??`. Para tu app, ajusta
  `CHAT_ALLOWED_DOMAINS`.
- **Enlaces**: por defecto **ningún** enlace pasa si `CHAT_ALLOWED_LINKS` está
  vacío. Define los dominios permitidos.
- **Base de datos**: SQLite en `/var/lib/budsin-chat/chat.sqlite`. Archivos de
  media en `/var/lib/budsin-chat/media` (borrados a los 14 días).
- **Backup**: copies de `/var/lib/budsin-chat` y `/etc/budsin-chat.env`.

## 5. Tests (opcional, si tienes Bun)

```bash
cd server/chat/app && bun test
```

## 6. Mínimo viable (chat sin imágenes)

1. Dominio + Caddy sirviendo `public/chat/`.
2. `chat-config.js` con tu Firebase + dominio.
3. `env.example` con `CHAT_IMAGES=0`.
4. `sudo bash install.sh`.
5. `curl /api/chat/health` → ok.

¡Listo! Tu app de chat lista en el dominio nuevo.
