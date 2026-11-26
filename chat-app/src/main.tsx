import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";
import "./styles.css";

// Register service worker para PWA (solo en producción)
if ("serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    navigator.serviceWorker.register("./sw.js").catch(() => {
      /* ignore errors en desarrollo */
    });
  });
}

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
