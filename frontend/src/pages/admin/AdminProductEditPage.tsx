import { ArrowLeft, Save, Trash2 } from "lucide-react";
import { useEffect, useState } from "react";
import type { FormEvent } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";

import {
  deleteAdminProduct,
  getAdminProduct,
  updateAdminProduct,
} from "../../shared/api/admin";
import type { AdminProductDetails } from "../../shared/api/admin";
import AdminProductImagesEditor from "./AdminProductImagesEditor";
import AdminProductVariantsEditor from "./AdminProductVariantsEditor";

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

function text(value: unknown) {
  return value == null ? "" : String(value);
}

function toForm(product: AdminProductDetails): FormState {
  return {
    name: text(product.name),
    slug: text(product.slug),
    shortDescription: text(product.short_description),
    teaType: text(product.tea_type),
    country: text(product.country),
    region: text(product.region),
    manufacturer: text(product.manufacturer),
    fermentationLevel: text(product.fermentation_level),
    productForm: text(product.product_form),
    aboutTea: text(product.about_tea),
    taste: text(product.taste),
    aroma: text(product.aroma),
    effect: text(product.effect),
    beneficialProperties: text(product.beneficial_properties),
    waterTemperatureC: text(product.water_temperature_c),
    teaAmountG: text(product.tea_amount_g),
    brewingTimeSeconds: text(product.brewing_time_seconds),
    infusionCount: text(product.infusion_count),
    brewingTips: text(product.brewing_tips),
    seoTitle: text(product.seo_title),
    seoDescription: text(product.seo_description),
    canonicalUrl: text(product.canonical_url),
    isActive: product.is_active,
    isNew: Boolean(product.is_new),
    isIndexed: product.is_indexed ?? true,
  };
}

function nullable(value: string) {
  const result = value.trim();
  return result ? result : null;
}

function nullableNumber(value: string) {
  if (!value.trim()) return null;
  const result = Number(value.replace(",", "."));
  return Number.isFinite(result) ? result : null;
}

export default function AdminProductEditPage() {
  const { productId } = useParams();
  const navigate = useNavigate();
  const [form, setForm] = useState<FormState>(emptyForm);
  const [product, setProduct] = useState<AdminProductDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  useEffect(() => {
    if (!productId) {
      setError("Не указан идентификатор товара.");
      setLoading(false);
      return;
    }

    let cancelled = false;
    setLoading(true);
    setError("");

    getAdminProduct(productId)
      .then((response) => {
        if (cancelled) return;
        setProduct(response.data);
        setForm(toForm(response.data));
      })
      .catch(() => {
        if (!cancelled) {
          setError("Не удалось загрузить товар.");
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [productId]);

  const reloadProduct = async () => {
    if (!productId) return;

    const response = await getAdminProduct(productId);
    setProduct(response.data);
    setForm(toForm(response.data));
  };

  const setField = <K extends keyof FormState>(
    field: K,
    value: FormState[K],
  ) => {
    setForm((current) => ({ ...current, [field]: value }));
    setSuccess("");
  };

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    if (!productId || !form.name.trim() || !form.slug.trim()) return;

    setSaving(true);
    setError("");
    setSuccess("");

    try {
      const response = await updateAdminProduct(productId, {
        name: form.name.trim(),
        slug: form.slug.trim(),
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
      });

      setProduct(response.data);
      setForm(toForm(response.data));
      setSuccess("Изменения сохранены.");
    } catch {
      setError("Не удалось сохранить изменения.");
    } finally {
      setSaving(false);
    }
  };

  const removeProduct = async () => {
    if (!productId || deleting) return;

    const confirmed = window.confirm(
      `Удалить товар «${form.name || "Товар"}»? Это действие нельзя отменить.`,
    );
    if (!confirmed) return;

    setDeleting(true);
    setError("");
    setSuccess("");

    try {
      await deleteAdminProduct(productId);
      navigate("/admin/products", { replace: true });
    } catch {
      setError(
        "Не удалось удалить товар. Возможно, товар связан с заказами или другими данными.",
      );
      setDeleting(false);
    }
  };

  if (loading) {
    return <div className="admin-editor-state">Загрузка товара…</div>;
  }

  if (error && !product) {
    return (
      <section className="admin-product-editor">
        <Link className="admin-editor-back" to="/admin/products">
          <ArrowLeft size={18} />
          К товарам
        </Link>
        <div className="admin-editor-state admin-editor-error">{error}</div>
      </section>
    );
  }

  return (
    <form className="admin-product-editor" onSubmit={submit}>
      <div className="admin-editor-top">
        <div>
          <Link className="admin-editor-back" to="/admin/products">
            <ArrowLeft size={18} />
            К товарам
          </Link>
          <h1>{form.name || "Товар"}</h1>
          <p>Редактирование карточки товара магазина.</p>
        </div>

        <div className="admin-editor-top-actions">
          <button
            className="admin-danger-button"
            type="button"
            onClick={removeProduct}
            disabled={deleting || saving}
          >
            <Trash2 size={18} />
            {deleting ? "Удаление…" : "Удалить товар"}
          </button>

          <button
            className="admin-primary-button"
            type="submit"
            disabled={saving || deleting || !form.name.trim() || !form.slug.trim()}
          >
            <Save size={18} />
            {saving ? "Сохранение…" : "Сохранить"}
          </button>
        </div>
      </div>

      {error ? <div className="admin-editor-message is-error">{error}</div> : null}
      {success ? (
        <div className="admin-editor-message is-success">{success}</div>
      ) : null}

      <div className="admin-editor-grid">
        <section className="admin-editor-card">
          <h2>Основная информация</h2>

          <div className="admin-form-grid">
            <label className="admin-field admin-field-wide">
              <span>Название *</span>
              <input
                value={form.name}
                onChange={(e) => setField("name", e.target.value)}
              />
            </label>

            <label className="admin-field admin-field-wide">
              <span>Slug *</span>
              <input
                value={form.slug}
                onChange={(e) => setField("slug", e.target.value)}
              />
            </label>

            <label className="admin-field admin-field-wide">
              <span>Краткое описание</span>
              <textarea
                rows={3}
                value={form.shortDescription}
                onChange={(e) => setField("shortDescription", e.target.value)}
              />
            </label>

            <label className="admin-field">
              <span>Тип чая</span>
              <input
                value={form.teaType}
                onChange={(e) => setField("teaType", e.target.value)}
              />
            </label>

            <label className="admin-field">
              <span>Страна</span>
              <input
                value={form.country}
                onChange={(e) => setField("country", e.target.value)}
              />
            </label>

            <label className="admin-field">
              <span>Регион</span>
              <input
                value={form.region}
                onChange={(e) => setField("region", e.target.value)}
              />
            </label>

            <label className="admin-field">
              <span>Производитель</span>
              <input
                value={form.manufacturer}
                onChange={(e) => setField("manufacturer", e.target.value)}
              />
            </label>

            <label className="admin-field">
              <span>Степень ферментации</span>
              <input
                value={form.fermentationLevel}
                onChange={(e) => setField("fermentationLevel", e.target.value)}
              />
            </label>

            <label className="admin-field">
              <span>Форма продукта</span>
              <input
                value={form.productForm}
                onChange={(e) => setField("productForm", e.target.value)}
              />
            </label>
          </div>
        </section>

        {product && productId ? (
          <AdminProductImagesEditor
            productId={productId}
            images={product.product_images ?? []}
            productName={form.name}
            onChanged={reloadProduct}
          />
        ) : null}

        <section className="admin-editor-card">
          <h2>Публикация</h2>

          <label className="admin-switch-row">
            <input
              type="checkbox"
              checked={form.isActive}
              onChange={(e) => setField("isActive", e.target.checked)}
            />
            <span>
              <strong>Товар активен</strong>
              <small>Показывать товар покупателям.</small>
            </span>
          </label>

          <label className="admin-switch-row">
            <input
              type="checkbox"
              checked={form.isNew}
              onChange={(e) => setField("isNew", e.target.checked)}
            />
            <span>
              <strong>Новинка</strong>
              <small>Показывать товар в разделе новинок.</small>
            </span>
          </label>

          <label className="admin-switch-row">
            <input
              type="checkbox"
              checked={form.isIndexed}
              onChange={(e) => setField("isIndexed", e.target.checked)}
            />
            <span>
              <strong>Индексировать</strong>
              <small>Разрешить индексирование страницы товара.</small>
            </span>
          </label>
        </section>

        <section className="admin-editor-card admin-editor-card-wide">
          <h2>Описание и свойства</h2>

          <div className="admin-form-grid">
            <label className="admin-field admin-field-wide">
              <span>О чае</span>
              <textarea
                rows={5}
                value={form.aboutTea}
                onChange={(e) => setField("aboutTea", e.target.value)}
              />
            </label>

            <label className="admin-field">
              <span>Вкус</span>
              <textarea
                rows={4}
                value={form.taste}
                onChange={(e) => setField("taste", e.target.value)}
              />
            </label>

            <label className="admin-field">
              <span>Аромат</span>
              <textarea
                rows={4}
                value={form.aroma}
                onChange={(e) => setField("aroma", e.target.value)}
              />
            </label>

            <label className="admin-field">
              <span>Эффект</span>
              <textarea
                rows={4}
                value={form.effect}
                onChange={(e) => setField("effect", e.target.value)}
              />
            </label>

            <label className="admin-field">
              <span>Полезные свойства</span>
              <textarea
                rows={4}
                value={form.beneficialProperties}
                onChange={(e) =>
                  setField("beneficialProperties", e.target.value)
                }
              />
            </label>
          </div>
        </section>

        <section className="admin-editor-card admin-editor-card-wide">
          <h2>Заваривание</h2>

          <div className="admin-form-grid admin-form-grid-four">
            <label className="admin-field">
              <span>Температура воды, °C</span>
              <input
                inputMode="decimal"
                value={form.waterTemperatureC}
                onChange={(e) =>
                  setField("waterTemperatureC", e.target.value)
                }
              />
            </label>

            <label className="admin-field">
              <span>Количество чая, г</span>
              <input
                inputMode="decimal"
                value={form.teaAmountG}
                onChange={(e) => setField("teaAmountG", e.target.value)}
              />
            </label>

            <label className="admin-field">
              <span>Время, секунд</span>
              <input
                inputMode="numeric"
                value={form.brewingTimeSeconds}
                onChange={(e) =>
                  setField("brewingTimeSeconds", e.target.value)
                }
              />
            </label>

            <label className="admin-field">
              <span>Количество проливов</span>
              <input
                inputMode="numeric"
                value={form.infusionCount}
                onChange={(e) => setField("infusionCount", e.target.value)}
              />
            </label>

            <label className="admin-field admin-field-wide">
              <span>Рекомендации по завариванию</span>
              <textarea
                rows={4}
                value={form.brewingTips}
                onChange={(e) => setField("brewingTips", e.target.value)}
              />
            </label>
          </div>
        </section>

        <section className="admin-editor-card admin-editor-card-wide">
          <h2>SEO</h2>

          <div className="admin-form-grid">
            <label className="admin-field admin-field-wide">
              <span>SEO-заголовок</span>
              <input
                value={form.seoTitle}
                onChange={(e) => setField("seoTitle", e.target.value)}
              />
            </label>

            <label className="admin-field admin-field-wide">
              <span>SEO-описание</span>
              <textarea
                rows={3}
                value={form.seoDescription}
                onChange={(e) => setField("seoDescription", e.target.value)}
              />
            </label>

            <label className="admin-field admin-field-wide">
              <span>Canonical URL</span>
              <input
                value={form.canonicalUrl}
                onChange={(e) => setField("canonicalUrl", e.target.value)}
              />
            </label>
          </div>
        </section>

        {product && productId ? (
          <AdminProductVariantsEditor
            productId={productId}
            variants={product.product_variants ?? []}
            onChanged={reloadProduct}
          />
        ) : null}
      </div>
    </form>
  );
}
