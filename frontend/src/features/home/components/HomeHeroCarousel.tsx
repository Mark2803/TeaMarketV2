import {
  ChevronLeft,
  ChevronRight
} from "lucide-react";

import {
  useCallback,
  useEffect,
  useRef,
  useState
} from "react";

import {
  Link
} from "react-router-dom";

import type {
  HomeBanner
} from "../../../shared/types/home-banner";

type Props = {
  banners: HomeBanner[];
};

const AUTO_PLAY_DELAY_MS = 6000;
const SWIPE_THRESHOLD_PX = 30;

export default function HomeHeroCarousel({
  banners
}: Props) {
  const [activeIndex, setActiveIndex] =
    useState(0);

  const [isPaused, setIsPaused] =
    useState(false);

  const touchStartX =
    useRef<number | null>(null);

  const touchStartY =
    useRef<number | null>(null);

  useEffect(() => {
    setActiveIndex((currentIndex) =>
      Math.min(
        currentIndex,
        Math.max(0, banners.length - 1)
      )
    );
  }, [banners.length]);

  const move = useCallback(
    (direction: number) => {
      if (banners.length < 2) {
        return;
      }

      setActiveIndex((currentIndex) =>
        (
          currentIndex
          + direction
          + banners.length
        ) % banners.length
      );
    },
    [banners.length]
  );

  useEffect(() => {
    if (
      banners.length < 2
      || isPaused
    ) {
      return;
    }

    const timerId =
      window.setInterval(
        () => move(1),
        AUTO_PLAY_DELAY_MS
      );

    return () => {
      window.clearInterval(timerId);
    };
  }, [
    banners.length,
    isPaused,
    move
  ]);

  if (banners.length === 0) {
    return null;
  }

  const banner =
    banners[activeIndex];

  const handlePrevious = () => {
    setIsPaused(true);
    move(-1);
  };

  const handleNext = () => {
    setIsPaused(true);
    move(1);
  };

  const handleKeyDown = (
    event: React.KeyboardEvent<HTMLElement>
  ) => {
    if (event.key === "ArrowLeft") {
      event.preventDefault();
      handlePrevious();
    }

    if (event.key === "ArrowRight") {
      event.preventDefault();
      handleNext();
    }
  };

  const handleTouchStart = (
    event: React.TouchEvent<HTMLAnchorElement>
  ) => {
    const touch =
      event.touches[0];

    touchStartX.current =
      touch?.clientX
      ?? null;

    touchStartY.current =
      touch?.clientY
      ?? null;

    setIsPaused(true);
  };

  const handleTouchEnd = (
    event: React.TouchEvent<HTMLAnchorElement>
  ) => {
    const touch =
      event.changedTouches[0];

    const startX =
      touchStartX.current;

    const startY =
      touchStartY.current;

    const endX =
      touch?.clientX;

    const endY =
      touch?.clientY;

    touchStartX.current = null;
    touchStartY.current = null;

    if (
      startX == null
      || startY == null
      || endX == null
      || endY == null
    ) {
      setIsPaused(false);
      return;
    }

    const deltaX =
      endX - startX;

    const deltaY =
      endY - startY;

    const isHorizontalGesture =
      Math.abs(deltaX)
      > Math.abs(deltaY);

    if (
      isHorizontalGesture
      && Math.abs(deltaX)
        >= SWIPE_THRESHOLD_PX
    ) {
      move(
        deltaX < 0
          ? 1
          : -1
      );
    }

    window.setTimeout(
      () => setIsPaused(false),
      800
    );
  };

  return (
    <section
      className="home-hero-carousel"
      aria-label="Тематические подборки"
      tabIndex={0}
      onKeyDown={handleKeyDown}
      onMouseEnter={() =>
        setIsPaused(true)
      }
      onMouseLeave={() =>
        setIsPaused(false)
      }
      onFocus={() =>
        setIsPaused(true)
      }
      onBlur={() =>
        setIsPaused(false)
      }
    >
      <Link
        key={banner.id}
        to={`/collections/${banner.collections.slug}`}
        className="home-hero-carousel__slide"
        style={
          banner.image_url
            ? {
                backgroundImage:
                  `linear-gradient(
                    90deg,
                    rgba(21, 53, 38, 0.94),
                    rgba(21, 53, 38, 0.52)
                  ),
                  url("${banner.image_url}")`
              }
            : undefined
        }
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
      >
        <span className="home-hero-carousel__eyebrow">
          {banner.eyebrow}
        </span>

        <h1>
          {banner.title}
        </h1>

        {banner.subtitle && (
          <p>
            {banner.subtitle}
          </p>
        )}

        <span className="home-hero-carousel__target">
          Подборка:
          {" "}
          {banner.collections.name}
        </span>
      </Link>

      {banners.length > 1 && (
        <>
          <button
            type="button"
            className="home-hero-carousel__arrow home-hero-carousel__arrow--left"
            aria-label="Показать предыдущую плашку"
            onClick={handlePrevious}
          >
            <ChevronLeft
              size={28}
              strokeWidth={1.8}
              aria-hidden="true"
            />
          </button>

          <button
            type="button"
            className="home-hero-carousel__arrow home-hero-carousel__arrow--right"
            aria-label="Показать следующую плашку"
            onClick={handleNext}
          >
            <ChevronRight
              size={28}
              strokeWidth={1.8}
              aria-hidden="true"
            />
          </button>

          <div
            className="home-hero-carousel__dots"
            aria-label="Переключение плашек"
          >
            {banners.map(
              (item, index) => (
                <button
                  key={item.id}
                  type="button"
                  className={
                    index === activeIndex
                      ? "home-hero-carousel__dot home-hero-carousel__dot--active"
                      : "home-hero-carousel__dot"
                  }
                  aria-label={`Показать плашку ${index + 1}`}
                  aria-current={
                    index === activeIndex
                      ? "true"
                      : undefined
                  }
                  onClick={() => {
                    setIsPaused(true);
                    setActiveIndex(index);
                  }}
                />
              )
            )}
          </div>
        </>
      )}
    </section>
  );
}
