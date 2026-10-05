import React from "react";
import ReactDOM from "react-dom/client";

import App from "./app/App";

import "./shared/styles/global.css";
import "./shared/styles/layout.css";
import "./shared/styles/storefront-desktop-fix.css";
import "./shared/styles/product.css";
import "./shared/styles/auth.css";
import "./shared/styles/profile.css";
import "./shared/styles/cart.css";
import "./shared/styles/favorites.css";
import "./shared/styles/delivery.css";
import "./shared/styles/checkout.css";
import "./shared/styles/category-subcategories.css";
import "./shared/styles/articles.css";
import "./shared/styles/admin.css";
import "./shared/styles/home-desktop-horizontal-sections.css";

ReactDOM.createRoot(
  document.getElementById("root")!
).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);

/* TEMP: real-device horizontal overflow diagnostics */
if (new URLSearchParams(window.location.search).has("debug-width")) {
  window.addEventListener("load", () => {
    setTimeout(() => {
      const vw = document.documentElement.clientWidth;

      const bad = Array.from(document.querySelectorAll<HTMLElement>("*"))
        .map((el) => {
          const r = el.getBoundingClientRect();
          return {
            el,
            left: Math.round(r.left),
            right: Math.round(r.right),
            width: Math.round(r.width),
            overflow: Math.round(Math.max(0, r.right - vw)),
          };
        })
        .filter((x) => x.right > vw + 1 || x.left < -1 || x.width > vw + 1)
        .sort((a, b) => b.overflow - a.overflow)
        .slice(0, 12);

      const lines = [
        `viewport: ${vw}px`,
        `html scrollWidth: ${document.documentElement.scrollWidth}px`,
        `body scrollWidth: ${document.body.scrollWidth}px`,
        "",
        ...bad.map((x, i) => {
          const id = x.el.id ? `#${x.el.id}` : "";
          const cls =
            typeof x.el.className === "string" && x.el.className.trim()
              ? "." + x.el.className.trim().split(/\s+/).join(".")
              : "";

          return `${i + 1}. ${x.el.tagName.toLowerCase()}${id}${cls}
left=${x.left} right=${x.right} width=${x.width} overflow=${x.overflow}`;
        }),
      ];

      const panel = document.createElement("pre");
      panel.textContent = lines.join("\n");

      Object.assign(panel.style, {
        position: "fixed",
        zIndex: "2147483647",
        left: "4px",
        right: "4px",
        top: "4px",
        maxHeight: "75vh",
        overflow: "auto",
        margin: "0",
        padding: "10px",
        background: "rgba(0,0,0,.92)",
        color: "#fff",
        font: "11px/1.35 monospace",
        whiteSpace: "pre-wrap",
        wordBreak: "break-all",
        borderRadius: "6px",
      });

      document.body.appendChild(panel);
    }, 1000);
  });
}