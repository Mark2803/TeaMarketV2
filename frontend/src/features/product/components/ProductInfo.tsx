type ProductInfoProps = {
  name: string;
  subtitle: string;
  rating: string;
  reviews: number;
  price: number;
  oldPrice: number | null;
  article: string;
};

export default function ProductInfo(props: ProductInfoProps) {
  const discount = props.oldPrice ? Math.round((1 - props.price / props.oldPrice) * 100) : null;

  return (
    <section className="product-info">
      <h1>{props.name}</h1>
      <p className="product-info__subtitle">{props.subtitle}</p>
      <div className="product-info__rating">
        <span>★ {props.rating} ({props.reviews})</span>
        <span>32 отзыва</span>
      </div>
      <div className="product-info__price-row">
        <strong>{props.price.toLocaleString("ru-RU")} ₽</strong>
        {props.oldPrice && <del>{props.oldPrice.toLocaleString("ru-RU")} ₽</del>}
        {discount && <span>-{discount}%</span>}
      </div>
      <div className="product-info__meta">
        <span>В наличии</span>
        <span>Артикул: {props.article}</span>
      </div>
    </section>
  );
}
