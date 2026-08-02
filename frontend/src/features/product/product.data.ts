import heroImage from "../../assets/hero.png";

export const productDemo = {
  slug: "gaba-alishan",
  name: "Улун Габа Алишань",
  subtitle: "Высокогорный GABA улун из Алишань, Тайвань",
  rating: "4,9",
  reviews: 128,
  article: "GA-AL-50",
  country: "Тайвань",
  region: "Алишань",
  producer: "Alishan Tea Farm",
  teaType: "Улун",
  fermentation: "Слабоферментированный",
  form: "Скрученный в шарики",
  images: [heroImage, heroImage, heroImage, heroImage, heroImage],
  variants: [
    { id: "25", label: "25 г", price: 350, oldPrice: null, stock: 26, status: "available" },
    { id: "50", label: "50 г", price: 620, oldPrice: 820, stock: 18, status: "available" },
    { id: "100", label: "100 г", price: 1150, oldPrice: null, stock: 4, status: "low" },
    { id: "250", label: "250 г", price: 2250, oldPrice: null, stock: 0, status: "unavailable" }
  ]
} as const;

export const recommendationProducts = [
  { slug: "te-guan-yin", name: "Те Гуань Инь Классический", price: 550, rating: "4,8" },
  { slug: "dong-ding", name: "Дун Дин Тайваньский", price: 590, rating: "4,9" },
  { slug: "li-shan", name: "Ли Шань Премиум", price: 880, rating: "4,9" },
  { slug: "milk-oolong", name: "Жень Шань Молочный", price: 450, rating: "4,7" }
] as const;
