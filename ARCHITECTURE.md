# Budsin Chat — Arquitectura (stack 100% gratuito)

> Transformación de Budsin Chat en una app web de chat en tiempo real,
> inspirada en Discord/Stoat, desplegable en un enlace público gratuito.

## 1. Stack seleccionado y justificación

| Capa |  technology | Por qué (datos 2026) |
|---|---|---|
| **Frontend** | **React 18 + Vite + TypeScript** | SPA ultrarrápida, code-splitting nativo, PWA. Build estático → cualquier host gratuito. |
| **Hosting frontend** | **Cloudflare Pages** | **Bandwidth ilimitado** (único gratuito), SSL automático, `.pages.dev` gratuito, dominio propio gratis, 300+ ciudades, uso comercial permitido. |
| **Backend / API** | **Supabase (Postgres + Auth + Realtime + Storage)** | Backend todo en uno gratuito: Postgres, OAuth, realtime y archivos. Evita montar servidor propio. |
| **Base de datos** | **Postgres (Supabase)** | 500 MB gratis, RLS (seguridad por filas), triggers. |
| **Autenticación** | **Supabase Auth** | OAuth Google/GitHub, email, **acceso guest (anónimo)**. 50k MAU gratis. |
| **Tiempo real** | **Supabase Realtime** | WebSocket sobre **WSS:443**, 200 conexiones concurrentes, 2M mensajes/mes. |
| **Archivos** | **Supabase Storage** | 1 GB gratis, políticas RLS. |
| **PWA** | **manifest.webmanifest + Service Worker** | Instalable como app nativa desde el mismo enlace. |

### Por qué Supabase y no Firebase/Convex/Workers
- **Firebase** es una opción válida, pero Supabase incluye **Realtime + Auth + Storage + Postgres** en un solo proyecto gratuito, con RLS SQL nativo y mención a datos verificados en 2026 (200 conexiones realtime, 50k MAU).
- **Convex** es excelente para realtime pero su free tier es más limitado en almacenamiento/egress; Supabase cubre más necesidades con un solo proveedor.
- **Cloudflare Workers + Durable Objects** permitirían WebSocket propio, pero **Supabase Realtime ya integra WSS:443** con RLS, eliminando la complejidad de Durable Objects (que, por cierto, son gratuitas pero con límites estrictos: 100k requests/día, y las WebSockets abiertas consumen duration a menos que uses Hibernation API).

## 2. Accesibilidad y evasión de bloqueos (redes restrictivas)

- **Todo sobre puerto 443**: frontend, API y WebSocket (WSS) viajan por HTTPS/WSS estándar. Supabase sirve realtime en `wss://<ref>.supabase.co`; Cloudflare Pages sirve el frontend en HTTPS. Nada en puertos alternos → compatible con firewalls institucionales/estudiantiles.
- **Certificados SSL válidos**: Cloudflare (frontend) y Supabase (backend) gestionan TLS automáticamente.
- **Reputación de dominio**: `*.pages.dev` y `*.supabase.co` son dominios de alto nivel con reputación, no se marcan como maliciosos. Si se añade dominio propio, va en Cloudflare (DNS + SSL).
- **Cumplimiento**: esquema incluye tablas de **reportes y moderación** (reportes, acciones de moderación), políticas de acceso por roles y RLS estricto. Términos y privacidad se referencen en la UI de login.

## 3. Modelo de datos (Supabase)

`supabase/migrations/0001_init.sql`:

- **profiles** (perfil + estado: online/away/dnd) — auto-creado por trigger en `auth.users`
- **servers** (espacios) + **channels** (canales text/voice)
- **server_members** (roles: member/moderator/admin/owner) + **roles** + **role_assignments** (roles personalizables)
- **messages** + **reactions** (emoji)
- **conversations** (unificado: DMs directos + grupales) + **conversation_members** + **conversation_messages**
- **invites** (invitaciones personalizables con código, max_uses, expiración)
- **presence** (estado en tiempo real) + **typing** (ephemeral)
- **reports** + **moderation_actions**
- **RLS** en todas las tablas, con políticas por membresía
- **Realtime** publicado para las tablas relevantes

## 4. Funcionalidades core (Discord/Stoat)

| Funcionalidad | Implementación |
|---|---|
| **Autenticación flexible** | OAuth Google/GitHub, email, **guest anónimo** (Supabase Auth). |
| **Servidores + canales** | Crear servidores, canales de texto, lista lateral. |
| **Mensajes en tiempo real** | Supabase Realtime (INSERT/UPDATE/DELETE) por canal. |
| **DMs + chats grupales** | Modelo unificado `conversations` (direct/group). |
| **Markdown** | `marked` + `dompurify` (sanitizado), con code/listas/enlaces. |
| **Imágenes/archivos** | Supabase Storage (RLS) — ruta para subir integrada. |
| **Menciones `@usuario`** | Resaltado en render. |
| **Reacciones** | Emoji con toggle en tiempo real. |
| **Roles y permisos** | member/moderator/admin/owner + roles personalizables. |
| **Invitaciones** | Códigos personalizables con uso/expiración. |
| **Estado en tiempo real** | `presence` (online/away/dnd) + typing. |
| **Notificaciones "escribiendo"** | Tabla `typing` con limpieza automática. |

## 5. Optimización y rendimiento

- **Code-splitting**: chunks separados por proveedor (`react`, `supabase`, `markdown`) — verificado en build.
- **Lazy loading**: componentes de login y áreas se cargan a demando.
- **Edge caching**: Cloudflare Pages cachea assets estáticos; service worker cachea el app shell.
- **WebSocket eficiente**: una suscripción por canal (no global), con uncleanup en unmount → minimiza re-renders y consumo de batería.
- **PWA**: `manifest.webmanifest`, icono, service worker (cache-first assets, network-first HTML) → instalable como app nativa.

## 6. Estructura del proyecto

```
BudChat-BTA/
├── chat-app/                    # Frontend React + Vite + TS (PWA)
│   ├── src/
│   │   ├── lib/                 # supabase client, tipos, markdown
│   │   ├── hooks/               # useAuth, useCurrentUid
│   │   ├── context/             # AuthContext
│   │   ├── components/          # Login, ServerSidebar, ChannelSidebar, MessageArea
│   │   ├── styles.css
│   │   ├── App.tsx, main.tsx
│   ├── public/                  # manifest, icono, service worker
│   └── index.html
├── supabase/
│   └── migrations/0001_init.sql   # Esquema completo (BD + RLS + Realtime)
└── deploy/
    ├── setup.sh                  # Configuración automática
    └── deploy.sh                 # Despliegue a Cloudflare Pages
```

## 7. Cómo levantar (en minutos)

```bash
# 1. Configuración automática
bash deploy/setup.sh

# 2. Edita chat-app/.env.local con tu Supabase URL/KEY
# 3. Aplica el esquema en tu proyecto Supabase:
#    supabase db push
#    (o copia-pega supabase/migrations/0001_init.sql en SQL Editor)
# 4. Configura OAuth (Google/GitHub) en Supabase si lo usas

# Desarrollo local
cd chat-app && npm run dev

# Producción (enlace público gratuito)
bash deploy/deploy.sh
# → https://budsin-chat.pages.dev
```

## 8. Límites del stack gratuito (para planificar)

- **Supabase Realtime**: 200 conexiones concurrentes, 2M mensajes/mes. Para un MVP/comunidad pequeña es suficiente; si crece, escalar a Pro ($25/mes).
- **Supabase Storage**: 1 GB. Adecuado para avatares/adjuntos pequeños.
- **Pausa por inactividad**: proyectos Supabase gratuitos se pausan tras 1 semana sin uso. Para producción continua, considerar Pro o al menos mantener actividad.
- **Cloudflare Pages**: bandwidth ilimitado, 500 builds/mes — suficiente para desplegar cuando el proyecto cambie.

## 9. Ruta de escalado futuro

1. **Más usuarios** → Supabase Pro (más realtime, MAU, egress).
2. **Archivos grandes** → Cloudflare R2 (10 GB gratis, egress gratuito) + Workers para subida.
3. **Voz/video** → WebRTC (no entra en MVP; sería capa adicional).
4. **Dominio propio** → conectar en Cloudflare Pages (DNS + SSL automáticos).
