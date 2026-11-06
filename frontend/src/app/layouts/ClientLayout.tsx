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
            <a href="https://t.me/TeaMasterTeam" target="_blank" rel="noopener noreferrer" onClick={() => setContactsOpen(false)}>
              <span className="contact-float__channel-icon contact-float__channel-icon--telegram"><Send size={19} aria-hidden="true" /></span><span>Telegram</span>
            </a>
            <a href="https://wa.me/79218855660" target="_blank" rel="noopener noreferrer" onClick={() => setContactsOpen(false)}>
              <span className="contact-float__channel-icon contact-float__channel-icon--whatsapp"><MessageCircle size={19} aria-hidden="true" /></span><span>WhatsApp</span>
            </a>
            <div className="contact-float__inactive" aria-disabled="true"><span className="contact-float__channel-icon contact-float__channel-icon--max">M</span><span>MAX</span></div>
          </div>
        )}
        <button type="button" className="contact-float__toggle"
          aria-label={contactsOpen ? "Закрыть способы связи" : "Связаться с магазином"}
          aria-expanded={contactsOpen} aria-controls="store-contact-menu"
          onClick={() => setContactsOpen(value => !value)}>
          {contactsOpen ? <X size={23} /> : <MessageCircle size={23} strokeWidth={1.7} />}
        </button>
      </div>
      <BottomNavigation />
    </div>
  );
}
