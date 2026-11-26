// ============================================================================
// CONFIGURACIÓN CENTRAL DE TU APP DE CHAT (basada en Budsin Chat)
// ----------------------------------------------------------------------------
// Edita este archivo y vuelve a desplegar. Todo lo que era hardcodeado de
// Budsin (dominio, Firebase, legal, analítica, enlaces) vive aquí.
// Se carga en /chat/index.html y /chat/admin.html antes del resto del código.
// ============================================================================
window.CHAT_CONFIG = {
  // --- Identidad de la app ---
  APP_NAME: "Budsin Chat",        // nombre visible (barra lateral, título, etc.)
  DOMAIN: "chat.example.com",    // tu dominio (placeholder). WS_URL se construye con location.host.

  // --- Contacto mostrado en mensajes de sanción (vacío = omitir) ---
  CONTACT_EMAIL: "contacto@chat.example.com",

  // --- Enlace "Volver" (null = ocultar el botón) ---
  BACK_URL: "https://chat.example.com/",

  // --- Páginas legales ( rutas relativas o URLs completas de tu dominio ) ---
  LEGAL: {
    terms: "/terminos",
    privacy: "/privacidad",
    rules: "/terminos#normas"
  },

  // --- Firebase: TU PROYECTO (el chat solo usa Auth de Google) ---
  // Crea un proyecto, habilita "Google" en Authentication y autoriza tu
  // dominio en la configuración de dominio del proyecto (Auth > Settings).
  // Los valores salen del SDK: config web Firebase.
  FB: {
    apiKey: "",                     // AIza...
    authDomain: "",                 // tu-proyecto.firebaseapp.com
    projectId: "",                  // id del proyecto
    storageBucket: "",              // tu-proyecto.firebasestorage.app
    messagingSenderId: "",          // número
    appId: ""                       // 1:numero:web:token
  },

  // --- Analítica y publicidad (vacío = NO se cargan) ---
  GTM_ID: "",          // p. ej. "GTM-XXXXXXX"
  ADSENSE_CLIENT: "",  // p. ej. "ca-pub-XXXXXXXXXXXXX"

  // --- Hotkey de sala de juego (inyecta el botón de chat en páginas de juegos) ---
  // null = no cargar classroom-hotkey.js (chat standalone, sin juegos).
  // "/classroom-hotkey.js" = usar el archivo local.
  HOTKEY_SRC: null,

  // --- Dominios de enlaces permitidos (referencia; el servidor valida de verdad) ---
  // El servidor usa CHAT_ALLOWED_LINKS de /etc/budsin-chat.env. Mantén esto
  // consistente con el env si quieres que el mensaje "Solo se permiten..."
  // muestre los dominios correctos.
  ALLOWED_LINKS: ["chat.example.com", "google.com"]
};
