import { ArrowLeft, Save } from "lucide-react";
import { useState } from "react";
import type { FormEvent } from "react";
import { Link, useNavigate } from "react-router-dom";

import { apiRequest } from "../../shared/api/client";

type FormState = {
  name: string;
  slug: string;
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
  waterTemperatureC: string;
  teaAmountG: string;
  brewingTimeSeconds: string;
  infusionCount: string;
  brewingTips: string;
  seoTitle: string;
  seoDescription: string;
  canonicalUrl: string;
  isActive: boolean;
  isNew: boolean;
  isIndexed: boolean;
};

type VariantStatus = "active" | "hidden" | "archived";

type VariantFormState = {
  sku: string;
  weightG: string;
  price: string;
  oldPrice: string;
  stockQuantity: string;
  isAvailable: boolean;
  status: VariantStatus;
};

type CreatedProduct = {
  id: string;
};

type CreateProductResponse = {
  data: CreatedProduct;
};

const emptyVariant: VariantFormState = {
  sku: "",
  weightG: "",
  price: "",
  oldPrice: "",
  stockQuantity: "0",
  isAvailable: true,
  status: "active",
};

const emptyForm: FormState = {
  name: "",
  slug: "",
  shortDescription: "",
  teaType: "",
  country: "",
  region: "",
  manufacturer: "",
  fermentationLevel: "",
  productForm: "",
  aboutTea: "",
  taste: "",
  aroma: "",
  effect: "",
  beneficialProperties: "",
  waterTemperatureC: "",
  teaAmountG: "",
  brewingTimeSeconds: "",
  infusionCount: "",
  brewingTips: "",
  seoTitle: "",
  seoDescription: "",
  canonicalUrl: "",
  isActive: true,
  isNew: false,
  isIndexed: true,
};

function nullable(value: string) {
  const result = value.trim();
  return result ? result : null;
}

function nullableNumber(value: string) {
  if (!value.trim()) return null;
  const result = Number(value.replace(",", "."));
  return Number.isFinite(result) ? result : null;
}

function transliterate(value: string) {
  const map: Record<string, string> = {
    а:"a",б:"b",в:"v",г:"g",д:"d",е:"e",ё:"e",ж:"zh",з:"z",и:"i",й:"y",
    к:"k",л:"l",м:"m",н:"n",о:"o",п:"p",р:"r",с:"s",т:"t",у:"u",ф:"f",
    х:"h",ц:"ts",ч:"ch",ш:"sh",щ:"sch",ъ:"",ы:"y",ь:"",э:"e",ю:"yu",я:"ya"
  };

  return value
    .toLowerCase()
    .split("")
    .map((char) => map[char] ?? char)
    .join("")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .replace(/-{2,}/g, "-");
}

export default function AdminProductCreatePage() {
  const navigate = useNavigate();
  const [form, setForm] = useState<FormState>(emptyForm);
  const [variant, setVariant] = useState<VariantFormState>(emptyVariant);
  const [slugEdited, setSlugEdited] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const setField = <K extends keyof FormState>(field: K, value: FormState[K]) => {
    setForm((current) => ({ ...current, [field]: value }));
    setError("");
  };

  const setVariantField = <K extends keyof VariantFormState>(
    field: K,
    value: VariantFormState[K]
  ) => {
    setVariant((current) => ({ ...current, [field]: value }));
    setError("");
  };

  const changeName = (value: string) => {
    setForm((current) => ({
      ...current,
      name: value,
      slug: slugEdited ? current.slug : transliterate(value),
    }));
    setError("");
  };

  const submit = async (event: FormEvent) => {
    event.preventDefault();

    const name = form.name.trim();
    const slug = form.slug.trim();

    if (!name || !slug) {
      setError("Заполните название и slug.");
      return;
    }

    if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug)) {
      setError("Slug может содержать только латинские буквы, цифры и дефисы.");
      return;
    }

    const sku = variant.sku.trim();
    const weightG = Number(variant.weightG.replace(",", "."));
    const price = Number(variant.price.replace(",", "."));
    const oldPrice = variant.oldPrice.trim()
      ? Number(variant.oldPrice.replace(",", "."))
      : null;
    const stockQuantity = Number(variant.stockQuantity);

    if (!sku) {
      setError("Укажите SKU первого варианта.");
      return;
    }

    if (!variant.weightG.trim() || !Number.isFinite(weightG) || weightG <= 0) {
      setError("Вес первого варианта должен быть больше 0.");
      return;
    }

    if (!variant.price.trim() || !Number.isFinite(price) || price < 0) {
      setError("Укажите корректную цену первого варианта.");
      return;
    }

    if (oldPrice !== null && (!Number.isFinite(oldPrice) || oldPrice <= price)) {
      setError("Старая цена должна быть больше текущей.");
      return;
    }

    if (!Number.isInteger(stockQuantity) || stockQuantity < 0) {
      setError("Остаток должен быть целым числом от 0.");
      return;
    }

    if (form.isActive && variant.status !== "active") {
      setError("У активного товара первый вариант должен иметь статус «Активный».");
      return;
    }

    setSaving(true);
    setError("");

    try {
      const response = await apiRequest<CreateProductResponse>("/moderator/products", {
        method: "POST",
        body: JSON.stringify({
          name,
          slug,
          shortDescription: nullable(form.shortDescription),
          teaType: nullable(form.teaType),
          country: nullable(form.country),
          region: nullable(form.region),
          manufacturer: nullable(form.manufacturer),
          fermentationLevel: nullable(form.fermentationLevel),
          productForm: nullable(form.productForm),
          aboutTea: nullable(form.aboutTea),
          taste: nullable(form.taste),
          aroma: nullable(form.aroma),
          effect: nullable(form.effect),
          beneficialProperties: nullable(form.beneficialProperties),
          waterTemperatureC: nullableNumber(form.waterTemperatureC),
          teaAmountG: nullableNumber(form.teaAmountG),
          brewingTimeSeconds: nullableNumber(form.brewingTimeSeconds),
          infusionCount: nullableNumber(form.infusionCount),
          brewingTips: nullable(form.brewingTips),
          seoTitle: nullable(form.seoTitle),
          seoDescription: nullable(form.seoDescription),
          canonicalUrl: nullable(form.canonicalUrl),
          isActive: form.isActive,
          isNew: form.isNew,
          isIndexed: form.isIndexed,
          firstVariant: {
            sku,
            weightG,
            price,
            oldPrice,
            stockQuantity,
            sortOrder: 0,
            isAvailable: variant.isAvailable,
            status: variant.status,
          },
        }),
      });

      navigate(`/admin/products/${response.data.id}`, { replace: true });
    } catch (requestError) {
      const message =
        requestError instanceof Error && requestError.message
          ? requestError.message
          : "Не удалось создать товар.";
      setError(message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <form className="admin-product-editor" onSubmit={submit}>
      <div className="admin-editor-top">
        <div>
          <Link className="admin-editor-back" to="/admin/products">
            <ArrowLeft size={18} />
            К товарам
          </Link>
          <h1>Новый товар</h1>
          <p>Создание новой карточки товара магазина.</p>
        </div>

        <button
          className="admin-primary-button"
          type="submit"
          disabled={saving}
        >
          <Save size={18} />
          {saving ? "Создание…" : "Создать товар"}
        </button>
      </div>

      {error ? <div className="admin-editor-message is-error">{error}</div> : null}

      <div className="admin-editor-grid">
        <section className="admin-editor-card">
          <h2>Основная информация</h2>
          <div className="admin-form-grid">
            <label className="admin-field admin-field-wide">
              <span>Название *</span>
              <input
                autoFocus
                value={form.name}
                onChange={(e) => changeName(e.target.value)}
              />
            </label>

            <label className="admin-field admin-field-wide">
              <span>Slug *</span>
              <input
                value={form.slug}
                onChange={(e) => {
                  setSlugEdited(true);
                  setField("slug", e.target.value.toLowerCase());
                }}
                placeholder="shu-puer-gun-tin"
              />
            </label>

            <label className="admin-field admin-field-wide">
              <span>Краткое описание</span>
              <textarea rows={3} value={form.shortDescription} onChange={(e) => setField("shortDescription", e.target.value)} />
            </label>

            <label className="admin-field"><span>Тип чая</span><input value={form.teaType} onChange={(e) => setField("teaType", e.target.value)} /></label>
            <label className="admin-field"><span>Страна</span><input value={form.country} onChange={(e) => setField("country", e.target.value)} /></label>
            <label className="admin-field"><span>Регион</span><input value={form.region} onChange={(e) => setField("region", e.target.value)} /></label>
            <label className="admin-field"><span>Производитель</span><input value={form.manufacturer} onChange={(e) => setField("manufacturer", e.target.value)} /></label>
            <label className="admin-field"><span>Степень ферментации</span><input value={form.fermentationLevel} onChange={(e) => setField("fermentationLevel", e.target.value)} /></label>
            <label className="admin-field"><span>Форма продукта</span><input value={form.productForm} onChange={(e) => setField("productForm", e.target.value)} /></label>
          </div>
        </section>

        <section className="admin-editor-card">
          <h2>Публикация</h2>

          <label className="admin-switch-row">
            <input type="checkbox" checked={form.isActive} onChange={(e) => setField("isActive", e.target.checked)} />
            <span><strong>Товар активен</strong><small>Показывать товар покупателям.</small></span>
          </label>

          <label className="admin-switch-row">
            <input type="checkbox" checked={form.isNew} onChange={(e) => setField("isNew", e.target.checked)} />
            <span><strong>Новинка</strong><small>Показывать товар в разделе новинок.</small></span>
          </label>

          <label className="admin-switch-row">
            <input type="checkbox" checked={form.isIndexed} onChange={(e) => setField("isIndexed", e.target.checked)} />
            <span><strong>Индексировать</strong><small>Разрешить индексацию страницы товара.</small></span>
          </label>
        </section>

        <section className="admin-editor-card admin-editor-card-wide">
          <h2>Описание и свойства</h2>
          <div className="admin-form-grid">
            <label className="admin-field admin-field-wide"><span>О чае</span><textarea rows={5} value={form.aboutTea} onChange={(e) => setField("aboutTea", e.target.value)} /></label>
            <label className="admin-field"><span>Вкус</span><textarea rows={4} value={form.taste} onChange={(e) => setField("taste", e.target.value)} /></label>
            <label className="admin-field"><span>Аромат</span><textarea rows={4} value={form.aroma} onChange={(e) => setField("aroma", e.target.value)} /></label>
            <label className="admin-field"><span>Эффект</span><textarea rows={4} value={form.effect} onChange={(e) => setField("effect", e.target.value)} /></label>
            <label className="admin-field"><span>Полезные свойства</span><textarea rows={4} value={form.beneficialProperties} onChange={(e) => setField("beneficialProperties", e.target.value)} /></label>
          </div>
        </section>

        <section className="admin-editor-card admin-editor-card-wide">
          <h2>Заваривание</h2>
          <div className="admin-form-grid admin-form-grid-four">
            <label className="admin-field"><span>Температура воды, °C</span><input inputMode="decimal" value={form.waterTemperatureC} onChange={(e) => setField("waterTemperatureC", e.target.value)} /></label>
            <label className="admin-field"><span>Количество чая, г</span><input inputMode="decimal" value={form.teaAmountG} onChange={(e) => setField("teaAmountG", e.target.value)} /></label>
            <label className="admin-field"><span>Время, секунд</span><input inputMode="numeric" value={form.brewingTimeSeconds} onChange={(e) => setField("brewingTimeSeconds", e.target.value)} /></label>
            <label className="admin-field"><span>Количество проливов</span><input inputMode="numeric" value={form.infusionCount} onChange={(e) => setField("infusionCount", e.target.value)} /></label>
            <label className="admin-field admin-field-wide"><span>Рекомендации по завариванию</span><textarea rows={4} value={form.brewingTips} onChange={(e) => setField("brewingTips", e.target.value)} /></label>
          </div>
        </section>

        <section className="admin-editor-card admin-editor-card-wide">
          <h2>SEO</h2>
          <div className="admin-form-grid">
            <label className="admin-field admin-field-wide"><span>SEO-заголовок</span><input value={form.seoTitle} onChange={(e) => setField("seoTitle", e.target.value)} /></label>
            <label className="admin-field admin-field-wide"><span>SEO-описание</span><textarea rows={3} value={form.seoDescription} onChange={(e) => setField("seoDescription", e.target.value)} /></label>
            <label className="admin-field admin-field-wide"><span>Canonical URL</span><input value={form.canonicalUrl} onChange={(e) => setField("canonicalUrl", e.target.value)} /></label>
          </div>
        </section>

        <section className="admin-editor-card admin-editor-card-wide">
          <h2>Первый вариант товара *</h2>
          <p style={{ marginTop: 0 }}>
            Для создания товара нужен минимум один вариант. Остальные варианты и фотографии можно добавить после создания карточки.
          </p>

          <div className="admin-form-grid">
            <label className="admin-field">
              <span>SKU *</span>
              <input
                value={variant.sku}
                onChange={(e) => setVariantField("sku", e.target.value)}
                placeholder="SHU-PUER-100"
              />
            </label>

            <label className="admin-field">
              <span>Вес, г *</span>
              <input
                inputMode="decimal"
                value={variant.weightG}
                onChange={(e) => setVariantField("weightG", e.target.value)}
                placeholder="100"
              />
            </label>

            <label className="admin-field">
              <span>Цена, ₽ *</span>
              <input
                inputMode="decimal"
                value={variant.price}
                onChange={(e) => setVariantField("price", e.target.value)}
                placeholder="990"
              />
            </label>

            <label className="admin-field">
              <span>Старая цена, ₽</span>
              <input
                inputMode="decimal"
                value={variant.oldPrice}
                onChange={(e) => setVariantField("oldPrice", e.target.value)}
                placeholder="1190"
              />
            </label>

            <label className="admin-field">
              <span>Начальный остаток</span>
              <input
                inputMode="numeric"
                value={variant.stockQuantity}
                onChange={(e) => setVariantField("stockQuantity", e.target.value)}
              />
            </label>

            <label className="admin-field">
              <span>Статус *</span>
              <select
                value={variant.status}
                onChange={(e) =>
                  setVariantField("status", e.target.value as VariantStatus)
                }
              >
                <option value="active">Активный</option>
                <option value="hidden">Скрытый</option>
                <option value="archived">Архивный</option>
              </select>
            </label>
          </div>

          <label className="admin-switch-row">
            <input
              type="checkbox"
              checked={variant.isAvailable}
              onChange={(e) => setVariantField("isAvailable", e.target.checked)}
            />
            <span>
              <strong>Доступен для покупки</strong>
              <small>Вариант можно выбрать и добавить в корзину.</small>
            </span>
          </label>
        </section>
      </div>
    </form>
  );
}
