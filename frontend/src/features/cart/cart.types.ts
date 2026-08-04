export type CartProductImage = {
  url: string;
  alt_text: string | null;
};

export type CartProductVariant = {
  id: string;
  sku: string;
  weightG: number;
  price: string;
  oldPrice: string | null;
  stockQuantity: number;
  isAvailable: boolean;
};

export type CartProduct = {
  id: string;
  name: string;
  slug: string;
  shortDescription: string | null;
  image: CartProductImage | null;
  variants: CartProductVariant[];
};

export type CartItem = {
  id: string;
  product: CartProduct;
  variant: CartProductVariant;
  quantity: number;
  priceAtAddition: string;
  lineTotal: string;
};

export type Cart = {
  id: string;
  customerId: string | null;
  guestToken: string | null;
  status: string;
  items: CartItem[];
  totalQuantity: number;
  totalAmount: string;
  createdAt: string;
  updatedAt: string;
};

export type CartResponse = {
  data: Cart;
};

/**
 * Временный тип совместимости Checkout.
 * Промокоды не подключены к БД и всегда отсутствуют.
 */
export type CartPromo = {
  code: string;
  discountPercent: number;
};
