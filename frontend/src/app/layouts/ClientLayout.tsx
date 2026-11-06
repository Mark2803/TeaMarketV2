import "../../shared/styles/unified-header.css";

import {
  Outlet
} from "react-router-dom";

import AppHeader from "../../shared/widgets/AppHeader";
import BottomNavigation from "../../shared/widgets/BottomNavigation";
import { MessageCircle, Send, X } from "lucide-react";
import { useEffect, useState } from "react";
import { apiRequest } from "../../shared/api/client";

type Messenger = { channel: "telegram" | "whatsapp" | "max"; contact: string; is_enabled: boolean };
const defaults: Messenger[] = [
  { channel: "telegram", contact: "https://t.me/TeaMasterTeam", is_enabled: true },
  { channel: "whatsapp", contact: "https://wa.me/79218855660", is_enabled: true },
  { channel: "max", contact: "", is_enabled: true }
];

export default function ClientLayout() {
  const [contactsOpen, setContactsOpen] = useState(false);
  const [messengers, setMessengers] = useState<Messenger[]>(defaults);
  useEffect(() => {
    let active = true;
    apiRequest<{ data: Messenger[] }>("/messengers").then(response => {
      if (active) setMessengers(response.data);
    }).catch(() => {});
    return () => { active = false; };
  }, []);
  return (
    <div className="client-layout">
      <AppHeader />

      <main className="client-layout__content">
        <Outlet />
      </main>

      {messengers.some(item => item.is_enabled) && <div className="contact-float">
        {contactsOpen && (
          <div className="contact-float__menu" id="store-contact-menu">
            <strong>Связаться с нами</strong>
            {messengers.filter(item => item.is_enabled).map(item => {
              const icon = <span className={`contact-float__channel-icon contact-float__channel-icon--${item.channel}`}>
                {item.channel === "telegram" ? <Send size={19} aria-hidden="true"/> :
                  item.channel === "whatsapp" ? <MessageCircle size={19} aria-hidden="true"/> : "M"}
              </span>;
              const label = item.channel === "telegram" ? "Telegram" : item.channel === "whatsapp" ? "WhatsApp" : "MAX";
              return item.contact ?
                <a key={item.channel} href={item.contact} target="_blank" rel="noopener noreferrer" onClick={() => setContactsOpen(false)}>
                  {icon}<span>{label}</span>
                </a> :
                <div key={item.channel} className="contact-float__inactive" aria-disabled="true">{icon}<span>{label}</span></div>;
            })}
          </div>
        )}
        <button type="button" className="contact-float__toggle"
          aria-label={contactsOpen ? "Закрыть способы связи" : "Связаться с магазином"}
          aria-expanded={contactsOpen} aria-controls="store-contact-menu"
          onClick={() => setContactsOpen(value => !value)}>
          {contactsOpen ? <X size={23} /> : <MessageCircle size={23} strokeWidth={1.7} />}
        </button>
      </div>}
      <BottomNavigation />
    </div>
  );
}
