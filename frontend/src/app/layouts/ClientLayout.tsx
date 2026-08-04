import "../../shared/styles/unified-header.css";

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

      <BottomNavigation />
    </div>
  );
}
