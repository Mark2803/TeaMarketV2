import { Link } from "react-router-dom";
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
          Чайный Маркет
        </span>

        <h1>Контакты</h1>

        <p>Производство и продажа чая</p>
      </header>

      <p className="contacts-legal-link"><Link to="/legal/offer">Публичная оферта и условия возврата</Link></p>

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

        <a className="contacts-item" href="https://vk.ru/club241303868" target="_blank" rel="noopener noreferrer">
          <span className="contacts-item__icon">
            <MessageCircle size={21} strokeWidth={1.7} aria-hidden="true" />
          </span>

          <span className="contacts-item__content">
            <span className="contacts-item__label">VK</span>
            <strong>Чайный Маркет</strong>
          </span>
        </a>

        <a className="contacts-item" href="https://www.instagram.com/teamasterteam/" target="_blank" rel="noopener noreferrer">
          <span className="contacts-item__icon">
            <Camera size={21} strokeWidth={1.7} aria-hidden="true" />
          </span>

          <span className="contacts-item__content">
            <span className="contacts-item__label">Instagram</span>
            <strong>@teamasterteam</strong>
          </span>
        </a>
      </section>

      <div className="contacts-page__legal" aria-label="Реквизиты продавца">
        <span>ИНН 780632012138</span>
        <span>ОГРНИП 325784700260989</span>
      </div>
      <div className="contacts-page__developer"><a href="https://t.me/Chen_MT" target="_blank" rel="noopener noreferrer">Разработка сайтов и автоматизация бизнес-процессов</a></div>
    </div>
  );
}
