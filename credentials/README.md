# Guía completa: Supabase + Cloudflare (desde cero)

Este folder guarda las **credenciales** de Supabase y Cloudflare.

> **IMPORTANTE:** este README y las plantillas `*.example` son lo único que
> se sube a git. Los archivos reales `supabase.env` y `cloudflare.env` **nunca**
> se suben (están ignorados por `.gitignore`). El repo es público, así que
> **ningún secreto debe tocar git**.

**Flujo recomendado (Opción A):** guardas las credenciales **solo en el
dashboard de Cloudflare**. No en el repo, no en el chat.

---

## PARTE 1 — SUPABASE (ya tienes el repo ahí)

### 1. Entrar al dashboard
- Usa este enlace: https://supabase.com/dashboard
- Haz **Login** o **Sign up** con tu cuenta (Google/GitHub/email).
- Al entrar verás la lista de proyectos. Abre **tu proyecto**.

### 2. Aplicar la base de datos (SQL) — IMPORTANTE
El proyecto recién creado **no tiene tablas**. Hay que crearlas:

- En el menú lateral izquierdo, ve a **SQL Editor**.
- Clica **new query**.
- Pega **todo** el contenido del archivo:
  `supabase/migrations/0001_init.sql`
- Clica **Run** (o Ctrl+Enter).
- Espera a que termine. Verás "Query completed successfully".

> Esto crea las 18 tablas, la seguridad (RLS) y las funciones.
> **Sin esto la app no funciona.**

### 3. Crear los buckets de Storage
Los archivos que subas (fotos, archivos) van aquí:

- En el menú lateral ve a **Storage**.
- Clica **Create bucket**.
- **Bucket 1:** `uploads`
  - toggle **Public** a ON (así cualquiera puede ver imágenes/archivos).
  - Crea.
- **Bucket 2:** `avatars`
  - **Public** ON.
  - Crea.

### 4. Copiás la URL y la anon key
Las necesita el frontend:

- Menú lateral → **Project Settings** → **API**.
- Copia **Project URL** → esa es tu `SUPABASE_URL`.
- Copia **anon public key** → esa es tu `SUPABASE_ANON_KEY`.

> **NO** copies la `service_role` key. Es solo para el servidor, no para el
> frontend. Si se expone, tu cuenta está en riesgo.

### 5. Activar Auth (Google / GitHub) — opcional
Para que los usuarios puedan entrar con Google o GitHub:

- Menú → **Authentication** → **Providers**.
- Activá **Google** y/o **GitHub** con el toggle.
- Para **Google**:
  - Ve a https://console.cloud.google.com/ → crea un proyecto.
  - Menú → **APIs & Services → Credentials → Create Credentials → OAuth client**.
  - Tipo: **Web application**.
  - En **Authorized redirect URIs** pega:
    ```
    https://<TU_DOMINIO>/auth/v1/callback
    ```
    (mientras uses el subdominio gratuito: `https://<proyecto>.pages.dev/auth/v1/callback`)
  - Copia **Client ID** y **Client Secret**.
- Para **GitHub**:
  - Ve a https://github.com/settings/developers → **OAuth Apps → New OAuth App**.
  - **Homepage URL**: tu dominio.
  - **Authorization callback URL**:
    ```
    https://<TU_DOMINIO>/auth/v1/callback
    ```
  - Copia **Client ID** y **Client Secret**.
- Pega los valores en Supabase → **Authentication → Providers** → el proveedor → **Configure**.

### 6. Configurar email (opcional)
Si quieres que te lleguen correos (para recuperación de contraseña, etc.):

- Supabase → **Authentication → Emails**.
- En **SMTP**, pega host, puerto, usuario y contraseña de tu SMTP.
- Asegurate que **Site URL** esté correcto.

### 7. Realtime y permisos
- En Supabase → **Project Settings → API → anon public key** (ya lo sacaste).
- Asegúrate que **Realtime** esté activado (normalmente lo es por defecto).
- La publicación de tablas ya está incluida en el SQL que corriste (paso 2).

---

## PARTE 2 — CLOUDFLARE PAGES (desde cero)

Cloudflare Pages **aloja tu frontend gratis** y te da un dominio gratis.

### 1. Crear la cuenta
- Ve a https://dash.cloudflare.com/login → **Sign Up**.
- Introduce tu email y una contraseña.
- Revisa tu email y confirma la cuenta.

### 2. Entrar al dashboard
- Después de entrar verás la pantalla de **Home**.
- Apunta tu **Account ID** (lo necesitas después):
  - Está en la barra lateral izquierda, bajo "Account ID".
  - Copia ese número.

### 3. Crear el proyecto de Pages
- En el menú izquierdo ve a **Pages** (o ve a https://pages.cloudflare.com).
- Clica **Create project**.
- Elige **Connect to Git** (la opción azul).
- Selecciona el repo **BlackBoneDel/BudChat-BTA**.
- Cloudflare pide permiso → autoriza.
- **Project name:** `budsin-chat` (o como prefieras).
- **Build command:** `npm run build`
- **Output directory:** `dist`
- Clica **Deploy**.

> Cloudflare ya detecta el repo. Deploya automáticamente.

### 4. Dar las variables de entorno (IMPORTANTE)
El frontend necesita la URL y la anon key de Supabase. Las pones aquí,
**no en el código**:

- En Cloudflare Pages → tu proyecto → **Settings**.
- Ve a **Environment variables**.
- Clica **Add variable**:
  - **Variable:** `VITE_SUPABASE_URL` → Valor: tu `SUPABASE_URL`.
  - **Variable:** `VITE_SUPABASE_ANON_KEY` → Valor: tu `SUPABASE_ANON_KEY`.
- Clica **Save**.

> El prefijo `VITE_` es obligatorio. Vite solo expone al frontend las
> variables que empiezan con `VITE_`.

### 5. Re-desplegar para que tome las variables
- Después de añadir variables, ve a **Deployments** → **Retry deployment**.
- O vuelve a **Deploy**. Así el build usa las nuevas variables.

### 6. Obtener tu dominio gratis
- Cuando el deploy termina, Cloudflare te da una URL como:
  `https://<proyecto>.pages.dev`
- Esa URL ya funciona. Es tu **link público gratuito**.

### 7. (Opcional) Dominio propio
Si quieres un dominio propio:

- En Cloudflare Pages → proyecto → **Settings → Custom domains**.
- Añade tu dominio (ej. `chat.tudominio.com`).
- Cloudflare te da los DNS que debes apuntar a su nombre de dominio.
- Si el dominio lo gestionas en Cloudflare, lo hace automáticamente.

### 8. (Opcional) API token de Cloudflare
Solo necesitas esto si vas a usar el CLI (`wrangler`) o automatizaciones.
**No** es necesario para desplegar desde el dashboard:

- https://dash.cloudflare.com → **My Profile** (arriba derecha) → **API Tokens**.
- **Create Token → Create Custom Token**.
- Permisos: **Account Settings → Read** y **Pages → Edit**.
- Selecciona tu **Account**.
- Crea y copia el token.

---

## PARTE 3 — VERIFICAR QUE ESTÁ BIEN (obfuscación)

Para comprobar que las credenciales están bien **sin exponerlas**, uso el
script `obfuscate.sh`. Él muestra cada key como `abc...xyz` (solo fragmentos).

Solo se usa si eliges poner credenciales **localmente** (Opción B). Si usas
**Opción A** (todo en Cloudflare), ni siquiera haces esto.

### Opción A (recomendada): todo en Cloudflare
- No pongas nada en `supabase.env` ni `cloudflare.env`.
- Las credenciales viven solo en el dashboard de Cloudflare.
- Ni el repo, ni yo, ni nadie con acceso al código puede verlas.

### Opción B (local, solo para pruebas)
Si quieres probar en tu máquina (`npm run dev`):

1. Copias las plantillas:
   ```bash
   cd credentials
   cp supabase.env.example supabase.env
   cp cloudflare.env.example cloudflare.env
   ```
2. Pegas los valores reales en los `.env`.
3. El `.gitignore` las excluye — **nunca se suben**.
4. Verificas con:
   ```bash
   chmod +x obfuscate.sh
   ./obfuscate.sh
   ```
5. Yo reviso el output y confirmo que las keys existen, sin ver valores completos.

---

## Resumen rápido (checklist)

**Supabase:**
- [ ] Entrar a supabase.com/dashboard y abrir el proyecto.
- [ ] Aplicar `supabase/migrations/0001_init.sql` en SQL Editor.
- [ ] Crear buckets `uploads` y `avatars` (Public ON).
- [ ] Copiar Project URL y anon public key.
- [ ] (Opcional) Activar Google/GitHub Auth con sus Client ID/Secret.

**Cloudflare:**
- [ ] Crear cuenta en cloudflare.com y entrar al dashboard.
- [ ] Pages → Create project → Connect a `BudChat-BTA`.
- [ ] Build: `npm run build`, Output: `dist`.
- [ ] Settings → Environment variables → `VITE_SUPABASE_URL` + `VITE_SUPABASE_ANON_KEY`.
- [ ] Re-desplegar y copiar la URL `*.pages.dev`.

**Resultados esperados:**
- Un link público gratis que carga la app.
- La app puede autenticar, crear servidores, canales y chatear en tiempo real.

**Nunca** escribas credenciales completas en el chat. Si las necesitas
en un momento puntual, hazlo a través de los `.env` locales (Opción B).
