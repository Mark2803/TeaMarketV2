import {
  Outlet
} from "react-router-dom";

export default function CheckoutLayout() {
  return (
    <div className="checkout-layout">
      <main className="checkout-layout__content">
        <Outlet />
      </main>
    </div>
  );
}