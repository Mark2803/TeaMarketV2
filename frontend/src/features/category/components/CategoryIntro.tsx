import {
  ChevronDown
} from "lucide-react";

import heroImage from "../../../assets/hero.png";

type CategoryIntroProps = {
  categoryName: string;
  description: string;
  isDescriptionOpen: boolean;
  onToggleDescription: () => void;
};

export default function CategoryIntro({
  categoryName,
  description,
  isDescriptionOpen,
  onToggleDescription
}: CategoryIntroProps) {
  return (
    <section className="category-intro">
      <div className="category-intro__media">
        <img
          src={heroImage}
          alt="Чай и чайная посуда"
        />
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
