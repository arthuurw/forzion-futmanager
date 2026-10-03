import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { App } from "./App";
import { registerServiceWorker, watchInstall } from "./pwa/register";
import "./styles.css";

// Offline-instalar AC 3, AC 10: the worker in the production build; the install invitation from the start.
watchInstall(window);
void registerServiceWorker({ production: import.meta.env.PROD, navigator });

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
