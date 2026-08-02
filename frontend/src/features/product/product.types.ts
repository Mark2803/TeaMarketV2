export type ProductVariantStatus = "available" | "low" | "unavailable";

export type ProductVariant = {
  id: string;
  label: string;
  price: number;
  oldPrice: number | null;
  stock: number;
  status: ProductVariantStatus;
};
