import "dotenv/config";

import { Prisma } from "../src/generated/prisma/client.js";
import { prisma } from "../src/database/prisma.js";

const DEMO_CUSTOMER_PHONES = [
  "+79990000001",
  "+79990000002"
] as const;

const DEMO_ORDER_NUMBERS = [
  "DEMO-000001",
  "DEMO-000002"
] as const;

const DEMO_GUEST_TOKEN =
  "00000000-0000-4000-8000-000000000001";

const d = (
  value: number | string
): Prisma.Decimal => new Prisma.Decimal(value);

type CategoryInput = {
  name: string;
  slug: string;
  description: string;
  sortOrder: number;
  parentSlug?: string;
};

type VariantInput = {
  sku: string;
  weightG: number;
  price: number;
  oldPrice?: number;
  stock: number;
  available?: boolean;
  status?: string;
};

type ProductInput = {
  slug: string;
  name: string;
  shortDescription: string;
  teaType: string;
  country: string;
  region: string;
  manufacturer: string;
  fermentationLevel: string;
  productForm: string;
  aboutTea: string;
  taste: string;
  aroma: string;
  effect: string;
  beneficialProperties: string;
  waterTemperatureC: number;
  teaAmountG: number;
  brewingTimeSeconds: number;
  infusionCount: number;
  brewingTips: string;
  primaryCategory: string;
  extraCategories?: string[];
  variants: VariantInput[];
  imageTone: string;
  createdDaysAgo: number;
};


type ArticleInput = {
  slug: string;
  title: string;
  excerpt: string;
  content: string;
  readingTimeMinutes: number;
  isFeatured: boolean;
  sortOrder: number;
  publishedDaysAgo: number;
};

type ProductGroup = {
  categorySlug: string;
  parentCategorySlug?: string;
  code: string;
  names: Array<{ name: string; slug: string }>;
  teaType: string;
  country: string;
  region: string;
  manufacturer: string;
  fermentationLevel: string;
  productForm: string;
  taste: string;
  aroma: string;
  effect: string;
  waterTemperatureC: number;
  teaAmountG: number;
  brewingTimeSeconds: number;
  infusionCount: number;
  brewingTips: string;
  weights: [number, number];
  basePrice: number;
  imageTone: string;
};


const articles: ArticleInput[] = [
  {
    slug: "kak-vybrat-ulun",
    title: "Как выбрать улун: от лёгких цветочных до насыщенных скальных",
    excerpt: "Разбираемся, чем отличаются светлые, тёмные, тайваньские и уишаньские улуны и с какого чая лучше начать знакомство.",
    readingTimeMinutes: 7,
    isFeatured: true,
    sortOrder: 10,
    publishedDaysAgo: 2,
    content: `Улун — это не один конкретный вкус, а большая группа чаёв с очень разным характером.

## Светлые улуны

Светлые улуны обычно дают прозрачный золотистый настой, свежий цветочный аромат и мягкое послевкусие. К этой группе относят многие тайваньские чаи и Те Гуань Инь современной обработки. Они подходят тем, кто ценит лёгкость, сливочные и цветочные оттенки.

## Скальные улуны

Уишаньские улуны проходят более заметный прогрев. Во вкусе могут появляться печёные, минеральные, древесные и пряные ноты. Такие чаи воспринимаются плотнее и особенно хорошо подходят для неспешного заваривания проливами.

## С чего начать

Для первого знакомства удобно взять два контрастных образца: один светлый улун и один тёмный. Заваривайте их одинаковой водой и посудой. Так легче заметить разницу в аромате, плотности настоя и длительности послевкусия.`
  },
  {
    slug: "shu-i-shen-puer-raznica",
    title: "Шу и шен пуэр: в чём разница",
    excerpt: "Краткое и понятное сравнение двух направлений пуэра: технология, вкус, выдержка и особенности заваривания.",
    readingTimeMinutes: 6,
    isFeatured: true,
    sortOrder: 20,
    publishedDaysAgo: 5,
    content: `Шу и шен пуэр производят из сходного сырья, но дальнейшая обработка формирует совершенно разный характер напитка.

## Шен пуэр

Шен пуэр проходит естественное созревание. Молодые образцы могут быть свежими, травянистыми и фруктовыми, а с возрастом вкус становится мягче и глубже. Хороший шен способен заметно меняться в течение нескольких лет хранения.

## Шу пуэр

Шу пуэр проходит ускоренную постферментацию. Настой обычно получается тёмным, плотным и мягким. Во вкусе часто встречаются древесные, ореховые, шоколадные и хлебные оттенки.

## Как выбрать

Если нужен спокойный тёмный настой без выраженной терпкости, чаще выбирают шу. Если интересно наблюдать за развитием вкуса от пролива к проливу и со временем — стоит попробовать шен.`
  },
  {
    slug: "temperatura-vody-dlya-chaya",
    title: "Температура воды для разных видов чая",
    excerpt: "Почему зелёный чай не стоит заливать крутым кипятком и когда высокая температура, наоборот, помогает раскрыть вкус.",
    readingTimeMinutes: 5,
    isFeatured: true,
    sortOrder: 30,
    publishedDaysAgo: 8,
    content: `Температура воды влияет на скорость экстракции. Чем горячее вода, тем быстрее в настой переходят вкус, аромат и терпкие компоненты.

## Зелёный и белый чай

Для нежных зелёных чаёв обычно используют воду около 75–85 °C. Белые чаи можно заваривать в более широком диапазоне: молодые — мягче, выдержанные — горячее.

## Улуны

Светлым улунам часто подходит 85–95 °C. Скальные и сильно прогретые улуны хорошо раскрываются почти кипящей водой.

## Пуэр и красный чай

Шу пуэр, выдержанный шен и большинство красных чаёв можно заваривать водой 95–100 °C. Важно не только число на термометре, но и длительность контакта листа с водой.`
  },
  {
    slug: "zavarivanie-prolivami",
    title: "Заваривание проливами без сложных правил",
    excerpt: "Простой способ начать заваривать чай в гайвани или небольшом чайнике и не запутаться в секундах и пропорциях.",
    readingTimeMinutes: 6,
    isFeatured: false,
    sortOrder: 40,
    publishedDaysAgo: 12,
    content: `Проливное заваривание строится на коротком контакте большого количества чайного листа с небольшим объёмом воды.

## Базовая пропорция

Для начала можно взять 5–7 граммов чая на 100–120 мл воды. Первый пролив делают коротким, затем постепенно увеличивают время.

## Ориентируйтесь на вкус

Секундомер не обязателен. Если настой получился слишком слабым, следующий пролив делают дольше. Если появилась лишняя горечь — сокращают время или немного снижают температуру.

## Одна переменная за раз

Чтобы понять чай, меняйте только один параметр: время, температуру или количество листа. Так быстрее находится подходящий режим.`
  },
  {
    slug: "kak-hranit-listovoy-chay",
    title: "Как хранить листовой чай дома",
    excerpt: "Пять условий, которые помогают сохранить аромат: герметичность, сухость, темнота, стабильная температура и отсутствие запахов.",
    readingTimeMinutes: 5,
    isFeatured: false,
    sortOrder: 50,
    publishedDaysAgo: 18,
    content: `Чайный лист легко впитывает влагу и посторонние запахи, поэтому условия хранения напрямую влияют на вкус.

## Герметичная упаковка

После каждого использования плотно закрывайте пакет или банку. Чем меньше воздуха регулярно попадает внутрь, тем стабильнее сохраняется аромат.

## Без света и тепла

Не ставьте чай рядом с плитой, батареей или на солнечную полку. Подойдёт сухой шкаф со стабильной комнатной температурой.

## Отдельно от специй

Кофе, специи, ароматизированные продукты и бытовая химия могут передать чаю свой запах. Лучше хранить чай отдельно или в хорошо герметизированной таре.`
  },
  {
    slug: "chto-znachit-aromat-chaya",
    title: "Как описывать аромат и вкус чая без сложной терминологии",
    excerpt: "Практический способ замечать оттенки настоя и составлять собственное описание без попытки угадать «правильный» ответ.",
    readingTimeMinutes: 7,
    isFeatured: false,
    sortOrder: 60,
    publishedDaysAgo: 25,
    content: `Вкусовое описание — это способ зафиксировать личное впечатление, а не экзамен на знание терминов.

## Начните с общего ощущения

Сначала определите направление: свежий или тёплый аромат, лёгкий или плотный настой, сладкое или сухое послевкусие.

## Используйте знакомые ассоциации

Это могут быть цветы, сухофрукты, хлебная корка, древесина, мёд, ягоды или специи. Ассоциации у разных людей отличаются, и это нормально.

## Сравнивайте чаи рядом

Два чая, заваренные одновременно, описывать проще. Контраст помогает заметить то, что теряется при дегустации одного образца.`
  }
];

const categories: CategoryInput[] = [
  { name: "Улуны", slug: "oolong", description: "Улуны Китая и Тайваня разных регионов и степеней обработки.", sortOrder: 10 },
  { name: "Тайваньские улуны", slug: "taiwan-oolong", description: "Высокогорные, молочные и GABA-улуны Тайваня.", sortOrder: 11, parentSlug: "oolong" },
  { name: "Уишаньские улуны", slug: "wuyi-oolong", description: "Скальные улуны региона Уишань.", sortOrder: 12, parentSlug: "oolong" },
  { name: "Улуны Аньси", slug: "anxi-oolong", description: "Светлые и традиционные улуны уезда Аньси.", sortOrder: 13, parentSlug: "oolong" },
  { name: "Гуандунские улуны", slug: "guangdong-oolong", description: "Одиночные кусты Фэнхуан Дань Цун.", sortOrder: 14, parentSlug: "oolong" },

  { name: "Пуэр", slug: "puer", description: "Шу, шен пуэры и чайные концентраты из Юньнани.", sortOrder: 20 },
  { name: "Шу Пуэр", slug: "shu-puer", description: "Постферментированные тёмные пуэры.", sortOrder: 21, parentSlug: "puer" },
  { name: "Шен Пуэр", slug: "sheng-puer", description: "Светлые пуэры естественной выдержки.", sortOrder: 22, parentSlug: "puer" },
  { name: "Чайная смола", slug: "cha-gao", description: "Растворимые концентраты пуэра и других чаёв.", sortOrder: 23, parentSlug: "puer" },

  { name: "Зелёный чай", slug: "green-tea", description: "Зелёные чаи Китая и Японии.", sortOrder: 30 },
  { name: "Китайский зелёный чай", slug: "chinese-green", description: "Классические китайские зелёные чаи.", sortOrder: 31, parentSlug: "green-tea" },
  { name: "Японский зелёный чай", slug: "japanese-green", description: "Сенча, гёкуро, ходзича и другие японские чаи.", sortOrder: 32, parentSlug: "green-tea" },

  { name: "Красный чай", slug: "red-tea", description: "Полностью ферментированные китайские красные чаи.", sortOrder: 40 },
  { name: "Юньнаньский красный чай", slug: "yunnan-red", description: "Дянь Хуны из провинции Юньнань.", sortOrder: 41, parentSlug: "red-tea" },
  { name: "Фуцзяньский красный чай", slug: "fujian-red", description: "Красные чаи Фуцзяни и Уишаня.", sortOrder: 42, parentSlug: "red-tea" },

  { name: "Белый чай", slug: "white-tea", description: "Белые чаи с деликатной естественной обработкой.", sortOrder: 50 },
  { name: "Белый чай Фудин", slug: "fuding-white", description: "Белые чаи из Фудина.", sortOrder: 51, parentSlug: "white-tea" },
  { name: "Юньнаньский белый чай", slug: "yunnan-white", description: "Белые чаи из юньнаньского сырья.", sortOrder: 52, parentSlug: "white-tea" },

  { name: "Жёлтый чай", slug: "yellow-tea", description: "Редкие жёлтые чаи Китая.", sortOrder: 60 },
  { name: "Китайский жёлтый чай", slug: "chinese-yellow", description: "Жёлтые чаи с технологией томления листа.", sortOrder: 61, parentSlug: "yellow-tea" },

  { name: "Ароматизированный чай", slug: "scented-tea", description: "Чаи с натуральной цветочной и фруктовой ароматизацией.", sortOrder: 70 },
  { name: "Жасминовый чай", slug: "jasmine-tea", description: "Чаи, ароматизированные натуральными цветками жасмина.", sortOrder: 71, parentSlug: "scented-tea" },
  { name: "Фруктовый чай", slug: "fruit-tea", description: "Чайные композиции с фруктами и ягодами.", sortOrder: 72, parentSlug: "scented-tea" },

  { name: "Матча", slug: "matcha", description: "Японский порошковый зелёный чай.", sortOrder: 80 },
  { name: "Церемониальная матча", slug: "ceremonial-matcha", description: "Матча для традиционного приготовления и чистого употребления.", sortOrder: 81, parentSlug: "matcha" },
  { name: "Кулинарная матча", slug: "culinary-matcha", description: "Матча для напитков, десертов и кулинарии.", sortOrder: 82, parentSlug: "matcha" },

  { name: "Травяные напитки", slug: "herbal", description: "Травяные и цветочные напитки без чайного листа.", sortOrder: 90 },
  { name: "Травяные сборы", slug: "herbal-blends", description: "Сборы трав, цветов и ягод.", sortOrder: 91, parentSlug: "herbal" },

  { name: "Чайные наборы", slug: "tea-sets", description: "Подарочные и дегустационные наборы.", sortOrder: 100 },
  { name: "Подарочные наборы", slug: "gift-sets", description: "Готовые наборы чая для подарка.", sortOrder: 101, parentSlug: "tea-sets" }
];

const productGroups: ProductGroup[] = [
  {
    categorySlug: "taiwan-oolong", parentCategorySlug: "oolong", code: "TWO",
    names: [
      { name: "Габа Алишань", slug: "gaba-alishan" }, { name: "Габа Лишань", slug: "gaba-lishan" },
      { name: "Дун Дин", slug: "dong-ding" }, { name: "Цзинь Сюань", slug: "jin-xuan" },
      { name: "Шань Лин Си", slug: "shan-lin-xi" }
    ],
    teaType: "Тайваньский улун", country: "Тайвань", region: "Высокогорные районы Тайваня",
    manufacturer: "Демонстрационная тайваньская ферма", fermentationLevel: "Средняя", productForm: "Скрученный лист",
    taste: "Мёд, цветы, сливочность, спелые фрукты", aroma: "Цветочно-фруктовый", effect: "Мягко тонизирующий",
    waterTemperatureC: 92, teaAmountG: 7, brewingTimeSeconds: 20, infusionCount: 7,
    brewingTips: "Прогреть посуду и постепенно увеличивать время проливов.", weights: [25, 50], basePrice: 360, imageTone: "3F664B"
  },
  {
    categorySlug: "wuyi-oolong", parentCategorySlug: "oolong", code: "WU",
    names: [
      { name: "Да Хун Пао", slug: "da-hong-pao" }, { name: "Жоу Гуй", slug: "rou-gui" },
      { name: "Шуй Сянь", slug: "shui-xian" }, { name: "Те Ло Хань", slug: "tie-luo-han" },
      { name: "Бай Цзи Гуань", slug: "bai-ji-guan" }
    ],
    teaType: "Уишаньский улун", country: "Китай", region: "Фуцзянь, Уишань",
    manufacturer: "Демонстрационная мастерская Уишань", fermentationLevel: "Средняя", productForm: "Продольно скрученный лист",
    taste: "Печёные орехи, минералы, древесность, какао", aroma: "Тёплый печёный", effect: "Тонизирующий",
    waterTemperatureC: 96, teaAmountG: 7, brewingTimeSeconds: 15, infusionCount: 8,
    brewingTips: "Использовать быстрые первые проливы.", weights: [25, 50], basePrice: 330, imageTone: "62412F"
  },
  {
    categorySlug: "anxi-oolong", parentCategorySlug: "oolong", code: "AX",
    names: [
      { name: "Те Гуань Инь", slug: "tie-guan-yin" }, { name: "Хуан Цзинь Гуй", slug: "huang-jin-gui" },
      { name: "Мао Се", slug: "mao-xie" }, { name: "Бэнь Шань", slug: "ben-shan" },
      { name: "Те Гуань Инь Нун Сян", slug: "tie-guan-yin-nong-xiang" }
    ],
    teaType: "Улун Аньси", country: "Китай", region: "Фуцзянь, Аньси",
    manufacturer: "Демонстрационная мастерская Аньси", fermentationLevel: "Слабая", productForm: "Плотно скрученный лист",
    taste: "Сирень, сливочность, свежая зелень", aroma: "Яркий цветочный", effect: "Освежающий",
    waterTemperatureC: 90, teaAmountG: 6, brewingTimeSeconds: 20, infusionCount: 6,
    brewingTips: "Не использовать слишком горячую воду.", weights: [25, 50], basePrice: 260, imageTone: "71845B"
  },
  {
    categorySlug: "guangdong-oolong", parentCategorySlug: "oolong", code: "GD",
    names: [
      { name: "Ми Лань Сян Дань Цун", slug: "mi-lan-xiang" }, { name: "Я Ши Сян Дань Цун", slug: "ya-shi-xiang" },
      { name: "Син Жэнь Сян", slug: "xing-ren-xiang" }, { name: "Гуй Хуа Сян", slug: "gui-hua-xiang" },
      { name: "Хуан Чжи Сян", slug: "huang-zhi-xiang" }
    ],
    teaType: "Фэнхуан Дань Цун", country: "Китай", region: "Гуандун, Фэнхуаншань",
    manufacturer: "Демонстрационное хозяйство Фэнхуан", fermentationLevel: "Средняя", productForm: "Продольно скрученный лист",
    taste: "Мёд, тропические фрукты, цветы, пряность", aroma: "Яркий фруктово-цветочный", effect: "Бодрящий",
    waterTemperatureC: 94, teaAmountG: 7, brewingTimeSeconds: 15, infusionCount: 8,
    brewingTips: "Не передерживать первые проливы.", weights: [25, 50], basePrice: 390, imageTone: "7A5639"
  },
  {
    categorySlug: "shu-puer", parentCategorySlug: "puer", code: "SHU",
    names: [
      { name: "Шу Пуэр Гун Тин", slug: "shu-puer-gong-ting" }, { name: "Шу Пуэр Мэнхай", slug: "shu-puer-menghai" },
      { name: "Шу Пуэр Лао Ча Тоу", slug: "lao-cha-tou" }, { name: "Шу Пуэр Золотые почки", slug: "shu-puer-golden-buds" },
      { name: "Шу Пуэр с рисом Номи", slug: "shu-puer-nomi" }
    ],
    teaType: "Шу Пуэр", country: "Китай", region: "Юньнань",
    manufacturer: "Демонстрационная пуэрная фабрика", fermentationLevel: "Постферментированный", productForm: "Рассыпной или прессованный чай",
    taste: "Древесность, орех, какао, сухофрукты", aroma: "Глубокий древесный", effect: "Выраженно тонизирующий",
    waterTemperatureC: 98, teaAmountG: 8, brewingTimeSeconds: 15, infusionCount: 9,
    brewingTips: "Сделать один или два быстрых промывочных пролива.", weights: [50, 100], basePrice: 410, imageTone: "4A3026"
  },
  {
    categorySlug: "sheng-puer", parentCategorySlug: "puer", code: "SHENG",
    names: [
      { name: "Шен Пуэр Иу", slug: "sheng-puer-yiwu" }, { name: "Шен Пуэр Буланшань", slug: "sheng-puer-bulang" },
      { name: "Шен Пуэр Биндао", slug: "sheng-puer-bingdao" }, { name: "Шен Пуэр Наньноушань", slug: "sheng-puer-nannuo" },
      { name: "Шен Пуэр Цзинмай", slug: "sheng-puer-jingmai" }
    ],
    teaType: "Шен Пуэр", country: "Китай", region: "Юньнань",
    manufacturer: "Демонстрационное хозяйство Юньнань", fermentationLevel: "Естественная выдержка", productForm: "Прессованный чай",
    taste: "Цветы, сухофрукты, мёд, лёгкая терпкость", aroma: "Свежий цветочный", effect: "Бодрящий",
    waterTemperatureC: 95, teaAmountG: 7, brewingTimeSeconds: 12, infusionCount: 10,
    brewingTips: "Разбирать пресс аккуратно, сохраняя целостность листа.", weights: [50, 100], basePrice: 520, imageTone: "8A7A54"
  },
  {
    categorySlug: "cha-gao", parentCategorySlug: "puer", code: "CG",
    names: [
      { name: "Смола Шу Пуэра", slug: "cha-gao-shu" }, { name: "Смола Шен Пуэра", slug: "cha-gao-sheng" },
      { name: "Смола Габа", slug: "cha-gao-gaba" }, { name: "Смола Пуэра с рисом Номи", slug: "cha-gao-nomi" },
      { name: "Смола Пуэра Сердце Тигра", slug: "cha-gao-tiger-heart" }
    ],
    teaType: "Чайная смола", country: "Китай", region: "Юньнань",
    manufacturer: "Демонстрационная фабрика чайной смолы", fermentationLevel: "Концентрированный экстракт", productForm: "Растворимые гранулы",
    taste: "Древесность, какао, мягкая сладость", aroma: "Глубокий чайный", effect: "Бодрящий",
    waterTemperatureC: 95, teaAmountG: 0.5, brewingTimeSeconds: 120, infusionCount: 1,
    brewingTips: "Растворить одну гранулу в 200–300 мл воды.", weights: [10, 20], basePrice: 490, imageTone: "382821"
  },
  {
    categorySlug: "chinese-green", parentCategorySlug: "green-tea", code: "CGR",
    names: [
      { name: "Лунцзин", slug: "longjing" }, { name: "Би Ло Чунь", slug: "bi-luo-chun" },
      { name: "Хуаншань Маофэн", slug: "huangshan-maofeng" }, { name: "Лю Ань Гуапянь", slug: "liu-an-guapian" },
      { name: "Тай Пин Хоу Куй", slug: "tai-ping-hou-kui" }
    ],
    teaType: "Китайский зелёный чай", country: "Китай", region: "Чжэцзян, Цзянсу, Аньхой",
    manufacturer: "Демонстрационная ферма зелёного чая", fermentationLevel: "Неферментированный", productForm: "Цельный лист",
    taste: "Орех, свежая зелень, каштан, лёгкая сладость", aroma: "Свежий травяной", effect: "Освежающий",
    waterTemperatureC: 80, teaAmountG: 5, brewingTimeSeconds: 40, infusionCount: 4,
    brewingTips: "Использовать воду ниже температуры кипения.", weights: [25, 50], basePrice: 310, imageTone: "718545"
  },
  {
    categorySlug: "japanese-green", parentCategorySlug: "green-tea", code: "JGR",
    names: [
      { name: "Сенча", slug: "sencha" }, { name: "Гёкуро", slug: "gyokuro" },
      { name: "Генмайча", slug: "genmaicha" }, { name: "Ходзича", slug: "hojicha" },
      { name: "Кукича", slug: "kukicha" }
    ],
    teaType: "Японский зелёный чай", country: "Япония", region: "Сидзуока, Удзи, Кагосима",
    manufacturer: "Демонстрационное японское хозяйство", fermentationLevel: "Неферментированный", productForm: "Пропаренный лист",
    taste: "Умами, морская свежесть, зелень, орех", aroma: "Свежий растительный", effect: "Тонизирующий",
    waterTemperatureC: 75, teaAmountG: 5, brewingTimeSeconds: 60, infusionCount: 3,
    brewingTips: "Точно соблюдать невысокую температуру воды.", weights: [50, 100], basePrice: 420, imageTone: "4F753D"
  },
  {
    categorySlug: "yunnan-red", parentCategorySlug: "red-tea", code: "YR",
    names: [
      { name: "Дянь Хун", slug: "dian-hong" }, { name: "Дянь Хун Золотые почки", slug: "dian-hong-golden-buds" },
      { name: "Дянь Хун Сосновая игла", slug: "dian-hong-pine-needle" }, { name: "Дянь Хун Улитка", slug: "dian-hong-snail" },
      { name: "Дянь Хун Древние деревья", slug: "dian-hong-old-trees" }
    ],
    teaType: "Юньнаньский красный чай", country: "Китай", region: "Юньнань",
    manufacturer: "Демонстрационная фабрика Юньнань", fermentationLevel: "Полная", productForm: "Скрученный лист",
    taste: "Мёд, сухофрукты, какао, хлебная корочка", aroma: "Медовый сладкий", effect: "Согревающий",
    waterTemperatureC: 92, teaAmountG: 6, brewingTimeSeconds: 30, infusionCount: 5,
    brewingTips: "Подходит для проливов и настаивания.", weights: [50, 100], basePrice: 380, imageTone: "7B4430"
  },
  {
    categorySlug: "fujian-red", parentCategorySlug: "red-tea", code: "FR",
    names: [
      { name: "Цзинь Цзюнь Мэй", slug: "jin-jun-mei" }, { name: "Чжэн Шань Сяо Чжун", slug: "zheng-shan-xiao-zhong" },
      { name: "Тань Ян Гун Фу", slug: "tan-yang-gong-fu" }, { name: "Ци Мэнь Хун Ча", slug: "qi-men-hong-cha" },
      { name: "Бай Линь Гун Фу", slug: "bai-lin-gong-fu" }
    ],
    teaType: "Фуцзяньский красный чай", country: "Китай", region: "Фуцзянь",
    manufacturer: "Демонстрационная мастерская Фуцзянь", fermentationLevel: "Полная", productForm: "Тонкий скрученный лист",
    taste: "Мёд, карамель, цветы, печёные фрукты", aroma: "Цветочно-медовый", effect: "Тонизирующий",
    waterTemperatureC: 90, teaAmountG: 5, brewingTimeSeconds: 25, infusionCount: 6,
    brewingTips: "Не передерживать первые проливы.", weights: [25, 50], basePrice: 460, imageTone: "7A5030"
  },
  {
    categorySlug: "fuding-white", parentCategorySlug: "white-tea", code: "FW",
    names: [
      { name: "Бай Хао Инь Чжэнь", slug: "bai-hao-yin-zhen" }, { name: "Бай Му Дань", slug: "bai-mu-dan" },
      { name: "Шоу Мэй", slug: "shou-mei" }, { name: "Гун Мэй", slug: "gong-mei" },
      { name: "Лао Бай Ча", slug: "lao-bai-cha" }
    ],
    teaType: "Белый чай Фудин", country: "Китай", region: "Фуцзянь, Фудин",
    manufacturer: "Демонстрационная ферма Фудин", fermentationLevel: "Слабая естественная", productForm: "Лист и почки",
    taste: "Цветы, дыня, сухая трава, мёд", aroma: "Лёгкий цветочный", effect: "Мягкий",
    waterTemperatureC: 86, teaAmountG: 6, brewingTimeSeconds: 35, infusionCount: 5,
    brewingTips: "Дать листу полностью раскрыться.", weights: [25, 50], basePrice: 350, imageTone: "B0A984"
  },
  {
    categorySlug: "yunnan-white", parentCategorySlug: "white-tea", code: "YW",
    names: [
      { name: "Юэ Гуан Бай", slug: "yue-guang-bai" }, { name: "Белый чай Цзингу", slug: "white-tea-jinggu" },
      { name: "Белый чай из древних деревьев", slug: "white-old-trees" }, { name: "Юньнаньский белый блин", slug: "yunnan-white-cake" },
      { name: "Белые почки Я Бао", slug: "ya-bao" }
    ],
    teaType: "Юньнаньский белый чай", country: "Китай", region: "Юньнань",
    manufacturer: "Демонстрационное хозяйство Юньнань", fermentationLevel: "Слабая естественная", productForm: "Крупный лист",
    taste: "Мёд, сухофрукты, цветы, древесность", aroma: "Тёплый медовый", effect: "Мягко тонизирующий",
    waterTemperatureC: 90, teaAmountG: 6, brewingTimeSeconds: 30, infusionCount: 6,
    brewingTips: "Подходит для проливов и настаивания.", weights: [50, 100], basePrice: 470, imageTone: "988A70"
  },
  {
    categorySlug: "chinese-yellow", parentCategorySlug: "yellow-tea", code: "YL",
    names: [
      { name: "Цзюньшань Иньчжэнь", slug: "junshan-yinzhen" }, { name: "Мэн Дин Хуан Я", slug: "meng-ding-huang-ya" },
      { name: "Хо Шань Хуан Я", slug: "huo-shan-huang-ya" }, { name: "Вэй Шань Мао Цзянь", slug: "wei-shan-mao-jian" },
      { name: "Бэй Ган Мао Цзянь", slug: "bei-gang-mao-jian" }
    ],
    teaType: "Жёлтый чай", country: "Китай", region: "Хунань, Сычуань, Аньхой",
    manufacturer: "Демонстрационное хозяйство жёлтого чая", fermentationLevel: "Лёгкое томление", productForm: "Почки и лист",
    taste: "Сладкая кукуруза, цветы, мягкая зелень", aroma: "Тонкий сладковатый", effect: "Мягко освежающий",
    waterTemperatureC: 82, teaAmountG: 5, brewingTimeSeconds: 45, infusionCount: 4,
    brewingTips: "Использовать мягкую воду и не перегревать лист.", weights: [25, 50], basePrice: 680, imageTone: "B39A43"
  },
  {
    categorySlug: "jasmine-tea", parentCategorySlug: "scented-tea", code: "JAS",
    names: [
      { name: "Моли Хуа Ча", slug: "moli-hua-cha" }, { name: "Жасминовая жемчужина", slug: "jasmine-pearls" },
      { name: "Жасминовый Маофэн", slug: "jasmine-maofeng" }, { name: "Жасминовый Бай Хао", slug: "jasmine-bai-hao" },
      { name: "Жасминовый Улун", slug: "jasmine-oolong" }
    ],
    teaType: "Жасминовый чай", country: "Китай", region: "Фуцзянь, Гуанси",
    manufacturer: "Демонстрационная жасминовая мастерская", fermentationLevel: "Зависит от основы", productForm: "Листовой чай",
    taste: "Жасмин, свежая зелень, мягкая сладость", aroma: "Натуральный жасмин", effect: "Освежающий",
    waterTemperatureC: 82, teaAmountG: 5, brewingTimeSeconds: 40, infusionCount: 4,
    brewingTips: "Не использовать кипяток для сохранения аромата.", weights: [50, 100], basePrice: 340, imageTone: "78966B"
  },
  {
    categorySlug: "fruit-tea", parentCategorySlug: "scented-tea", code: "FRT",
    names: [
      { name: "Улун Манго", slug: "oolong-mango" }, { name: "Улун Персик", slug: "oolong-peach" },
      { name: "Красный чай Вишня", slug: "red-tea-cherry" }, { name: "Зелёный чай Апельсин", slug: "green-tea-orange" },
      { name: "Фруктовый чай Ананас и Клубника", slug: "fruit-tea-pineapple-strawberry" }
    ],
    teaType: "Фруктовый чай", country: "Китай", region: "Смешанное сырьё",
    manufacturer: "Демонстрационная чайная мастерская", fermentationLevel: "Зависит от чайной основы", productForm: "Чайная смесь",
    taste: "Фрукты, ягоды, лёгкая сладость", aroma: "Яркий фруктовый", effect: "Освежающий",
    waterTemperatureC: 88, teaAmountG: 6, brewingTimeSeconds: 60, infusionCount: 3,
    brewingTips: "Заваривать по вкусу, не передерживая чайную основу.", weights: [50, 100], basePrice: 290, imageTone: "A16A45"
  },
  {
    categorySlug: "ceremonial-matcha", parentCategorySlug: "matcha", code: "MTC",
    names: [
      { name: "Матча церемониальная Удзи", slug: "matcha-ceremonial-uji" }, { name: "Матча церемониальная Ямэ", slug: "matcha-ceremonial-yame" },
      { name: "Матча церемониальная Нисио", slug: "matcha-ceremonial-nishio" }, { name: "Матча премиальная Самидори", slug: "matcha-samidori" },
      { name: "Матча премиальная Окумидори", slug: "matcha-okumidori" }
    ],
    teaType: "Церемониальная матча", country: "Япония", region: "Удзи, Ямэ, Нисио",
    manufacturer: "Демонстрационное японское хозяйство", fermentationLevel: "Неферментированный", productForm: "Порошок",
    taste: "Умами, сливочность, свежая зелень", aroma: "Свежий травяной", effect: "Выраженно бодрящий",
    waterTemperatureC: 75, teaAmountG: 2, brewingTimeSeconds: 30, infusionCount: 1,
    brewingTips: "Просеять и взбивать венчиком до пены.", weights: [30, 50], basePrice: 890, imageTone: "4E7A37"
  },
  {
    categorySlug: "culinary-matcha", parentCategorySlug: "matcha", code: "MTK",
    names: [
      { name: "Матча кулинарная классическая", slug: "matcha-culinary-classic" }, { name: "Матча для латте", slug: "matcha-latte" },
      { name: "Матча для десертов", slug: "matcha-dessert" }, { name: "Матча органическая кулинарная", slug: "matcha-culinary-organic" },
      { name: "Матча повседневная", slug: "matcha-daily" }
    ],
    teaType: "Кулинарная матча", country: "Япония", region: "Кагосима, Сидзуока",
    manufacturer: "Демонстрационное японское производство", fermentationLevel: "Неферментированный", productForm: "Порошок",
    taste: "Зелень, лёгкая терпкость, умами", aroma: "Травяной", effect: "Бодрящий",
    waterTemperatureC: 78, teaAmountG: 2, brewingTimeSeconds: 30, infusionCount: 1,
    brewingTips: "Подходит для латте, выпечки и десертов.", weights: [50, 100], basePrice: 590, imageTone: "5B813B"
  },
  {
    categorySlug: "herbal-blends", parentCategorySlug: "herbal", code: "HRB",
    names: [
      { name: "Иван-чай классический", slug: "ivan-tea-classic" }, { name: "Ромашка и мята", slug: "chamomile-mint" },
      { name: "Липовый цвет", slug: "linden-blossom" }, { name: "Каркаде с ягодами", slug: "hibiscus-berries" },
      { name: "Гречишный чай Ку Цяо", slug: "buckwheat-tea" }
    ],
    teaType: "Травяной напиток", country: "Разные страны", region: "Смешанное происхождение",
    manufacturer: "Демонстрационное производство травяных сборов", fermentationLevel: "Не применяется", productForm: "Травяной сбор",
    taste: "Травы, цветы, ягоды, мягкая сладость", aroma: "Травяной и цветочный", effect: "Спокойный повседневный напиток",
    waterTemperatureC: 95, teaAmountG: 6, brewingTimeSeconds: 300, infusionCount: 2,
    brewingTips: "Настаивать под крышкой 5–7 минут.", weights: [50, 100], basePrice: 250, imageTone: "806E45"
  },
  {
    categorySlug: "gift-sets", parentCategorySlug: "tea-sets", code: "SET",
    names: [
      { name: "Набор Китайская классика", slug: "set-chinese-classics" }, { name: "Набор Знакомство с улунами", slug: "set-oolong-intro" },
      { name: "Набор Пуэрная коллекция", slug: "set-puer-collection" }, { name: "Набор Чайный подарок", slug: "set-tea-gift" },
      { name: "Набор Дегустация 10 чаёв", slug: "set-ten-teas" }
    ],
    teaType: "Чайный набор", country: "Смешанное происхождение", region: "Разные регионы",
    manufacturer: "Tea Market Demo", fermentationLevel: "Разная", productForm: "Набор фасованных чаёв",
    taste: "Разные вкусовые профили", aroma: "Зависит от состава", effect: "Для знакомства с ассортиментом",
    waterTemperatureC: 90, teaAmountG: 6, brewingTimeSeconds: 30, infusionCount: 5,
    brewingTips: "Следовать инструкции каждого чая в наборе.", weights: [100, 200], basePrice: 1190, imageTone: "6D5038"
  }
];

function createProducts(): ProductInput[] {
  let globalIndex = 0;

  return productGroups.flatMap((group) =>
    group.names.map((item, groupIndex) => {
      globalIndex += 1;
      const firstPrice = group.basePrice + groupIndex * 45;
      const secondPrice = Math.round(firstPrice * 1.82 / 10) * 10;
      const firstStock = globalIndex % 11 === 0 ? 0 : 8 + (globalIndex * 7) % 28;
      const secondStock = globalIndex % 17 === 0 ? 0 : 3 + (globalIndex * 5) % 17;
      const hasOldPrice = globalIndex % 4 === 0;

      return {
        slug: `demo-${item.slug}`,
        name: item.name,
        shortDescription: `${item.name} — реалистичная демонстрационная карточка для проверки каталога, поиска, вариантов и оформления заказа.`,
        teaType: group.teaType,
        country: group.country,
        region: group.region,
        manufacturer: group.manufacturer,
        fermentationLevel: group.fermentationLevel,
        productForm: group.productForm,
        aboutTea: `${item.name} добавлен как демонстрационный товар. Карточка содержит полные характеристики, два варианта веса, изображения, SEO-данные и параметры заваривания.`,
        taste: group.taste,
        aroma: group.aroma,
        effect: group.effect,
        beneficialProperties: "Демонстрационное информационное поле без медицинских обещаний.",
        waterTemperatureC: group.waterTemperatureC,
        teaAmountG: group.teaAmountG,
        brewingTimeSeconds: group.brewingTimeSeconds,
        infusionCount: group.infusionCount,
        brewingTips: group.brewingTips,
        primaryCategory: group.categorySlug,
        extraCategories: group.parentCategorySlug ? [group.parentCategorySlug] : [],
        variants: [
          {
            sku: `DEMO-${group.code}-${String(groupIndex + 1).padStart(2, "0")}-${group.weights[0]}`,
            weightG: group.weights[0],
            price: firstPrice,
            oldPrice: hasOldPrice ? firstPrice + 90 : undefined,
            stock: firstStock,
            available: firstStock > 0
          },
          {
            sku: `DEMO-${group.code}-${String(groupIndex + 1).padStart(2, "0")}-${group.weights[1]}`,
            weightG: group.weights[1],
            price: secondPrice,
            oldPrice: hasOldPrice ? secondPrice + 150 : undefined,
            stock: secondStock,
            available: secondStock > 0
          }
        ],
        imageTone: group.imageTone,
        createdDaysAgo: (globalIndex * 7) % 180
      };
    })
  );
}

const products = createProducts();
const DEMO_PRODUCT_SLUGS = products.map((product) => product.slug);

const collections = [
  {
    name: "Новинки", slug: "new-arrivals", description: "Недавно добавленные демонстрационные товары.", sortOrder: 10, showOnHome: true,
    productSlugs: products.filter((product) => product.createdDaysAgo <= 30).slice(0, 20).map((product) => product.slug)
  },
  {
    name: "Хиты продаж", slug: "bestsellers", description: "Популярные позиции разных категорий.", sortOrder: 20, showOnHome: true,
    productSlugs: products.filter((_, index) => index % 5 === 0).slice(0, 20).map((product) => product.slug)
  },
  {
    name: "Для бодрости", slug: "energy", description: "Чаи с бодрящим и тонизирующим профилем.", sortOrder: 30, showOnHome: true,
    productSlugs: products.filter((product) => /бодр|тониз/i.test(product.effect)).slice(0, 20).map((product) => product.slug)
  },
  {
    name: "Для спокойного вечера", slug: "relax", description: "Мягкие травяные, белые и GABA-профили.", sortOrder: 40, showOnHome: true,
    productSlugs: products.filter((product) => /мягк|спокой/i.test(product.effect) || ["white-tea", "herbal"].some((slug) => product.extraCategories?.includes(slug))).slice(0, 20).map((product) => product.slug)
  },
  {
    name: "Высокогорные чаи", slug: "high-mountain", description: "Чаи Тайваня, Уишаня и горных районов Юньнани.", sortOrder: 50, showOnHome: false,
    productSlugs: products.filter((product) => /Тайван|Уишань|Юньнань|Фэнхуан/i.test(product.region)).slice(0, 25).map((product) => product.slug)
  },
  {
    name: "Знакомство с чайным миром", slug: "starter-teas", description: "По одному товару из каждого подраздела каталога.", sortOrder: 60, showOnHome: false,
    productSlugs: productGroups.map((group) => products.find((product) => product.primaryCategory === group.categorySlug)!.slug)
  }
];


const homeBanners = [
  { collectionSlug: "new-arrivals", eyebrow: "Новые поступления", title: "Откройте чай, который подходит именно вам", subtitle: "Свежие улуны, пуэры и зелёные чаи из новых поступлений", imageUrl: null, sortOrder: 10 },
  { collectionSlug: "bestsellers", eyebrow: "Выбор покупателей", title: "Чаи, к которым возвращаются", subtitle: "Популярные позиции с выразительным и понятным вкусом", imageUrl: null, sortOrder: 20 },
  { collectionSlug: "energy", eyebrow: "Для активного дня", title: "Бодрость в каждой чашке", subtitle: "Тонизирующие чаи для утра, работы и насыщенного дня", imageUrl: null, sortOrder: 30 },
  { collectionSlug: "relax", eyebrow: "Для спокойного вечера", title: "Мягкий чай для отдыха", subtitle: "Нежные и расслабляющие профили без лишней резкости", imageUrl: null, sortOrder: 40 }
];
const DEMO_CUSTOMER_CART_SKUS = [products[0].variants[1].sku, products[5].variants[0].sku] as const;
const DEMO_GUEST_CART_SKU = products[85].variants[0].sku;
const DEMO_ORDER_ONE_SKUS = [products[0].variants[1].sku, products[35].variants[0].sku] as const;
const DEMO_ORDER_TWO_SKU = products[20].variants[1].sku;
const DEMO_FAVORITE_SLUGS = [products[0].slug, products[35].slug, products[70].slug] as const;

function placeholderImage(
  slug: string,
  tone: string,
  order: number
): string {
  const label = encodeURIComponent(
    `${slug.replace(/^demo-/, "")} ${order}`
  );

  return `https://placehold.co/1200x1200/${tone}/F6F0DF?text=${label}`;
}


async function clearDemoTransactionalData(): Promise<void> {
  const orders = await prisma.orders.findMany({
    where: {
      order_number: {
        in: [...DEMO_ORDER_NUMBERS]
      }
    },
    select: { id: true }
  });

  const orderIds = orders.map((order) => order.id);

  if (orderIds.length > 0) {
    await prisma.order_status_history.deleteMany({
      where: { order_id: { in: orderIds } }
    });

    await prisma.order_payments.deleteMany({
      where: { order_id: { in: orderIds } }
    });

    await prisma.order_deliveries.deleteMany({
      where: { order_id: { in: orderIds } }
    });

    await prisma.order_items.deleteMany({
      where: { order_id: { in: orderIds } }
    });

    await prisma.orders.deleteMany({
      where: { id: { in: orderIds } }
    });
  }

  const customers = await prisma.customers.findMany({
    where: {
      phone: {
        in: [...DEMO_CUSTOMER_PHONES]
      }
    },
    select: { id: true }
  });

  const customerIds = customers.map((customer) => customer.id);

  const carts = await prisma.carts.findMany({
    where: {
      OR: [
        { customer_id: { in: customerIds } },
        { guest_token: DEMO_GUEST_TOKEN }
      ]
    },
    select: { id: true }
  });

  const cartIds = carts.map((cart) => cart.id);

  if (cartIds.length > 0) {
    await prisma.cart_items.deleteMany({
      where: { cart_id: { in: cartIds } }
    });

    await prisma.carts.deleteMany({
      where: { id: { in: cartIds } }
    });
  }
}

async function upsertCategories(): Promise<Map<string, string>> {
  const categoryIds = new Map<string, string>();

  for (const category of categories.filter((item) => !item.parentSlug)) {
    const record = await prisma.categories.upsert({
      where: { slug: category.slug },
      update: {
        name: category.name,
        description: category.description,
        sort_order: category.sortOrder,
        is_visible: true,
        seo_title: `${category.name} — Tea Market Demo`,
        seo_description: category.description,
        canonical_url: `/catalog/${category.slug}`,
        is_indexed: false,
        updated_at: new Date()
      },
      create: {
        name: category.name,
        slug: category.slug,
        description: category.description,
        sort_order: category.sortOrder,
        is_visible: true,
        seo_title: `${category.name} — Tea Market Demo`,
        seo_description: category.description,
        canonical_url: `/catalog/${category.slug}`,
        is_indexed: false
      }
    });

    categoryIds.set(category.slug, record.id);
  }

  for (const category of categories.filter((item) => item.parentSlug)) {
    const parentId = categoryIds.get(category.parentSlug!);

    if (!parentId) {
      throw new Error(`Не найдена родительская категория ${category.parentSlug}.`);
    }

    const record = await prisma.categories.upsert({
      where: { slug: category.slug },
      update: {
        parent_category_id: parentId,
        name: category.name,
        description: category.description,
        sort_order: category.sortOrder,
        is_visible: true,
        seo_title: `${category.name} — Tea Market Demo`,
        seo_description: category.description,
        canonical_url: `/catalog/${category.slug}`,
        is_indexed: false,
        updated_at: new Date()
      },
      create: {
        parent_category_id: parentId,
        name: category.name,
        slug: category.slug,
        description: category.description,
        sort_order: category.sortOrder,
        is_visible: true,
        seo_title: `${category.name} — Tea Market Demo`,
        seo_description: category.description,
        canonical_url: `/catalog/${category.slug}`,
        is_indexed: false
      }
    });

    categoryIds.set(category.slug, record.id);
  }

  return categoryIds;
}

async function upsertProducts(
  categoryIds: Map<string, string>
): Promise<Map<string, string>> {
  const productIds = new Map<string, string>();
  const now = Date.now();

  for (const product of products) {
    const createdAt = new Date(
      now - product.createdDaysAgo * 24 * 60 * 60 * 1000
    );

    const record = await prisma.products.upsert({
      where: { slug: product.slug },
      update: {
        name: product.name,
        short_description: product.shortDescription,
        is_active: true,
        tea_type: product.teaType,
        country: product.country,
        region: product.region,
        manufacturer: product.manufacturer,
        fermentation_level: product.fermentationLevel,
        product_form: product.productForm,
        about_tea: product.aboutTea,
        taste: product.taste,
        aroma: product.aroma,
        effect: product.effect,
        beneficial_properties: product.beneficialProperties,
        water_temperature_c: product.waterTemperatureC,
        tea_amount_g: d(product.teaAmountG),
        brewing_time_seconds: product.brewingTimeSeconds,
        infusion_count: product.infusionCount,
        brewing_tips: product.brewingTips,
        seo_title: `${product.name} — демонстрационный товар Tea Market`,
        seo_description: product.shortDescription,
        canonical_url: `/products/${product.slug}`,
        is_indexed: false,
        content_updated_at: new Date(),
        updated_at: new Date()
      },
      create: {
        name: product.name,
        short_description: product.shortDescription,
        is_active: true,
        tea_type: product.teaType,
        country: product.country,
        region: product.region,
        manufacturer: product.manufacturer,
        fermentation_level: product.fermentationLevel,
        product_form: product.productForm,
        about_tea: product.aboutTea,
        taste: product.taste,
        aroma: product.aroma,
        effect: product.effect,
        beneficial_properties: product.beneficialProperties,
        water_temperature_c: product.waterTemperatureC,
        tea_amount_g: d(product.teaAmountG),
        brewing_time_seconds: product.brewingTimeSeconds,
        infusion_count: product.infusionCount,
        brewing_tips: product.brewingTips,
        slug: product.slug,
        seo_title: `${product.name} — демонстрационный товар Tea Market`,
        seo_description: product.shortDescription,
        canonical_url: `/products/${product.slug}`,
        is_indexed: false,
        content_updated_at: createdAt,
        created_at: createdAt,
        updated_at: createdAt
      }
    });

    productIds.set(product.slug, record.id);

    await prisma.product_categories.deleteMany({
      where: { product_id: record.id }
    });

    const assignedCategories = [
      product.primaryCategory,
      ...(product.extraCategories ?? [])
    ];

    for (const [index, categorySlug] of assignedCategories.entries()) {
      const categoryId = categoryIds.get(categorySlug);

      if (!categoryId) {
        throw new Error(`Не найдена категория ${categorySlug} для ${product.slug}.`);
      }

      await prisma.product_categories.create({
        data: {
          product_id: record.id,
          category_id: categoryId,
          is_primary: index === 0,
          sort_order: index
        }
      });
    }

    /*
     * Варианты нельзя удалять перед повторным заполнением:
     * на их UUID могут ссылаться позиции активных и конвертированных корзин.
     * Поэтому сохраняем существующие UUID и обновляем варианты по уникальному SKU.
     */
    for (const [index, variant] of product.variants.entries()) {
      await prisma.product_variants.upsert({
        where: {
          sku: variant.sku
        },
        update: {
          product_id: record.id,
          weight_g: d(variant.weightG),
          price: d(variant.price),
          old_price:
            variant.oldPrice === undefined
              ? null
              : d(variant.oldPrice),
          stock_quantity: variant.stock,
          is_available:
            variant.available
            ?? variant.stock > 0,
          status:
            variant.status
            ?? "active",
          sort_order: index
        },
        create: {
          product_id: record.id,
          sku: variant.sku,
          weight_g: d(variant.weightG),
          price: d(variant.price),
          old_price:
            variant.oldPrice === undefined
              ? null
              : d(variant.oldPrice),
          stock_quantity: variant.stock,
          is_available:
            variant.available
            ?? variant.stock > 0,
          status:
            variant.status
            ?? "active",
          sort_order: index
        }
      });
    }

    await prisma.product_images.deleteMany({
      where: { product_id: record.id }
    });

    await prisma.product_images.createMany({
      data: [1, 2, 3].map((order) => ({
        product_id: record.id,
        image_url: placeholderImage(product.slug, product.imageTone, order),
        alt_text: `${product.name}, демонстрационное изображение ${order}`,
        sort_order: order - 1
      }))
    });
  }

  return productIds;
}

async function upsertCollections(
  productIds: Map<string, string>
): Promise<void> {
  for (const collection of collections) {
    const record = await prisma.collections.upsert({
      where: { slug: collection.slug },
      update: {
        name: collection.name,
        description: collection.description,
        collection_type: "manual",
        automation_rules: Prisma.JsonNull,
        is_active: true,
        show_on_home: collection.showOnHome,
        starts_at: null,
        ends_at: null,
        sort_order: collection.sortOrder,
        seo_title: `${collection.name} — Tea Market Demo`,
        seo_description: collection.description,
        canonical_url: `/collections/${collection.slug}`,
        is_indexed: false,
        updated_at: new Date()
      },
      create: {
        name: collection.name,
        slug: collection.slug,
        description: collection.description,
        collection_type: "manual",
        is_active: true,
        show_on_home: collection.showOnHome,
        sort_order: collection.sortOrder,
        seo_title: `${collection.name} — Tea Market Demo`,
        seo_description: collection.description,
        canonical_url: `/collections/${collection.slug}`,
        is_indexed: false
      }
    });

    await prisma.collection_products.deleteMany({
      where: { collection_id: record.id }
    });

    await prisma.collection_products.createMany({
      data: collection.productSlugs.map((slug, index) => {
        const productId = productIds.get(slug);

        if (!productId) {
          throw new Error(`Не найден товар ${slug} для подборки ${collection.slug}.`);
        }

        return {
          collection_id: record.id,
          product_id: productId,
          sort_order: index
        };
      })
    });
  }
}


async function upsertHomeBanners(): Promise<void> {
  await prisma.$executeRaw(Prisma.sql`DELETE FROM home_banners`);

  for (const banner of homeBanners) {
    await prisma.$executeRaw(Prisma.sql`
      INSERT INTO home_banners (
        collection_id, eyebrow, title, subtitle, image_url, image_alt, is_active, sort_order, starts_at, ends_at
      )
      SELECT
        c.id, ${banner.eyebrow}, ${banner.title}, ${banner.subtitle}, ${banner.imageUrl},
        ${`${banner.title} — Tea Market`}, true, ${banner.sortOrder}, NULL, NULL
      FROM collections c
      WHERE c.slug = ${banner.collectionSlug}
    `);
  }
}

async function upsertRelations(
  productIds: Map<string, string>
): Promise<void> {
  const relationPairs: Array<[string, string, string]> = [];

  for (let groupIndex = 0; groupIndex < productGroups.length; groupIndex += 1) {
    const groupProducts = products.filter(
      (product) => product.primaryCategory === productGroups[groupIndex].categorySlug
    );

    for (let index = 0; index < groupProducts.length; index += 1) {
      relationPairs.push([
        groupProducts[index].slug,
        groupProducts[(index + 1) % groupProducts.length].slug,
        "similar"
      ]);
    }

    const nextGroup = productGroups[(groupIndex + 1) % productGroups.length];
    const nextProduct = products.find(
      (product) => product.primaryCategory === nextGroup.categorySlug
    );

    if (groupProducts[0] && nextProduct) {
      relationPairs.push([groupProducts[0].slug, nextProduct.slug, "related"]);
    }
  }

  await prisma.product_relations.deleteMany({
    where: {
      OR: [
        { product_id: { in: [...productIds.values()] } },
        { related_product_id: { in: [...productIds.values()] } }
      ]
    }
  });

  await prisma.product_relations.createMany({
    data: relationPairs.map(([fromSlug, toSlug, type], index) => {
      const productId = productIds.get(fromSlug);
      const relatedProductId = productIds.get(toSlug);

      if (!productId || !relatedProductId) {
        throw new Error(`Не удалось создать связь ${fromSlug} → ${toSlug}.`);
      }

      return {
        product_id: productId,
        related_product_id: relatedProductId,
        relation_type: type,
        sort_order: index
      };
    })
  });
}

async function upsertReferenceData(): Promise<{
  delivery: Map<string, string>;
  payment: Map<string, string>;
}> {
  const delivery = new Map<string, string>();
  const payment = new Map<string, string>();

  for (const item of [
    { name: "СДЭК — пункт выдачи", cost: 290, term: "2–5 дней", order: 10 },
    { name: "5Post — пункт выдачи", cost: 240, term: "3–7 дней", order: 20 },
    { name: "Ozon — пункт выдачи", cost: 260, term: "2–6 дней", order: 30 },
    { name: "Курьерская доставка", cost: 490, term: "1–3 дня", order: 40 }
  ]) {
    const record = await prisma.delivery_methods.upsert({
      where: { name: item.name },
      update: {
        base_cost: d(item.cost),
        delivery_term: item.term,
        is_active: true,
        sort_order: item.order,
        updated_at: new Date()
      },
      create: {
        name: item.name,
        base_cost: d(item.cost),
        delivery_term: item.term,
        is_active: true,
        sort_order: item.order
      }
    });

    delivery.set(item.name, record.id);
  }

  for (const name of [
    "Банковская карта онлайн",
    "СБП",
    "При получении"
  ]) {
    const record = await prisma.payment_methods.upsert({
      where: { name },
      update: {
        is_active: true,
        updated_at: new Date()
      },
      create: {
        name,
        is_active: true
      }
    });

    payment.set(name, record.id);
  }

  return { delivery, payment };
}

async function upsertCustomers(
  productIds: Map<string, string>
): Promise<Map<string, string>> {
  const customerIds = new Map<string, string>();

  const customerInputs = [
    {
      phone: DEMO_CUSTOMER_PHONES[0],
      name: "Тестовый Покупатель",
      email: "demo.customer1@example.test",
      username: "demo_customer_1",
      birthDate: new Date("1990-03-28"),
      address: {
        addressName: "Дом",
        recipientName: "Тестовый Покупатель",
        city: "Санкт-Петербург",
        street: "Демонстрационная улица",
        house: "10",
        apartment: "25",
        postalCode: "190000"
      }
    },
    {
      phone: DEMO_CUSTOMER_PHONES[1],
      name: "Демо Клиент",
      email: "demo.customer2@example.test",
      username: "demo_customer_2",
      birthDate: null,
      address: {
        addressName: "Работа",
        recipientName: "Демо Клиент",
        city: "Москва",
        street: "Тестовый проспект",
        house: "5",
        apartment: null,
        postalCode: "101000"
      }
    }
  ];

  for (const input of customerInputs) {
    const record = await prisma.customers.upsert({
      where: { phone: input.phone },
      update: {
        name: input.name,
        email: input.email,
        username: input.username,
        birth_date: input.birthDate,
        updated_at: new Date()
      },
      create: {
        phone: input.phone,
        name: input.name,
        email: input.email,
        username: input.username,
        birth_date: input.birthDate
      }
    });

    customerIds.set(input.phone, record.id);

    await prisma.customer_addresses.deleteMany({
      where: { customer_id: record.id }
    });

    await prisma.customer_addresses.create({
      data: {
        customer_id: record.id,
        address_name: input.address.addressName,
        recipient_name: input.address.recipientName,
        phone: input.phone,
        region: input.address.city === "Москва" ? "Москва" : "Ленинградская область",
        city: input.address.city,
        street: input.address.street,
        house: input.address.house,
        apartment: input.address.apartment,
        postal_code: input.address.postalCode,
        comment: "Демонстрационный адрес",
        is_default: true
      }
    });
  }

  const firstCustomerId = customerIds.get(DEMO_CUSTOMER_PHONES[0]);

  if (!firstCustomerId) {
    throw new Error("Не создан первый демонстрационный покупатель.");
  }

  await prisma.favorites.deleteMany({
    where: { customer_id: firstCustomerId }
  });

  await prisma.favorites.createMany({
    data: DEMO_FAVORITE_SLUGS.map((slug) => ({
      customer_id: firstCustomerId,
      product_id: productIds.get(slug)!
    }))
  });

  return customerIds;
}

async function upsertCarts(
  customerIds: Map<string, string>
): Promise<void> {
  const firstCustomerId = customerIds.get(DEMO_CUSTOMER_PHONES[0]);

  if (!firstCustomerId) {
    throw new Error("Не найден демонстрационный покупатель для корзины.");
  }

  const customerCart = await prisma.carts.findFirst({
    where: {
      customer_id: firstCustomerId,
      status: "active"
    }
  });

  const cart = customerCart
    ? await prisma.carts.update({
        where: { id: customerCart.id },
        data: { updated_at: new Date() }
      })
    : await prisma.carts.create({
        data: {
          customer_id: firstCustomerId,
          status: "active"
        }
      });

  await prisma.cart_items.deleteMany({
    where: { cart_id: cart.id }
  });

  const variants = await prisma.product_variants.findMany({
    where: {
      sku: {
        in: [...DEMO_CUSTOMER_CART_SKUS]
      }
    }
  });

  await prisma.cart_items.createMany({
    data: variants.map((variant, index) => ({
      cart_id: cart.id,
      product_variant_id: variant.id,
      quantity: index + 1,
      price_at_addition: variant.price
    }))
  });

  const guestCart = await prisma.carts.upsert({
    where: { guest_token: DEMO_GUEST_TOKEN },
    update: {
      status: "active",
      updated_at: new Date()
    },
    create: {
      guest_token: DEMO_GUEST_TOKEN,
      status: "active"
    }
  });

  await prisma.cart_items.deleteMany({
    where: { cart_id: guestCart.id }
  });

  const guestVariant = await prisma.product_variants.findUnique({
    where: { sku: DEMO_GUEST_CART_SKU }
  });

  if (guestVariant) {
    await prisma.cart_items.create({
      data: {
        cart_id: guestCart.id,
        product_variant_id: guestVariant.id,
        quantity: 1,
        price_at_addition: guestVariant.price
      }
    });
  }
}

async function upsertOrders(
  customerIds: Map<string, string>,
  deliveryIds: Map<string, string>,
  paymentIds: Map<string, string>
): Promise<void> {
  const firstCustomerId = customerIds.get(DEMO_CUSTOMER_PHONES[0]);
  const secondCustomerId = customerIds.get(DEMO_CUSTOMER_PHONES[1]);

  if (!firstCustomerId || !secondCustomerId) {
    throw new Error("Не найдены демонстрационные покупатели для заказов.");
  }

  for (const orderNumber of DEMO_ORDER_NUMBERS) {
    const existing = await prisma.orders.findUnique({
      where: { order_number: orderNumber }
    });

    if (existing) {
      await prisma.order_status_history.deleteMany({ where: { order_id: existing.id } });
      await prisma.order_payments.deleteMany({ where: { order_id: existing.id } });
      await prisma.order_deliveries.deleteMany({ where: { order_id: existing.id } });
      await prisma.order_items.deleteMany({ where: { order_id: existing.id } });
      await prisma.orders.delete({ where: { id: existing.id } });
    }
  }

  const order1Variants = await prisma.product_variants.findMany({
    where: { sku: { in: [...DEMO_ORDER_ONE_SKUS] } },
    include: { products: true }
  });

  const itemsTotal1 = order1Variants.reduce(
    (sum, item) => sum.plus(item.price),
    d(0)
  );
  const deliveryCost1 = d(290);

  const order1 = await prisma.orders.create({
    data: {
      order_number: DEMO_ORDER_NUMBERS[0],
      customer_id: firstCustomerId,
      customer_name: "Тестовый Покупатель",
      phone: DEMO_CUSTOMER_PHONES[0],
      email: "demo.customer1@example.test",
      status: "processing",
      payment_status: "paid",
      items_total: itemsTotal1,
      delivery_cost: deliveryCost1,
      total_amount: itemsTotal1.plus(deliveryCost1),
      comment: "Демонстрационный оплаченный заказ",
      ordered_at: new Date(Date.now() - 4 * 24 * 60 * 60 * 1000)
    }
  });

  await prisma.order_items.createMany({
    data: order1Variants.map((variant) => ({
      order_id: order1.id,
      product_id: variant.product_id,
      product_name: variant.products.name,
      sku: variant.sku,
      weight_g: variant.weight_g,
      unit_price: variant.price,
      quantity: 1,
      line_total: variant.price
    }))
  });

  await prisma.order_status_history.createMany({
    data: [
      { order_id: order1.id, new_status: "new", changed_at: new Date(Date.now() - 4 * 24 * 60 * 60 * 1000) },
      { order_id: order1.id, new_status: "confirmed", changed_at: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000) },
      { order_id: order1.id, new_status: "processing", changed_at: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000) }
    ]
  });

  await prisma.order_deliveries.create({
    data: {
      order_id: order1.id,
      delivery_method_id: deliveryIds.get("СДЭК — пункт выдачи")!,
      cost: deliveryCost1,
      recipient_name: "Тестовый Покупатель",
      phone: DEMO_CUSTOMER_PHONES[0],
      full_address: "Санкт-Петербург, демонстрационный ПВЗ СДЭК №101",
      comment: "Позвонить перед выдачей",
      tracking_number: "DEMO-CDEK-100001",
      delivery_service: "СДЭК",
      status: "handed_over",
      handed_over_at: new Date(Date.now() - 24 * 60 * 60 * 1000)
    }
  });

  await prisma.order_payments.create({
    data: {
      order_id: order1.id,
      payment_method_id: paymentIds.get("СБП")!,
      operation_number: "DEMO-PAY-000001",
      amount: itemsTotal1.plus(deliveryCost1),
      status: "succeeded",
      paid_at: new Date(Date.now() - 4 * 24 * 60 * 60 * 1000)
    }
  });

  const order2Variant = await prisma.product_variants.findUnique({
    where: { sku: DEMO_ORDER_TWO_SKU },
    include: { products: true }
  });

  if (!order2Variant) {
    throw new Error("Не найден вариант для второго демонстрационного заказа.");
  }

  const deliveryCost2 = d(240);
  const order2 = await prisma.orders.create({
    data: {
      order_number: DEMO_ORDER_NUMBERS[1],
      customer_id: secondCustomerId,
      customer_name: "Демо Клиент",
      phone: DEMO_CUSTOMER_PHONES[1],
      email: "demo.customer2@example.test",
      status: "new",
      payment_status: "unpaid",
      items_total: order2Variant.price,
      delivery_cost: deliveryCost2,
      total_amount: order2Variant.price.plus(deliveryCost2),
      comment: "Демонстрационный новый заказ",
      ordered_at: new Date(Date.now() - 2 * 60 * 60 * 1000)
    }
  });

  await prisma.order_items.create({
    data: {
      order_id: order2.id,
      product_id: order2Variant.product_id,
      product_name: order2Variant.products.name,
      sku: order2Variant.sku,
      weight_g: order2Variant.weight_g,
      unit_price: order2Variant.price,
      quantity: 1,
      line_total: order2Variant.price
    }
  });

  await prisma.order_status_history.create({
    data: {
      order_id: order2.id,
      new_status: "new",
      changed_at: new Date(Date.now() - 2 * 60 * 60 * 1000)
    }
  });

  await prisma.order_deliveries.create({
    data: {
      order_id: order2.id,
      delivery_method_id: deliveryIds.get("5Post — пункт выдачи")!,
      cost: deliveryCost2,
      recipient_name: "Демо Клиент",
      phone: DEMO_CUSTOMER_PHONES[1],
      full_address: "Москва, демонстрационный ПВЗ 5Post №202",
      delivery_service: "5Post",
      status: "pending"
    }
  });

  await prisma.order_payments.create({
    data: {
      order_id: order2.id,
      payment_method_id: paymentIds.get("При получении")!,
      amount: order2Variant.price.plus(deliveryCost2),
      status: "pending"
    }
  });
}


async function upsertArticles(): Promise<void> {
  for (const article of articles) {
    const publishedAt = new Date(
      Date.now()
      - article.publishedDaysAgo
      * 24 * 60 * 60 * 1000
    );

    await prisma.$executeRaw(
      Prisma.sql`
        INSERT INTO articles (
          slug,
          title,
          excerpt,
          content,
          cover_url,
          cover_alt,
          reading_time_minutes,
          status,
          is_featured,
          sort_order,
          published_at,
          seo_title,
          seo_description
        )
        VALUES (
          ${article.slug},
          ${article.title},
          ${article.excerpt},
          ${article.content},
          NULL,
          ${article.title},
          ${article.readingTimeMinutes},
          'published',
          ${article.isFeatured},
          ${article.sortOrder},
          ${publishedAt},
          ${article.title},
          ${article.excerpt}
        )
        ON CONFLICT (slug)
        DO UPDATE SET
          title = EXCLUDED.title,
          excerpt = EXCLUDED.excerpt,
          content = EXCLUDED.content,
          cover_url = EXCLUDED.cover_url,
          cover_alt = EXCLUDED.cover_alt,
          reading_time_minutes = EXCLUDED.reading_time_minutes,
          status = EXCLUDED.status,
          is_featured = EXCLUDED.is_featured,
          sort_order = EXCLUDED.sort_order,
          published_at = EXCLUDED.published_at,
          seo_title = EXCLUDED.seo_title,
          seo_description = EXCLUDED.seo_description,
          updated_at = now()
      `
    );
  }
}

async function main(): Promise<void> {
  console.log("Заполнение демонстрационных данных Tea Market...");

  await clearDemoTransactionalData();

  const categoryIds = await upsertCategories();
  const productIds = await upsertProducts(categoryIds);
  await upsertCollections(productIds);
  await upsertArticles();
  await upsertHomeBanners();
  await upsertRelations(productIds);

  const { delivery, payment } = await upsertReferenceData();
  const customerIds = await upsertCustomers(productIds);
  await upsertCarts(customerIds);
  await upsertOrders(customerIds, delivery, payment);

  console.log("Демонстрационные данные успешно созданы:");
  console.log(`- категорий: ${categories.length}`);
  console.log(`- товаров: ${products.length}`);
  console.log(`- вариантов: ${products.reduce((sum, item) => sum + item.variants.length, 0)}`);
  console.log(`- подборок: ${collections.length}`);
  console.log(`- статей: ${articles.length}`);
  console.log(`- Hero-плашек: ${homeBanners.length}`);
  console.log(`- покупателей: ${DEMO_CUSTOMER_PHONES.length}`);
  console.log(`- заказов: ${DEMO_ORDER_NUMBERS.length}`);
  console.log(`- гостевой токен корзины: ${DEMO_GUEST_TOKEN}`);
}

main()
  .catch((error: unknown) => {
    console.error("Ошибка заполнения демонстрационных данных:", error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
