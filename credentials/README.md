# Credentials (LOCALES — no se suben a git)

Este folder guarda las credenciales reales de **Supabase** y **Cloudflare**.

**IMPORTANTE:**
- Los archivos reales (`supabase.env`, `cloudflare.env`) **NO se suben a git**.
- Están cubiertos por `.gitignore`.
- Solo se versionan los `*.example` (plantillas vacías) y este README.
- Las credenciales solo viven en tu equipo, nunca en GitHub.

## Paso 1: Crear los archivos reales

Copia las plantillas:

```bash
cd credentials
cp supabase.env.example supabase.env
cp cloudflare.env.example cloudflare.env
```

Ahora pega los valores reales en cada uno (ver paso 2 y 3).

## Paso 2: Sacar credenciales de SUPABASE

1. Ve a https://supabase.com/dashboard y abre tu **proyecto**.
2. **URL y anon key** (siempre necesarios):
   - Menu lateral → **Project Settings** → **API**.
   - Copia **Project URL** → `SUPABASE_URL`.
   - Copia **anon public key** → `SUPABASE_ANON_KEY`.
   - (La `service_role` key NO se usa en el frontend, no la pongas aquí.)
3. **Auth / OAuth** (solo si activas Google/GitHub):
   - Menu → **Authentication** → **Providers**.
   - Active **Google**: ve a Google Cloud Console → crea credential de OAuth → copia `Client ID` → `SUPABASE_GOOGLE_CLIENT_ID` y `Client Secret` → `SUPABASE_GOOGLE_CLIENT_SECRET`.
   - Active **GitHub**: ve a Settings → Developer settings → OAuth Apps → nuevo app → copia `Client ID` y `Client Secret` → campos `SUPABASE_GITHUB_CLIENT_ID` / `SUPABASE_GITHUB_CLIENT_SECRET`.
   - **Callback URL** que debes registrar en Google/GitHub:
     ```
     https://<TU_DOMINIO>/auth/v1/callback
     ```
     (o `https://<proyecto>.pages.dev/auth/v1/callback` mientras uses el subdominio gratuito).
4. **Email / SMTP** (opcional):
   - Menu → **Authentication** → **Emails**.
   - En **SMTP** pega host, puerto, usuario y contraseña del SMTP → campos `SUPABASE_SMTP_*`.
   - Dominio de correo permitido / redirect en **Site URL** y **External SMTP**.
5. **Aplicar el SQL**:
   - Menu → **SQL Editor** → `new query` → pega todo `supabase/migrations/0001_init.sql` → **Run**.
   - O usa el CLI: `supabase db push --linked`.
6. **Buckets de Storage**:
   - Menu → **Storage** → **Create bucket** → `uploads` (allow public read).
   - Crea otro bucket → `avatars`.

## Paso 3: Sacar credenciales de CLOUDFLARE

Cloudflare Pages **no necesita secretos para desplegar** si conectas el repo de GitHub.
Pero si quieres usar el CLI (`wrangler`), necesitas:

1. **API token**:
   - Ve a https://dash.cloudflare.com → **My Profile** (arriba derecha) → **API Tokens**.
   - **Create Token** → **Create Custom Token**.
   - Permisos: `Account Settings` → **Read**, y `Pages` → **Edit**.
   - Selecciona tu **Account**.
   - Copia el token → `CLOUDFLARE_API_TOKEN`.
2. **Account ID**:
   - En el dashboard, ve a **Home** → ve el **Account ID** en la barra lateral.
   - Copia → `CLOUDFLARE_ACCOUNT_ID`.
3. **Variables de build para el frontend**:
   - En Cloudflare Pages → tu proyecto → **Settings** → **Environment variables**.
   - Añade: `VITE_SUPABASE_URL` = tu `SUPABASE_URL`, y `VITE_SUPABASE_ANON_KEY` = tu `SUPABASE_ANON_KEY`.
   - (Si prefieres, las dejas solo en el `cloudflare.env` local y el deploy script las inyecta.)

## Paso 4: Verificar sin exponer (obfuscación)

Para que yo pueda comprobar que los archivos existen y las keys están bien
**sin que veamos los valores completos**, uso el script de ofuscación:

```bash
cd credentials
chmod +x obfuscate.sh
./obfuscate.sh
```

El script muestra cada key como `abc...xyz  [len=N]`, así confirmamos:
- que el archivo existe,
- que la key está presente y no vacía,
- sin exponer el secreto en el chat.

Si quieres ofuscar solo uno: `./obfuscate.sh supabase.env`

## Paso 5: Cómo me las pasas a mí (sin pasarlas por chat)

### ⭐ Opción recomendada: credenciales solo en Cloudflare (Opción A)

Como el repo es **público**, la forma más simple y segura es **no poner
ninguna credencial en el repo ni en el equipo del servidor**:

1. Guardas las credenciales **solo en el dashboard de Cloudflare Pages**:
   - Cloudflare Pages → tu proyecto → **Settings → Environment variables**.
   - Añades `VITE_SUPABASE_URL` y `VITE_SUPABASE_ANON_KEY`.
2. El build de Pages las inyecta al compilar. **Nunca están en el código ni en git.**
3. Para probar localmente, usas `credentials/supabase.env` / `cloudflare.env`
   **localmente** (ignorados por git), solo en tu máquina.

**Ventaja**: ni el repo público ni nadie con acceso al código puede verlas.

### Opción B: credencial local (solo para pruebas locales)

1. Pones las credenciales reales en `credentials/supabase.env` y `credentials/cloudflare.env` **en tu equipo**.
2. El `.gitignore` las excluye automáticamente — **nunca se suben**.
3. Yo reviso con `./obfuscate.sh` y veo solo los fragmentos (no los valores completos).
4. Para usarlas en el despliegue, el script `deploy/deploy.sh` lee estos `.env`
   y los inyecta como variables de entorno del build de Cloudflare Pages.

**Nunca escribas las credenciales completas en el chat.** Si las necesitas
en un momento puntual, lo haces a través de estos archivos locales.
