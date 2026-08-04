import {
  ChevronDown,
  ImageOff
} from "lucide-react";

type CategoryIntroProps = {
  categoryName: string;
  description: string;
  imageUrl?: string | null;
  isDescriptionOpen: boolean;
  onToggleDescription: () => void;
};

export default function CategoryIntro({
  categoryName,
  description,
  imageUrl,
  isDescriptionOpen,
  onToggleDescription
}: CategoryIntroProps) {
  return (
    <section className="category-intro">
      <div className="category-intro__media">
        {imageUrl ? (
          <img
            src={imageUrl}
            alt={categoryName}
            loading="lazy"
          />
        ) : (
          <div
            className="category-intro__placeholder"
            aria-hidden="true"
          >
            <ImageOff
              size={48}
              strokeWidth={1.5}
            />
          </div>
        )}
      </div>

      <h2>
        {categoryName}
      </h2>

      <p
        className={
          isDescriptionOpen
            ? "category-intro__description category-intro__description--open"
            : "category-intro__description"
        }
      >
        {description}
      </p>

      <button
        type="button"
        className="category-intro__more"
        onClick={onToggleDescription}
      >
        {isDescriptionOpen
          ? "Скрыть описание"
          : "Показать больше"}

        <ChevronDown
          size={17}
          strokeWidth={1.7}
          aria-hidden="true"
        />
      </button>
    </section>
  );
}