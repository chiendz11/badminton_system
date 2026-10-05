import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App.jsx";

import "../shared/styles/index.css"; // Dùng Tailwind sau này
import { SessionProvider } from "../shared/session/SessionContext.jsx";

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <SessionProvider>
      <App />
    </SessionProvider>
  </React.StrictMode>,
);
