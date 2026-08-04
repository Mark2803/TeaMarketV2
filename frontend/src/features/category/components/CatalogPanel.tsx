import {
  X
} from "lucide-react";

import {
  sortOptions
} from "../category.options";

import type {
  ActiveCatalogPanel
} from "../category.types";

type CatalogPanelProps = {
  activePanel: Exclude<ActiveCatalogPanel, null>;
  sortValue: string;
  onClose: () => void;
  onSortChange: (
    value: "newest" | "name-asc" | "name-desc"
  ) => void;
};

export default function CatalogPanel({
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
        aria-label="Сортировка"
        onMouseDown={(event) =>
          event.stopPropagation()
        }
      >
        <header className="catalog-panel__header">
          <button
            type="button"
            aria-label="Закрыть"
            onClick={onClose}
          >
            <X size={23} aria-hidden="true" />
          </button>

          <h2>Сортировка</h2>
          <span />
        </header>

        <div className="catalog-sort-list">
          {sortOptions.map((option) => (
            <label
              key={option.value}
              className="catalog-sort-option"
            >
              <input
                type="radio"
                name="catalog-sort"
                value={option.value}
                checked={sortValue === option.value}
                onChange={() =>
                  onSortChange(
                    option.value as
                      | "newest"
                      | "name-asc"
                      | "name-desc"
                  )
                }
              />

              <span className="catalog-sort-option__content">
                <strong>{option.title}</strong>
                <small>{option.description}</small>
              </span>

              <span className="catalog-sort-option__radio" />
            </label>
          ))}
        </div>

        <button
          type="button"
          className="catalog-panel__apply"
          onClick={onClose}
        >
          Применить
        </button>
      </section>
    </div>
  );
}
