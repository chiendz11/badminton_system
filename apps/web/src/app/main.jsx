import React from "react";
import ReactDOM from "react-dom/client";
import "../shared/styles/index.css";
import App from "./App.jsx";
import "@fortawesome/fontawesome-free/css/all.min.css";
import "bootstrap/dist/css/bootstrap.min.css";
import "../shared/styles/global.css";

// Giả sử bạn có SessionContext
import { SessionProvider } from "../shared/session/SessionContext.jsx";

const root = ReactDOM.createRoot(document.getElementById("root"));
root.render(
  <React.StrictMode>
    <SessionProvider>
      <App />
    </SessionProvider>
  </React.StrictMode>,
);
