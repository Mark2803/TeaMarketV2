import {
  Camera,
  Mail,
  MessageCircle,
  Phone,
  Send
} from "lucide-react";

import BackLink from "../shared/components/BackLink";
import "../shared/styles/contacts.css";

export default function ContactsPage() {
  return (
    <div className="contacts-page">
      <BackLink to="/" label="Главная" />

      <header className="contacts-page__heading">
        <span className="contacts-page__eyebrow">
          Чайный Мастер
        </span>

        <h1>Контакты</h1>

        <p>Производство и продажа чая</p>
      </header>

      <section className="contacts-card" aria-label="Контактная информация">
        <a
          className="contacts-item"
          href="tel:+78129001590"
        >
          <span className="contacts-item__icon">
            <Phone size={21} strokeWidth={1.7} aria-hidden="true" />
          </span>

          <span className="contacts-item__content">
            <span className="contacts-item__label">Телефон</span>
            <strong>8 (812) 900 15 90</strong>
          </span>
        </a>

        <a
          className="contacts-item"
          href="mailto:info@tea-master-team.ru"
        >
          <span className="contacts-item__icon">
            <Mail size={21} strokeWidth={1.7} aria-hidden="true" />
          </span>

          <span className="contacts-item__content">
            <span className="contacts-item__label">E-mail</span>
            <strong>info@tea-master-team.ru</strong>
          </span>
        </a>

        <a
          className="contacts-item"
          href="https://t.me/TeaMasterTeam"
          target="_blank"
          rel="noreferrer"
        >
          <span className="contacts-item__icon">
            <Send size={21} strokeWidth={1.7} aria-hidden="true" />
          </span>

          <span className="contacts-item__content">
            <span className="contacts-item__label">Telegram</span>
            <strong>@TeaMasterTeam</strong>
          </span>
        </a>

        <div className="contacts-item contacts-item--placeholder">
          <span className="contacts-item__icon">
            <MessageCircle size={21} strokeWidth={1.7} aria-hidden="true" />
          </span>

          <span className="contacts-item__content">
            <span className="contacts-item__label">VK</span>
            <strong>Заглушка</strong>
          </span>
        </div>

        <div className="contacts-item contacts-item--placeholder">
          <span className="contacts-item__icon">
            <Camera size={21} strokeWidth={1.7} aria-hidden="true" />
          </span>

          <span className="contacts-item__content">
            <span className="contacts-item__label">Instagram</span>
            <strong>Заглушка</strong>
          </span>
        </div>
      </section>
    </div>
  );
}
