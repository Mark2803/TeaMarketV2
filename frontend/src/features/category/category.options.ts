import type {
  SortOption
} from "./category.types";

export const sortOptions: SortOption[] = [
  {
    value: "newest",
    title: "Сначала новые",
    description: "По дате добавления"
  },
  {
    value: "name-asc",
    title: "Название А–Я",
    description: "По алфавиту"
  },
  {
    value: "name-desc",
    title: "Название Я–А",
    description: "В обратном порядке"
  }
];
