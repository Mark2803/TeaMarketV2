import React from "react";
import ReactDOM from "react-dom/client";

import App from "./app/App";

import "./shared/styles/global.css";
import "./shared/styles/layout.css";
import "./shared/styles/product.css";
import "./shared/styles/auth.css";
import "./shared/styles/profile.css";
import "./shared/styles/cart.css";
import "./shared/styles/favorites.css";
import "./shared/styles/delivery.css";
import "./shared/styles/checkout.css";
import "./shared/styles/category-subcategories.css";
import "./shared/styles/articles.css";

ReactDOM.createRoot(
  document.getElementById("root")!
).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
