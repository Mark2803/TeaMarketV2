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
      const describe = (selector: string) => {
        const el = document.querySelector<HTMLElement>(selector);

        if (!el) return `${selector}: NOT FOUND`;

        const r = el.getBoundingClientRect();
        const cs = getComputedStyle(el);

        return [
          selector,
          `left=${r.left.toFixed(1)} right=${r.right.toFixed(1)} width=${r.width.toFixed(1)}`,
          `clientWidth=${el.clientWidth} scrollWidth=${el.scrollWidth}`,
          `padding=${cs.paddingLeft} / ${cs.paddingRight}`,
          `margin=${cs.marginLeft} / ${cs.marginRight}`,
        ].join("\n");
      };

      const vv = window.visualViewport;

      const lines = [
        `innerWidth=${window.innerWidth}`,
        `documentWidth=${document.documentElement.clientWidth}`,
        `visualWidth=${vv?.width ?? "n/a"}`,
        `visualOffset=${vv?.offsetLeft ?? "n/a"}`,
        `DPR=${window.devicePixelRatio}`,
        "",
        describe("html"),
        "",
        describe("body"),
        "",
        describe("#root"),
        "",
        describe(".client-layout"),
        "",
        describe(".app-header"),
        "",
        describe(".app-header__brand"),
        "",
        describe(".app-header__actions"),
        "",
        describe(".client-layout__content"),
        "",
        describe(".bottom-navigation"),
      ];

      document.documentElement.style.overflow = "auto";
      document.body.style.overflow = "auto";

      const layout = document.querySelector<HTMLElement>(".client-layout");
      if (layout) {
        layout.style.height = "auto";
        layout.style.minHeight = "100vh";
        layout.style.overflow = "visible";
      }

      const content = document.querySelector<HTMLElement>(".client-layout__content");
      if (content) {
        content.style.overflow = "visible";
      }

      const panel = document.createElement("pre");
      panel.textContent = lines.join("\n");

      Object.assign(panel.style, {
        position: "absolute",
        zIndex: "2147483647",
        left: "4px",
        right: "4px",
        top: "4px",
        margin: "0",
        padding: "10px",
        background: "rgba(0,0,0,.94)",
        color: "#fff",
        font: "11px/1.35 monospace",
        whiteSpace: "pre-wrap",
        wordBreak: "break-word",
        borderRadius: "6px",
      });

      document.body.appendChild(panel);
    }, 1000);
  });
}