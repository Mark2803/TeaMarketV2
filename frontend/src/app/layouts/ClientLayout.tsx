import "../../shared/styles/unified-header.css";
import "../../shared/styles/storefront-navigation-final.css";
import "../../shared/styles/mobile-fixed-bars.css";

import {
  Outlet
} from "react-router-dom";

import AppHeader from "../../shared/widgets/AppHeader";
import BottomNavigation from "../../shared/widgets/BottomNavigation";

export default function ClientLayout() {
  return (
    <div className="client-layout">
      <AppHeader />

      <main className="client-layout__content">
        <Outlet />
      </main>

      <footer
        className="client-layout__footer"
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          gap: 12,
          flexWrap: "wrap",
          padding: "24px 20px 96px",
          marginTop: "auto",
          borderTop: "1px solid rgba(128, 128, 128, 0.18)",
        }}
      >
        <span style={{ fontSize: 13, opacity: 0.75 }}>Способы оплаты</span>
        <img
          src="/Mir.png"
          alt="Платёжная система Мир"
          width={80}
          style={{ display: "block", width: 80, height: "auto", objectFit: "contain" }}
        />
      </footer>

      <BottomNavigation />
    </div>
  );
}
