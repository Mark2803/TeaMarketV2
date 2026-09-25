import { apiRequest } from "./client";

export type AdminSession = { authenticated: true; username: string };
export type AdminProductVariantStatus = "active" | "hidden" | "archived";

export type AdminProductVariant = {
  id: string;
  sku: string;
  weight_g: number | string;
  price: number | string;
  old_price: number | string | null;
  stock_quantity: number;
  sort_order: number;
  is_available: boolean;
  status: AdminProductVariantStatus;
};

export type AdminProductImage = {
  id: string;
  url?: string;
  image_url?: string;
  alt?: string | null;
  alt_text?: string | null;
  sort_order?: number;
};

export type AdminProductListItem = {
  id: string;
  name: string;
  slug: string;
  short_description?: string | null;
  is_active: boolean;
  is_new?: boolean;
  updated_at?: string;
  product_images: AdminProductImage[];
  product_variants: AdminProductVariant[];
};

export type AdminProductDetails = AdminProductListItem & {
  tea_type?: string | null;
  country?: string | null;
  region?: string | null;
  manufacturer?: string | null;
  fermentation_level?: string | null;
  product_form?: string | null;
  about_tea?: string | null;
  taste?: string | null;
  aroma?: string | null;
  effect?: string | null;
  beneficial_properties?: string | null;
  water_temperature_c?: number | null;
  tea_amount_g?: number | string | null;
  brewing_time_seconds?: number | null;
  infusion_count?: number | null;
  brewing_tips?: string | null;
  seo_title?: string | null;
  seo_description?: string | null;
  canonical_url?: string | null;
  is_indexed?: boolean;
};

export type AdminProductsResponse = {
  data: AdminProductListItem[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
};

export type AdminProductResponse = { data: AdminProductDetails };

export type AdminStockStatus = "all" | "low" | "out";

export type AdminStockItem = {
  productId: string;
  productName: string;
  productSlug: string;
  productIsActive: boolean;
  variantId: string;
  sku: string;
  weightG: string | number;
  price: string | number;
  oldPrice: string | number | null;
  stockQuantity: number;
  isAvailable: boolean;
  status: AdminProductVariantStatus;
  sortOrder: number;
  updatedAt: string;
};

export type AdminStockResponse = {
  data: AdminStockItem[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
};

export type AdminStockQuery = {
  page?: number;
  limit?: number;
  search?: string;
  stockStatus?: AdminStockStatus;
  lowStockThreshold?: number;
};
export type AdminProductImageResponse = { data: AdminProductImage };

export type AdminProductsQuery = {
  page?: number;
  limit?: number;
  search?: string;
  isActive?: boolean;
  variantStatus?: AdminProductVariantStatus;
};

export type UpdateAdminProductInput = {
  name?: string;
  slug?: string;
  shortDescription?: string | null;
  isActive?: boolean;
  isNew?: boolean;
  teaType?: string | null;
  country?: string | null;
  region?: string | null;
  manufacturer?: string | null;
  fermentationLevel?: string | null;
  productForm?: string | null;
  aboutTea?: string | null;
  taste?: string | null;
  aroma?: string | null;
  effect?: string | null;
  beneficialProperties?: string | null;
  waterTemperatureC?: number | null;
  teaAmountG?: number | null;
  brewingTimeSeconds?: number | null;
  infusionCount?: number | null;
  brewingTips?: string | null;
  seoTitle?: string | null;
  seoDescription?: string | null;
  canonicalUrl?: string | null;
  isIndexed?: boolean;
};

type PaginatedResponse = { pagination: { total: number } };

export function getAdminSession() {
  return apiRequest<AdminSession>("/moderator/session");
}

export function loginAdmin(username: string, password: string) {
  return apiRequest<AdminSession>("/moderator/login", {
    method: "POST",
    body: JSON.stringify({ username, password }),
  });
}

export function logoutAdmin() {
  return apiRequest<{ authenticated: false }>("/moderator/logout", { method: "POST" });
}

export function getAdminProductCount() {
  return apiRequest<PaginatedResponse>("/moderator/products", {
    query: { page: 1, limit: 1 },
  });
}

export function getAdminOrderCount() {
  return apiRequest<PaginatedResponse>("/moderator/orders", {
    query: { page: 1, limit: 1 },
  });
}

export function getAdminProducts(query: AdminProductsQuery = {}) {
  return apiRequest<AdminProductsResponse>("/moderator/products", {
    query: {
      page: query.page ?? 1,
      limit: query.limit ?? 20,
      ...(query.search ? { search: query.search } : {}),
      ...(query.isActive !== undefined
        ? { isActive: query.isActive ? "true" : "false" }
        : {}),
      ...(query.variantStatus ? { variantStatus: query.variantStatus } : {}),
    },
  });
}


export function getAdminStock(query: AdminStockQuery = {}) {
  return apiRequest<AdminStockResponse>("/moderator/stock", {
    query: {
      page: query.page ?? 1,
      limit: query.limit ?? 20,
      stockStatus: query.stockStatus ?? "all",
      ...(query.search ? { search: query.search } : {}),
      ...(query.lowStockThreshold !== undefined
        ? { lowStockThreshold: query.lowStockThreshold }
        : {}),
    },
  });
}

export function updateAdminVariantStock(
  productId: string,
  variantId: string,
  stockQuantity: number,
) {
  return apiRequest(
    `/moderator/products/${productId}/variants/${variantId}`,
    {
      method: "PATCH",
      body: JSON.stringify({ stockQuantity }),
    },
  );
}

export function getAdminProduct(productId: string) {
  return apiRequest<AdminProductResponse>(`/moderator/products/${productId}`);
}

export function updateAdminProduct(productId: string, input: UpdateAdminProductInput) {
  return apiRequest<AdminProductResponse>(`/moderator/products/${productId}`, {
    method: "PATCH",
    body: JSON.stringify(input),
  });
}

export function deleteAdminProduct(productId: string) {
  return apiRequest<{ data: { productId: string; deleted: true } }>(
    `/moderator/products/${productId}`,
    { method: "DELETE" },
  );
}

export function uploadAdminProductImage(
  productId: string,
  file: File,
  altText: string | null,
  sortOrder: number,
) {
  const body = new FormData();
  body.append("image", file);
  if (altText) body.append("altText", altText);
  body.append("sortOrder", String(sortOrder));

  return apiRequest<AdminProductImageResponse>(
    `/moderator/products/${productId}/images/upload`,
    { method: "POST", body },
  );
}

export function replaceAdminProductImage(
  productId: string,
  imageId: string,
  file: File,
  altText?: string | null,
  sortOrder?: number,
) {
  const body = new FormData();
  body.append("image", file);
  if (altText !== undefined) body.append("altText", altText ?? "");
  if (sortOrder !== undefined) body.append("sortOrder", String(sortOrder));

  return apiRequest<AdminProductImageResponse>(
    `/moderator/products/${productId}/images/${imageId}/replace`,
    { method: "POST", body },
  );
}

export function updateAdminProductImage(
  productId: string,
  imageId: string,
  input: { altText?: string | null; sortOrder?: number },
) {
  return apiRequest<AdminProductImageResponse>(
    `/moderator/products/${productId}/images/${imageId}`,
    { method: "PATCH", body: JSON.stringify(input) },
  );
}

export function deleteAdminProductImage(productId: string, imageId: string) {
  return apiRequest<{ data: { productId: string; imageId: string; deleted: true } }>(
    `/moderator/products/${productId}/images/${imageId}`,
    { method: "DELETE" },
  );
}

export type AdminCategoryListItem = {
  id: string;
  parentCategoryId: string | null;
  parentCategory: { id: string; name: string; slug: string } | null;
  name: string;
  slug: string;
  description: string | null;
  imageUrl: string | null;
  sortOrder: number;
  isVisible: boolean;
  seoTitle: string | null;
  seoDescription: string | null;
  canonicalUrl: string | null;
  isIndexed: boolean;
  productCount: number;
  childCategoryCount: number;
  createdAt: string;
  updatedAt: string;
};

export type AdminCategoryDetails = {
  id: string;
  parentCategoryId: string | null;
  parentCategory: { id: string; name: string; slug: string; is_visible: boolean; sort_order: number } | null;
  name: string;
  slug: string;
  description: string | null;
  imageUrl: string | null;
  sortOrder: number;
  isVisible: boolean;
  seoTitle: string | null;
  seoDescription: string | null;
  canonicalUrl: string | null;
  isIndexed: boolean;
  childCategories: Array<{ id: string; name: string; slug: string; is_visible: boolean; sort_order: number }>;
  products: Array<{
    productId: string;
    isPrimary: boolean;
    sortOrder: number;
    product: { id: string; name: string; slug: string; is_active: boolean };
  }>;
  createdAt: string;
  updatedAt: string;
};

export type AdminCategoryInput = {
  parentCategoryId?: string | null;
  name: string;
  slug: string;
  description?: string | null;
  imageUrl?: string | null;
  sortOrder: number;
  isVisible: boolean;
  seoTitle?: string | null;
  seoDescription?: string | null;
  canonicalUrl?: string | null;
  isIndexed: boolean;
};

export type AdminCategoriesResponse = {
  data: AdminCategoryListItem[];
  pagination: { page: number; limit: number; total: number; totalPages: number };
};

export function getAdminCategories(query: {
  page?: number;
  limit?: number;
  search?: string;
  isVisible?: boolean;
  parentCategoryId?: string | null;
} = {}) {
  return apiRequest<AdminCategoriesResponse>("/moderator/categories", {
    query: {
      page: query.page ?? 1,
      limit: query.limit ?? 100,
      ...(query.search ? { search: query.search } : {}),
      ...(query.isVisible !== undefined ? { isVisible: String(query.isVisible) } : {}),
      ...(query.parentCategoryId !== undefined
        ? { parentCategoryId: query.parentCategoryId === null ? "null" : query.parentCategoryId }
        : {}),
    },
  });
}

export function getAdminCategory(categoryId: string) {
  return apiRequest<{ data: AdminCategoryDetails }>(`/moderator/categories/${categoryId}`);
}

export function createAdminCategory(input: AdminCategoryInput) {
  return apiRequest<{ data: AdminCategoryListItem }>("/moderator/categories", {
    method: "POST",
    body: JSON.stringify(input),
  });
}

export function updateAdminCategory(categoryId: string, input: Partial<AdminCategoryInput>) {
  return apiRequest<{ data: AdminCategoryDetails }>(`/moderator/categories/${categoryId}`, {
    method: "PATCH",
    body: JSON.stringify(input),
  });
}

export function deleteAdminCategory(categoryId: string) {
  return apiRequest<{ data: { categoryId: string; deleted: true } }>(
    `/moderator/categories/${categoryId}`,
    { method: "DELETE" },
  );
}

// ===== Admin: content / home page =====
export type AdminCollection = { id:string; name:string; slug:string; description:string|null; imageUrl:string|null; collectionType:string; isActive:boolean; showOnHome:boolean; startsAt:string|null; endsAt:string|null; sortOrder:number; seoTitle:string|null; seoDescription:string|null; canonicalUrl:string|null; isIndexed:boolean; productCount?:number; products?:Array<{productId:string;sortOrder:number;product:AdminProductListItem}> };
export type AdminHomeBanner = { id:string; collection_id:string; eyebrow:string|null; title:string; subtitle:string|null; image_url:string|null; image_alt:string|null; is_active:boolean; sort_order:number; starts_at:string|null; ends_at:string|null; collections:{id:string;name:string;slug:string} };
export type AdminArticle = { id:string; slug:string; title:string; excerpt:string; content:string; cover_url:string|null; cover_alt:string|null; reading_time_minutes:number; status:"draft"|"published"; is_featured:boolean; sort_order:number; published_at:string|null; seo_title:string|null; seo_description:string|null };
export function getAdminCollections(){return apiRequest<{data:AdminCollection[]}>("/moderator/collections",{query:{page:1,limit:100}});}
export function getAdminCollection(id:string){return apiRequest<{data:AdminCollection}>(`/moderator/collections/${id}`);}
export function createAdminCollection(input:any){return apiRequest<{data:AdminCollection}>("/moderator/collections",{method:"POST",body:JSON.stringify(input)});}
export function updateAdminCollection(id:string,input:any){return apiRequest<{data:AdminCollection}>(`/moderator/collections/${id}`,{method:"PATCH",body:JSON.stringify(input)});}
export function deleteAdminCollection(id:string){return apiRequest(`/moderator/collections/${id}`,{method:"DELETE"});}
export function addProductToAdminCollection(productId:string,collectionId:string,sortOrder=0){return apiRequest(`/moderator/products/${productId}/collections/${collectionId}`,{method:"PUT",body:JSON.stringify({sortOrder})});}
export function removeProductFromAdminCollection(productId:string,collectionId:string){return apiRequest(`/moderator/products/${productId}/collections/${collectionId}`,{method:"DELETE"});}
export function getAdminHomeBanners(){return apiRequest<{data:AdminHomeBanner[]}>("/moderator/content/home-banners");}
export function createAdminHomeBanner(input:any){return apiRequest("/moderator/content/home-banners",{method:"POST",body:JSON.stringify(input)});}
export function updateAdminHomeBanner(id:string,input:any){return apiRequest(`/moderator/content/home-banners/${id}`,{method:"PATCH",body:JSON.stringify(input)});}
export function deleteAdminHomeBanner(id:string){return apiRequest(`/moderator/content/home-banners/${id}`,{method:"DELETE"});}
export function getAdminArticles(){return apiRequest<{data:AdminArticle[]}>("/moderator/content/articles");}
export function createAdminArticle(input:any){return apiRequest("/moderator/content/articles",{method:"POST",body:JSON.stringify(input)});}
export function updateAdminArticle(id:string,input:any){return apiRequest(`/moderator/content/articles/${id}`,{method:"PATCH",body:JSON.stringify(input)});}
export function deleteAdminArticle(id:string){return apiRequest(`/moderator/content/articles/${id}`,{method:"DELETE"});}


// ===== Admin: orders =====
export type AdminOrderStatus = "new" | "confirmed" | "processing" | "shipped" | "completed" | "cancelled";
export type AdminDeliveryStatus = "pending" | "preparing" | "handed_over" | "in_transit" | "delivered" | "returned" | "cancelled";
export type AdminPaymentOperationStatus = "pending" | "succeeded" | "failed" | "cancelled" | "refunded";

export type AdminOrderListItem = {
  id: string;
  order_number: string;
  customer_id: string | null;
  customer_name: string;
  phone: string;
  email: string | null;
  status: AdminOrderStatus;
  payment_status: string;
  cancellation_reason: string | null;
  is_archived: boolean;
  archived_at: string | null;
  items_total: string | number;
  gross_items_total: string | number;
  discount_total: string | number;
  promo_code: string | null;
  loyalty_spent: string | number;
  referral_code: string | null;
  delivery_cost: string | number;
  total_amount: string | number;
  ordered_at: string;
  updated_at: string;
  order_items: Array<{ id:string; product_name:string; sku:string; weight_g:string|number; unit_price:string|number; quantity:number; line_total:string|number }>;
  order_deliveries: { status: AdminDeliveryStatus; tracking_number:string|null; delivery_service:string|null; delivery_methods:{id:string;name:string} } | null;
};

export type AdminOrderDetails = AdminOrderListItem & {
  comment: string | null;
  customers: { id:string; phone:string; name:string; email:string|null; username:string|null; created_at:string } | null;
  order_deliveries: { id:string; order_id:string; delivery_method_id:string; cost:string|number; recipient_name:string; phone:string; full_address:string; comment:string|null; tracking_number:string|null; delivery_service:string|null; status:AdminDeliveryStatus; handed_over_at:string|null; received_at:string|null; created_at:string; updated_at:string; delivery_methods:{id:string;name:string;delivery_term?:string|null} } | null;
  order_payments: Array<{ id:string; order_id:string; payment_method_id:string; operation_number:string|null; amount:string|number; status:AdminPaymentOperationStatus; paid_at:string|null; created_at:string; updated_at:string; payment_methods:{id:string;name:string} }>;
  order_status_history: Array<{ id:string; order_id:string; old_status?:string|null; new_status:string; changed_at:string }>;
  order_discounts: Array<{id:string;source_type:string;source_id:string|null;code:string|null;name:string;amount:string|number;created_at:string}>;
};

export type AdminOrdersResponse = { data:AdminOrderListItem[]; pagination:{page:number;limit:number;total:number;totalPages:number} };
export type AdminOrderArchiveFilter = "active" | "archived" | "all";
export function getAdminOrders(query:{page?:number;limit?:number;search?:string;status?:AdminOrderStatus;archive?:AdminOrderArchiveFilter}={}){return apiRequest<AdminOrdersResponse>("/moderator/orders",{query:{page:query.page??1,limit:query.limit??20,archive:query.archive??"active",...(query.search?{search:query.search}:{}),...(query.status?{status:query.status}:{})}});}
export function getAdminOrder(orderNumber:string){return apiRequest<{data:AdminOrderDetails}>(`/moderator/orders/${encodeURIComponent(orderNumber)}`);}
export function updateAdminOrderStatus(orderNumber:string,status:AdminOrderStatus,cancellationReason?:string|null){return apiRequest(`/moderator/orders/${encodeURIComponent(orderNumber)}/status`,{method:"PATCH",body:JSON.stringify({status,cancellationReason})});}
export function updateAdminOrderArchive(orderNumber:string,archived:boolean){return apiRequest(`/moderator/orders/${encodeURIComponent(orderNumber)}/archive`,{method:"PATCH",body:JSON.stringify({archived})});}
export function updateAdminOrderDelivery(orderNumber:string,input:{status:AdminDeliveryStatus;deliveryService?:string|null;trackingNumber?:string|null;handedOverAt?:string|null;receivedAt?:string|null}){return apiRequest(`/moderator/orders/${encodeURIComponent(orderNumber)}/delivery`,{method:"PATCH",body:JSON.stringify(input)});}
export function updateAdminOrderPayment(orderNumber:string,input:{status:AdminPaymentOperationStatus;operationNumber?:string|null;paidAt?:string|null}){return apiRequest(`/moderator/orders/${encodeURIComponent(orderNumber)}/payment`,{method:"PATCH",body:JSON.stringify(input)});}


// ===== Admin: customers =====
export type AdminCustomerListItem={id:string;phone:string|null;name:string|null;email:string|null;username:string|null;birthDate:string|null;createdAt:string;updatedAt:string;orderCount:number;completedOrderCount:number;cancelledOrderCount:number;totalSpent:number;lastOrderAt:string|null};
export type AdminCustomerDetails={id:string;phone:string|null;name:string|null;email:string|null;username:string|null;birth_date:string|null;created_at:string;updated_at:string;customer_addresses:Array<{id:string;address_name:string;recipient_name:string;phone:string;region:string|null;city:string;street:string;house:string;apartment:string|null;postal_code:string|null;comment:string|null;is_default:boolean}>;orders:Array<AdminOrderListItem & {order_items:Array<{id:string}>}>};
export function getAdminCustomers(q:{page?:number;limit?:number;search?:string}={}){return apiRequest<{data:AdminCustomerListItem[];pagination:{page:number;limit:number;total:number;totalPages:number}}>("/moderator/customers",{query:{page:q.page??1,limit:q.limit??20,...(q.search?{search:q.search}:{})}})}
export function getAdminCustomer(id:string){return apiRequest<{data:AdminCustomerDetails}>(`/moderator/customers/${id}`)}
export function updateAdminCustomer(id:string,input:{name?:string|null;phone?:string|null;email?:string|null;username?:string|null;birthDate?:string|null}){return apiRequest(`/moderator/customers/${id}`,{method:"PATCH",body:JSON.stringify(input)})}
export function deleteAdminCustomer(id:string){return apiRequest<{data:{deleted:true;preservedOrders:number}}>(`/moderator/customers/${id}`,{method:"DELETE"})}


// ===== Admin: promotions / promo codes / loyalty / referrals =====
export type AdminPromotion={id:string;name:string;description:string|null;discount_type:"percent"|"fixed"|"free_delivery"|"buy_x_get_y";scope:"order"|"product"|"category"|"collection";target_ids:string[]|null;value:string|number;buy_quantity:number|null;get_quantity:number|null;min_order_amount:string|number;priority:number;audience_type:"all"|"registered"|"guests"|"customers";customer_ids:string[]|null;activation_type:"automatic"|"promo_code";promo_code_id:string|null;is_stackable:boolean;usage_limit:number|null;per_customer_limit:number;is_active:boolean;starts_at:string|null;ends_at:string|null};
export type AdminPromoCode={id:string;code:string;name:string;discount_type:"percent"|"fixed"|"free_delivery";value:string|number;min_order_amount:string|number;usage_limit:number|null;used_count:number;per_customer_limit:number;is_active:boolean;starts_at:string|null;ends_at:string|null};
export type AdminBenefitSettings={loyalty:{is_active:boolean;earn_percent:string|number;max_spend_percent:string|number;min_order_amount:string|number;bonus_lifetime_days:number|null;min_spend_points:string|number;allow_with_promotions:boolean;allow_with_promo_codes:boolean};referral:{is_active:boolean;inviter_bonus:string|number;invitee_discount_percent:string|number;min_order_amount:string|number}};
export function getAdminPromotions(){return apiRequest<{data:AdminPromotion[]}>("/moderator/promotions")}
export type AdminPromotionInput={name:string;description?:string|null;discountType:"percent"|"fixed"|"free_delivery"|"buy_x_get_y";scope:"order"|"product"|"category"|"collection";targetIds:string[];value:number;buyQuantity?:number|null;getQuantity?:number|null;minOrderAmount:number;priority:number;audienceType:"all"|"registered"|"guests"|"customers";customerIds:string[];activationType:"automatic"|"promo_code";promoCodeId?:string|null;isStackable:boolean;usageLimit?:number|null;perCustomerLimit:number;isActive:boolean;startsAt?:string|null;endsAt?:string|null};
export function createAdminPromotion(input:AdminPromotionInput){return apiRequest("/moderator/promotions",{method:"POST",body:JSON.stringify(input)})}
export function updateAdminPromotion(id:string,input:Partial<AdminPromotionInput>){return apiRequest(`/moderator/promotions/${id}`,{method:"PATCH",body:JSON.stringify(input)})}
export function deleteAdminPromotion(id:string){return apiRequest(`/moderator/promotions/${id}`,{method:"DELETE"})}
export function getAdminPromoCodes(){return apiRequest<{data:AdminPromoCode[]}>("/moderator/promo-codes")}
export type AdminPromoCodeInput={code:string;name:string;discountType:"percent"|"fixed"|"free_delivery";value:number;minOrderAmount:number;usageLimit?:number|null;perCustomerLimit:number;isActive:boolean;startsAt?:string|null;endsAt?:string|null};
export function createAdminPromoCode(input:AdminPromoCodeInput){return apiRequest("/moderator/promo-codes",{method:"POST",body:JSON.stringify(input)})}
export function updateAdminPromoCode(id:string,input:Partial<AdminPromoCodeInput>){return apiRequest(`/moderator/promo-codes/${id}`,{method:"PATCH",body:JSON.stringify(input)})}
export function deleteAdminPromoCode(id:string){return apiRequest(`/moderator/promo-codes/${id}`,{method:"DELETE"})}
export function getAdminBenefitSettings(){return apiRequest<{data:AdminBenefitSettings}>("/moderator/benefit-settings")}
export function updateAdminLoyaltySettings(input:unknown){return apiRequest("/moderator/benefit-settings/loyalty",{method:"PUT",body:JSON.stringify(input)})}
export function updateAdminReferralSettings(input:unknown){return apiRequest("/moderator/benefit-settings/referral",{method:"PUT",body:JSON.stringify(input)})}

export type AdminReferralPartner={id:string;name:string;contact:string|null;code:string;invitee_discount_percent:string|number;commission_percent:string|number;min_order_amount:string|number;is_active:boolean;order_count:number;revenue:string|number;commission_total:string|number};
export type AdminReferralPartnerInput={name:string;contact?:string|null;code:string;inviteeDiscountPercent:number;commissionPercent:number;minOrderAmount:number;isActive:boolean};
export function getAdminReferralPartners(){return apiRequest<{data:AdminReferralPartner[]}>("/moderator/referral-partners")}
export function createAdminReferralPartner(input:AdminReferralPartnerInput){return apiRequest("/moderator/referral-partners",{method:"POST",body:JSON.stringify(input)})}
export function updateAdminReferralPartner(id:string,input:Partial<AdminReferralPartnerInput>){return apiRequest(`/moderator/referral-partners/${id}`,{method:"PATCH",body:JSON.stringify(input)})}
export function deleteAdminReferralPartner(id:string){return apiRequest(`/moderator/referral-partners/${id}`,{method:"DELETE"})}

// ===== Admin: Email notifications =====
export type AdminNotificationChannel={id:string;channel:"email"|"telegram";is_enabled:boolean;sender_name:string|null;sender_from:string|null;updated_at:string};
export type AdminNotificationTemplate={id:string;event_key:string;name:string;subject:string;body:string;is_active:boolean;created_at:string;updated_at:string};
export type AdminNotificationCampaign={id:string;name:string;audience_type:"all"|"registered"|"customers";customer_ids:string[]|null;subject:string;body:string;channels:("email"|"telegram")[];status:string;sent_at:string|null;created_at:string;updated_at:string};
export type AdminNotificationDelivery={id:string;customer_id:string|null;campaign_id:string|null;event_key:string|null;recipient:string;subject:string;body:string;channels:("email"|"telegram")[];status:string;error_message:string|null;created_at:string;sent_at:string|null};
export type AdminNotificationOverview={channels:AdminNotificationChannel[];templates:AdminNotificationTemplate[];campaigns:AdminNotificationCampaign[];stats:{activeAutomations:number;campaigns:number;emailCustomers:number;marketingEnabled:number;telegramLinked:number};telegram:{configured:boolean;connected:boolean;username:string|null;name:string|null;error:string|null}};
export function getAdminNotifications(){return apiRequest<{data:AdminNotificationOverview}>("/moderator/notifications")}
export function updateAdminNotificationChannel(channel:"email"|"telegram",input:{isEnabled:boolean;senderName?:string|null;senderFrom?:string|null}){return apiRequest(`/moderator/notifications/channels/${channel}`,{method:"PUT",body:JSON.stringify(input)})}
export function checkAdminNotificationChannel(channel:"email"|"telegram"){return apiRequest<{data:{configured:boolean;connected:boolean;username?:string|null;name?:string|null;error?:string|null}}>(`/moderator/notifications/channels/${channel}/check`,{method:"POST"})}
export function updateAdminNotificationTemplate(id:string,input:{name?:string;subject?:string;body?:string;isActive?:boolean}){return apiRequest(`/moderator/notifications/templates/${id}`,{method:"PATCH",body:JSON.stringify(input)})}
export function createAdminNotificationCampaign(input:{name:string;audienceType:"all"|"registered"|"customers";customerIds:string[];subject:string;body:string;channels:("email"|"telegram")[]}){return apiRequest("/moderator/notifications/campaigns",{method:"POST",body:JSON.stringify(input)})}
export function sendAdminNotificationCampaign(id:string){return apiRequest<{data:{sent:number;failed:number;skipped:number;eligible:number}}>(`/moderator/notifications/campaigns/${id}/send`,{method:"POST"})}
export function deleteAdminNotificationCampaign(id:string){return apiRequest(`/moderator/notifications/campaigns/${id}`,{method:"DELETE"})}

// ===== Admin: analytics =====
export type AdminAnalyticsData={period:{from:string;to:string};overview:{visitors:number;orders:number;revenue:number;averageCheck:number;orderConversion:number;buyoutRate:number};funnel:Array<{key:string;label:string;value:number}>;dynamics:Array<{date:string;visitors:number;orders:number;revenue:number}>;sources:Array<{source:string;visitors:number;cartSessions:number;orders:number;conversion:number;revenue:number}>;products:Array<{id:string;name:string;views:number;cartSessions:number;sold:number;conversion:number;revenue:number}>;customers:{newCustomers:number;repeatCustomers:number;repeatShare:number};marketing:{promoOrders:number;loyaltyOrders:number;discountTotal:number;marketingRevenue:number;discountEntries:number}};
export function getAdminAnalytics(from:string,to:string){return apiRequest<{data:AdminAnalyticsData}>("/moderator/analytics",{query:{from,to}})}
