import {
  useEffect,
  useRef,
  useState
} from "react";

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
  const descriptionRef = useRef<HTMLParagraphElement | null>(null);
  const [canToggleDescription, setCanToggleDescription] = useState(false);

  useEffect(() => {
    const element = descriptionRef.current;
    if (!element || !description.trim()) {
      setCanToggleDescription(false);
      return;
    }

    const measure = () => {
      const styles = window.getComputedStyle(element);
      const fontSize = Number.parseFloat(styles.fontSize) || 16;
      const parsedLineHeight = Number.parseFloat(styles.lineHeight);
      const lineHeight = Number.isFinite(parsedLineHeight)
        ? parsedLineHeight
        : fontSize * 1.2;

      // Кнопка нужна только если полный текст занимает больше трёх строк.
      setCanToggleDescription(element.scrollHeight > lineHeight * 3 + 1);
    };

    measure();

    const observer = new ResizeObserver(measure);
    observer.observe(element);

    return () => observer.disconnect();
  }, [description]);

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

      <h2>{categoryName}</h2>

      <p
        ref={descriptionRef}
        className={
          isDescriptionOpen
            ? "category-intro__description category-intro__description--open"
            : "category-intro__description"
        }
      >
        {description}
      </p>

      {canToggleDescription && (
        <button
          type="button"
          className={
            isDescriptionOpen
              ? "category-intro__more category-intro__more--open"
              : "category-intro__more"
          }
          onClick={onToggleDescription}
          aria-expanded={isDescriptionOpen}
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
      )}
    </section>
  );
}
