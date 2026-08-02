import type {
  CategoryDefinition,
  CategoryProduct,
  SortOption
} from "./category.types";

const createProducts = (
  items: Array<
    Omit<CategoryProduct, "imageClass"> & {
      tone: number;
    }
  >
): CategoryProduct[] =>
  items.map(({ tone, ...product }) => ({
    ...product,
    imageClass: `category-product-card__image--${tone}`
  }));

export const categoryCatalog: Record<string, CategoryDefinition> = {
  "shu-puer": {
    name: "Шу Пуэр",
    description:
      "Постферментированные чаи с плотным, мягким вкусом, древесными оттенками и глубоким тёмным настоем.",
    productCount: 128,
    subcategories: ["Рассыпной", "Прессованный", "Выдержанный", "С добавками"],
    products: createProducts([
      { slug: "shu-puer-menghai", name: "Шу Пуэр Мэнхай", details: "Юньнань · Плотный вкус", weight: "50 г", price: "290 ₽", badge: "Хит", tone: 6 },
      { slug: "shu-puer-gong-ting", name: "Гун Тин", details: "Юньнань · Дворцовый пуэр", weight: "50 г", price: "360 ₽", badge: "Новинка", tone: 4 },
      { slug: "shu-puer-lao-cha-tou", name: "Лао Ча Тоу", details: "Юньнань · Чайные головы", weight: "50 г", price: "420 ₽", badge: null, tone: 2 },
      { slug: "shu-puer-nomi", name: "Шу Пуэр Номи", details: "Юньнань · Рисовый аромат", weight: "50 г", price: "330 ₽", badge: null, tone: 1 }
    ])
  },
  "sheng-puer": {
    name: "Шен Пуэр",
    description:
      "Живые и свежие пуэры с травяными, фруктовыми и медовыми оттенками, которые меняются с выдержкой.",
    productCount: 96,
    subcategories: ["Молодой шен", "Выдержанный", "Рассыпной", "Прессованный"],
    products: createProducts([
      { slug: "sheng-puer-yiwu", name: "Шен Пуэр Иу", details: "Юньнань · Медовый профиль", weight: "50 г", price: "390 ₽", badge: "Хит", tone: 3 },
      { slug: "sheng-puer-bulan", name: "Шен Пуэр Булан", details: "Юньнань · Выразительный", weight: "50 г", price: "450 ₽", badge: null, tone: 5 },
      { slug: "sheng-puer-jingmai", name: "Шен Пуэр Цзинмай", details: "Юньнань · Цветочный", weight: "50 г", price: "520 ₽", badge: "Новинка", tone: 1 },
      { slug: "sheng-puer-lincang", name: "Шен Пуэр Линьцан", details: "Юньнань · Свежий", weight: "50 г", price: "350 ₽", badge: null, tone: 3 }
    ])
  },
  oolong: {
    name: "Улуны",
    description:
      "Полуферментированные чаи с богатым вкусом и ароматом. Сочетают свежесть зелёного чая и глубину красного.",
    productCount: 84,
    subcategories: ["Тайваньские улуны", "Гуандунские улуны", "Уишаньские улуны", "Фуцзяньские улуны"],
    products: createProducts([
      { slug: "gaba-alishan", name: "Габа Алишань", details: "Тайвань · Высокогорный улун", weight: "50 г", price: "535 ₽", badge: "Хит", tone: 1 },
      { slug: "da-hun-pao", name: "Да Хун Пао", details: "Уишань · Сильный улун", weight: "50 г", price: "135 ₽", badge: "Новинка", tone: 2 },
      { slug: "te-guan-yin", name: "Те Гуань Инь", details: "Фуцзянь · Лёгкая ферментация", weight: "50 г", price: "120 ₽", badge: null, tone: 3 },
      { slug: "oolong-mango", name: "Улун с манго", details: "Китай · Ароматизированный", weight: "50 г", price: "135 ₽", badge: null, tone: 4 },
      { slug: "milk-oolong", name: "Молочный улун", details: "Китай · Мягкий сливочный", weight: "50 г", price: "165 ₽", badge: "Хит", tone: 5 },
      { slug: "dong-ding", name: "Дун Дин", details: "Тайвань · Печёный улун", weight: "50 г", price: "420 ₽", badge: null, tone: 6 }
    ])
  },
  "red-tea": {
    name: "Красный чай",
    description:
      "Полностью ферментированные китайские чаи с тёплым ароматом, насыщенным настоем и мягкой сладостью.",
    productCount: 112,
    subcategories: ["Дянь Хуны", "Сяо Чжуны", "Красные с добавками", "Премиальные"],
    products: createProducts([
      { slug: "dian-hong", name: "Дянь Хун", details: "Юньнань · Медово-пряный", weight: "50 г", price: "260 ₽", badge: "Хит", tone: 2 },
      { slug: "jin-jun-mei", name: "Цзинь Цзюнь Мэй", details: "Фуцзянь · Премиальный", weight: "50 г", price: "690 ₽", badge: "Новинка", tone: 4 },
      { slug: "zheng-shan-xiao-zhong", name: "Чжэн Шань Сяо Чжун", details: "Фуцзянь · Дымный", weight: "50 г", price: "310 ₽", badge: null, tone: 6 },
      { slug: "red-tea-lychee", name: "Красный чай с личи", details: "Китай · Фруктовый", weight: "50 г", price: "220 ₽", badge: null, tone: 1 }
    ])
  },
  "green-tea": {
    name: "Зелёный чай",
    description:
      "Свежие неферментированные чаи с лёгкой терпкостью, травяными нотами и прозрачным светлым настоем.",
    productCount: 92,
    subcategories: ["Лунцзин", "Билочунь", "Маофэн", "С жасмином"],
    products: createProducts([
      { slug: "longjing", name: "Лунцзин", details: "Чжэцзян · Орехово-травяной", weight: "50 г", price: "360 ₽", badge: "Хит", tone: 3 },
      { slug: "moli-hua-cha", name: "Моли Хуа Ча", details: "Фуцзянь · Жасминовый", weight: "50 г", price: "205 ₽", badge: "Новинка", tone: 5 },
      { slug: "bi-lo-chun", name: "Би Ло Чунь", details: "Цзянсу · Свежий", weight: "50 г", price: "330 ₽", badge: null, tone: 1 },
      { slug: "huang-shan-mao-feng", name: "Хуаншань Маофэн", details: "Аньхой · Цветочный", weight: "50 г", price: "390 ₽", badge: null, tone: 3 }
    ])
  },
  "white-tea": {
    name: "Белый чай",
    description:
      "Деликатные слабообработанные чаи с мягким вкусом, цветочно-медовым ароматом и естественной сладостью.",
    productCount: 68,
    subcategories: ["Бай Хао Инь Чжэнь", "Бай Му Дань", "Шоу Мэй", "Выдержанный белый"],
    products: createProducts([
      { slug: "bai-mu-dan", name: "Бай Му Дань", details: "Фуцзянь · Цветочно-медовый", weight: "50 г", price: "420 ₽", badge: "Хит", tone: 5 },
      { slug: "bai-hao-yin-zhen", name: "Бай Хао Инь Чжэнь", details: "Фуцзянь · Серебряные иглы", weight: "50 г", price: "780 ₽", badge: "Новинка", tone: 1 },
      { slug: "shou-mei", name: "Шоу Мэй", details: "Фуцзянь · Мягкий", weight: "50 г", price: "280 ₽", badge: null, tone: 3 },
      { slug: "white-tea-aged", name: "Выдержанный белый чай", details: "Фуцзянь · Глубокий", weight: "50 г", price: "510 ₽", badge: null, tone: 6 }
    ])
  },
  "yellow-tea": {
    name: "Жёлтый чай",
    description:
      "Редкие чаи с мягким прогревом листа, округлым вкусом, сладковатым ароматом и чистым золотистым настоем.",
    productCount: 24,
    subcategories: ["Цзюнь Шань Инь Чжэнь", "Мэн Дин Хуан Я", "Хо Шань Хуан Я", "Редкие сорта"],
    products: createProducts([
      { slug: "jun-shan-yin-zhen", name: "Цзюнь Шань Инь Чжэнь", details: "Хунань · Жёлтые иглы", weight: "50 г", price: "890 ₽", badge: "Хит", tone: 5 },
      { slug: "meng-ding-huang-ya", name: "Мэн Дин Хуан Я", details: "Сычуань · Мягкий и сладкий", weight: "50 г", price: "620 ₽", badge: "Новинка", tone: 1 },
      { slug: "huo-shan-huang-ya", name: "Хо Шань Хуан Я", details: "Аньхой · Свежий аромат", weight: "50 г", price: "570 ₽", badge: null, tone: 3 },
      { slug: "yellow-tea-premium", name: "Жёлтый чай Премиум", details: "Китай · Редкий сорт", weight: "50 г", price: "760 ₽", badge: null, tone: 2 }
    ])
  },
  matcha: {
    name: "Матча",
    description:
      "Порошковый зелёный чай с ярким цветом, плотной текстурой и насыщенным растительным вкусом.",
    productCount: 46,
    subcategories: ["Церемониальная", "Премиальная", "Кулинарная", "С добавками"],
    products: createProducts([
      { slug: "matcha-ceremonial", name: "Матча Церемониальная", details: "Япония · Высший сорт", weight: "30 г", price: "790 ₽", badge: "Хит", tone: 3 },
      { slug: "matcha-premium", name: "Матча Премиальная", details: "Япония · Яркий вкус", weight: "50 г", price: "640 ₽", badge: "Новинка", tone: 1 },
      { slug: "matcha-culinary", name: "Матча Кулинарная", details: "Япония · Для напитков", weight: "100 г", price: "520 ₽", badge: null, tone: 5 },
      { slug: "matcha-strawberry", name: "Матча с клубникой", details: "Япония · Ароматизированная", weight: "50 г", price: "490 ₽", badge: null, tone: 4 }
    ])
  },
  "herbal-tea": {
    name: "Травяной чай",
    description:
      "Ароматные травяные сборы без чайного листа для спокойного отдыха, тепла и разнообразия вкусов.",
    productCount: 73,
    subcategories: ["Успокаивающие", "Тонизирующие", "Ягодные", "Цветочные"],
    products: createProducts([
      { slug: "herbal-mountain", name: "Горный сбор", details: "Травы · Душистый", weight: "50 г", price: "240 ₽", badge: "Хит", tone: 3 },
      { slug: "herbal-evening", name: "Спокойный вечер", details: "Травы · Мягкий", weight: "50 г", price: "270 ₽", badge: "Новинка", tone: 5 },
      { slug: "herbal-berry", name: "Ягодный сбор", details: "Ягоды · Насыщенный", weight: "50 г", price: "250 ₽", badge: null, tone: 2 },
      { slug: "herbal-flower", name: "Цветочный луг", details: "Цветы · Ароматный", weight: "50 г", price: "260 ₽", badge: null, tone: 1 }
    ])
  },
  "tea-paste": {
    name: "Чайные смолы",
    description:
      "Концентрированные растворимые экстракты чая в удобном порционном формате для быстрого приготовления.",
    productCount: 28,
    subcategories: ["Смола Шу Пуэра", "Смола Габа", "С добавками", "Подарочные"],
    products: createProducts([
      { slug: "cha-gao-shu", name: "Смола Шу Пуэра", details: "Ча Гао · Классическая", weight: "12 г", price: "590 ₽", badge: "Хит", tone: 6 },
      { slug: "cha-gao-gaba", name: "Смола Габа", details: "Ча Гао · Мягкий вкус", weight: "12 г", price: "650 ₽", badge: "Новинка", tone: 4 },
      { slug: "cha-gao-nomi", name: "Смола Шу Пуэра Номи", details: "Ча Гао · Рисовый аромат", weight: "12 г", price: "620 ₽", badge: null, tone: 2 },
      { slug: "cha-gao-tiger", name: "Сердце Тигра", details: "Ча Гао · Насыщенная", weight: "12 г", price: "690 ₽", badge: null, tone: 1 }
    ])
  },
  "tea-sets": {
    name: "Чайные наборы",
    description:
      "Готовые сочетания чая и аксессуаров для подарка, знакомства с разными сортами и домашних чаепитий.",
    productCount: 36,
    subcategories: ["Подарочные", "Дегустационные", "С посудой", "Мини-наборы"],
    products: createProducts([
      { slug: "tea-set-discovery", name: "Знакомство с чаем", details: "Набор · 6 сортов", weight: "180 г", price: "1490 ₽", badge: "Хит", tone: 5 },
      { slug: "tea-set-gift", name: "Подарочный набор", details: "Набор · В коробке", weight: "250 г", price: "2190 ₽", badge: "Новинка", tone: 4 },
      { slug: "tea-set-oolong", name: "Коллекция улунов", details: "Набор · 4 сорта", weight: "120 г", price: "1290 ₽", badge: null, tone: 3 },
      { slug: "tea-set-puer", name: "Коллекция пуэров", details: "Набор · 4 сорта", weight: "120 г", price: "1390 ₽", badge: null, tone: 6 }
    ])
  },
  "tea-ware": {
    name: "Посуда",
    description:
      "Чайники, гайвани, чаши и аксессуары для удобного заваривания и красивой чайной церемонии.",
    productCount: 52,
    subcategories: ["Гайвани", "Чайники", "Пиалы", "Аксессуары"],
    products: createProducts([
      { slug: "gaiwan-porcelain", name: "Гайвань фарфоровая", details: "Посуда · 150 мл", weight: "1 шт.", price: "890 ₽", badge: "Хит", tone: 5 },
      { slug: "teapot-clay", name: "Чайник глиняный", details: "Посуда · 180 мл", weight: "1 шт.", price: "1690 ₽", badge: "Новинка", tone: 4 },
      { slug: "tea-cup-set", name: "Набор пиал", details: "Посуда · 4 шт.", weight: "1 набор", price: "990 ₽", badge: null, tone: 1 },
      { slug: "tea-tray", name: "Чайная доска", details: "Аксессуар · Бамбук", weight: "1 шт.", price: "1890 ₽", badge: null, tone: 6 }
    ])
  }
};

export const defaultCategory = categoryCatalog.oolong;

export const filterGroups = [
  ["Цена", "от 300 ₽ — до 2 000 ₽"],
  ["Вес", "Любой"],
  ["Страна", "Любая"],
  ["Регион", "Любой"],
  ["Вид чая", "Любой"],
  ["Эффект", "Не выбран"],
  ["Степень ферментации", "Не выбрана"],
  ["Форма продукта", "Не выбрана"],
  ["Наличие", "В наличии"],
  ["Особенности", "Не выбраны"]
] as const;

export const sortOptions: SortOption[] = [
  { value: "popular", title: "По популярности", description: "Сначала популярные" },
  { value: "price-asc", title: "Сначала дешевле", description: "Сначала товары с низкой ценой" },
  { value: "price-desc", title: "Сначала дороже", description: "Сначала товары с высокой ценой" },
  { value: "newest", title: "По новизне", description: "Сначала новые поступления" },
  { value: "discount", title: "По размеру скидки", description: "Сначала с максимальной скидкой" }
];
