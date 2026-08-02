import { Heart, Minus, Plus, Share2, ShoppingCart } from "lucide-react";

type ProductPurchaseProps = {
  quantity: number;
  favorite: boolean;
  disabled: boolean;
  onDecrease: () => void;
  onIncrease: () => void;
  onToggleFavorite: () => void;
};

export default function ProductPurchase(props: ProductPurchaseProps) {
  return (
    <section className="product-purchase">
      <div className="product-purchase__quantity-row">
        <h2>Количество</h2>
        <div className="product-quantity">
          <button type="button" onClick={props.onDecrease} disabled={props.quantity <= 1}><Minus size={17} /></button>
          <strong>{props.quantity}</strong>
          <button type="button" onClick={props.onIncrease}><Plus size={17} /></button>
        </div>
      </div>

      <button type="button" className="product-add-cart" disabled={props.disabled}>
        <ShoppingCart size={21} />
        {props.disabled ? "Нет в наличии" : "Добавить в корзину"}
      </button>

      <div className="product-purchase__secondary">
        <button type="button" onClick={props.onToggleFavorite}>
          <Heart size={21} fill={props.favorite ? "currentColor" : "none"} />
          В избранное
        </button>
        <button type="button">
          <Share2 size={20} />
          Поделиться
        </button>
      </div>
    </section>
  );
}
