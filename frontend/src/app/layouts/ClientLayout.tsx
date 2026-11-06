import "../../shared/styles/unified-header.css";

import {
  Outlet
} from "react-router-dom";

import AppHeader from "../../shared/widgets/AppHeader";
import BottomNavigation from "../../shared/widgets/BottomNavigation";
import { MessageCircle, Send, X } from "lucide-react";
import { useState } from "react";

export default function ClientLayout() {
  const [contactsOpen, setContactsOpen] = useState(false);
  return (
    <div className="client-layout">
      <AppHeader />

      <main className="client-layout__content">
        <Outlet />
      </main>

      <div className="contact-float">
        {contactsOpen && (
          <div className="contact-float__menu" id="store-contact-menu">
            <strong>Связаться с нами</strong>
            <a href="https://t.me/TeaMsterTeam" target="_blank" rel="noopener noreferrer" onClick={() => setContactsOpen(false)}>
              <Send size={19} aria-hidden="true" /> Telegram
            </a>
            <a href="https://wa.me/79218855660" target="_blank" rel="noopener noreferrer" onClick={() => setContactsOpen(false)}>
              <MessageCircle size={19} aria-hidden="true" /> WhatsApp
            </a>
          </div>
        )}
        <button type="button" className="contact-float__toggle"
          aria-label={contactsOpen ? "Закрыть способы связи" : "Связаться с магазином"}
          aria-expanded={contactsOpen} aria-controls="store-contact-menu"
          onClick={() => setContactsOpen(value => !value)}>
          {contactsOpen ? <X size={24} /> : <MessageCircle size={24} />}
        </button>
      </div>
      <BottomNavigation />
    </div>
  );
}
