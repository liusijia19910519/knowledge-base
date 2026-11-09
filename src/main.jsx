import React from "react";
import { createRoot } from "react-dom/client";
import { KnowledgeApp } from "./kb/KnowledgeApp.jsx";
import "./styles.css";
import "./detail-overrides.css";
import "./knowledge-product.css";
import "./kb/product-fit.css";

createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <KnowledgeApp />
  </React.StrictMode>,
);
