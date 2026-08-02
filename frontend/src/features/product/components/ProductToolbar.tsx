import { ArrowLeft, Heart, Share2 } from "lucide-react";
import { useNavigate } from "react-router-dom";

type ProductToolbarProps = {
  favorite: boolean;
  onToggleFavorite: () => void;
};

export default function ProductToolbar({ favorite, onToggleFavorite }: ProductToolbarProps) {
  const navigate = useNavigate();

  return (
    <header className="product-toolbar">
      <button type="button" onClick={() => navigate(-1)} aria-label="Назад">
        <ArrowLeft size={23} strokeWidth={1.7} />
      </button>

      <div className="product-toolbar__brand">
        <span>茶</span>
        <strong>ЧАЯ</strong>
        <small>производство<br />и продажа чая</small>
      </div>

      <div className="product-toolbar__actions">
        <button type="button" onClick={onToggleFavorite} aria-label="Избранное">
          <Heart size={23} fill={favorite ? "currentColor" : "none"} strokeWidth={1.7} />
        </button>
        <button type="button" aria-label="Поделиться">
          <Share2 size={22} strokeWidth={1.7} />
        </button>
      </div>
    </header>
  );
}
