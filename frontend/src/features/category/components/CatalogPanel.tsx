import {
  ChevronRight,
  Minus,
  Search,
  X
} from "lucide-react";

import {
  filterGroups,
  sortOptions
} from "../category.data";

import type {
  ActiveCatalogPanel
} from "../category.types";

type CatalogPanelProps = {
  activePanel: Exclude<ActiveCatalogPanel, null>;
  sortValue: string;
  onClose: () => void;
  onSortChange: (value: string) => void;
};

export default function CatalogPanel({
  activePanel,
  sortValue,
  onClose,
  onSortChange
}: CatalogPanelProps) {
  return (
    <div
      className="catalog-panel-backdrop"
      role="presentation"
      onMouseDown={onClose}
    >
      <section
        className="catalog-panel"
        role="dialog"
        aria-modal="true"
        aria-label={
          activePanel === "filters"
            ? "Фильтры"
            : "Сортировка"
        }
        onMouseDown={(event) => event.stopPropagation()}
      >
        <header className="catalog-panel__header">
          <button
            type="button"
            aria-label="Закрыть"
            onClick={onClose}
          >
            <X
              size={23}
              strokeWidth={1.7}
              aria-hidden="true"
            />
          </button>

          <h2>
            {activePanel === "filters"
              ? "Фильтры"
              : "Сортировка"}
          </h2>

          {activePanel === "filters"
            ? (
                <button
                  type="button"
                  className="catalog-panel__reset"
                >
                  Сбросить
                </button>
              )
            : <span />}
        </header>

        {activePanel === "filters"
          ? (
              <div className="catalog-filter-list">
                {filterGroups.map(
                  ([title, value], index) => (
                    <button
                      key={title}
                      type="button"
                      className="catalog-filter-row"
                    >
                      <span className="catalog-filter-row__icon">
                        {index === 0
                          ? <Minus size={17} />
                          : <Search size={17} />}
                      </span>

                      <span className="catalog-filter-row__content">
                        <strong>
                          {title}
                        </strong>

                        <small>
                          {value}
                        </small>
                      </span>

                      <ChevronRight
                        size={18}
                        strokeWidth={1.6}
                        aria-hidden="true"
                      />
                    </button>
                  )
                )}
              </div>
            )
          : (
              <div className="catalog-sort-list">
                {sortOptions.map(
                  (option) => (
                    <label
                      key={option.value}
                      className="catalog-sort-option"
                    >
                      <input
                        type="radio"
                        name="catalog-sort"
                        value={option.value}
                        checked={sortValue === option.value}
                        onChange={() => onSortChange(option.value)}
                      />

                      <span className="catalog-sort-option__content">
                        <strong>
                          {option.title}
                        </strong>

                        <small>
                          {option.description}
                        </small>
                      </span>

                      <span className="catalog-sort-option__radio" />
                    </label>
                  )
                )}
              </div>
            )}

        <button
          type="button"
          className="catalog-panel__apply"
          onClick={onClose}
        >
          {activePanel === "filters"
            ? "Показать 57 товаров"
            : "Применить"}
        </button>
      </section>
    </div>
  );
}
