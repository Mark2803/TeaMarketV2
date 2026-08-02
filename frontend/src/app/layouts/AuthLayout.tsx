import {
  Outlet
} from "react-router-dom";

export default function AuthLayout() {
  return (
    <div className="auth-layout">
      <main className="auth-layout__content">
        <Outlet />
      </main>
    </div>
  );
}