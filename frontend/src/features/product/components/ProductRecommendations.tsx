import { Heart, ShoppingCart } from "lucide-react";
import { Link } from "react-router-dom";
import heroImage from "../../../assets/hero.png";
import { recommendationProducts } from "../product.data";

export default function ProductRecommendations() {
  return (
    <section className="product-detail-section product-recommendations">
      <h2>Рекомендации</h2>
      <div className="product-recommendations__tabs">
        <button type="button" className="product-recommendations__tab--active">Похожие товары</button>
        <button type="button">Рекомендуемые</button>
        <button type="button">Из этой подборки</button>
      </div>
      <div className="product-recommendations__list">
        {recommendationProducts.map((product) => (
          <article key={product.slug} className="recommendation-card">
            <Link to={`/products/${product.slug}`} className="recommendation-card__image">
              <img src={heroImage} alt={product.name} />
              <Heart size={18} />
            </Link>
            <h3><Link to={`/products/${product.slug}`}>{product.name}</Link></h3>
            <small>50 г</small>
            <span>★ {product.rating}</span>
            <div><strong>{product.price} ₽</strong><button type="button"><ShoppingCart size={18} /></button></div>
          </article>
        ))}
      </div>
    </section>
  );
}
