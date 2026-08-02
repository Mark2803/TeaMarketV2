import { Bell } from "lucide-react";

export default function StockNotification() {
  return (
    <section className="stock-notification">
      <div>
        <Bell size={24} strokeWidth={1.6} />
        <div>
          <strong>Нет в наличии нужного веса?</strong>
          <p>Подпишитесь, и мы сообщим о поступлении</p>
        </div>
      </div>
      <form onSubmit={(event) => event.preventDefault()}>
        <input type="email" placeholder="Ваш e-mail" aria-label="Ваш e-mail" />
        <button type="submit">Подписаться</button>
      </form>
    </section>
  );
}
