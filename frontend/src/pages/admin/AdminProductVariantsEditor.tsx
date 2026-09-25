import { Plus, Save, Trash2, X } from "lucide-react";
import { useMemo, useState } from "react";

import { apiRequest } from "../../shared/api/client";

type VariantStatus = "active" | "hidden" | "archived";

export type AdminEditableVariant = {
  id: string;
  sku: string;
  weight_g: string | number;
  price: string | number;
  old_price?: string | number | null;
  stock_quantity: number;
  sort_order: number;
  is_available: boolean;
  status: VariantStatus;
};

type Props = {
  productId: string;
  variants: AdminEditableVariant[];
  onChanged: () => Promise<void> | void;
};

type VariantForm = {
  sku: string;
  weightG: string;
  price: string;
  oldPrice: string;
  stockQuantity: string;
  sortOrder: string;
  isAvailable: boolean;
  status: VariantStatus;
};

const emptyVariant: VariantForm = {
  sku: "",
  weightG: "",
  price: "",
  oldPrice: "",
  stockQuantity: "0",
  sortOrder: "0",
  isAvailable: true,
  status: "active",
};

function toForm(variant: AdminEditableVariant): VariantForm {
  return {
    sku: variant.sku,
    weightG: String(variant.weight_g),
    price: String(variant.price),
    oldPrice: variant.old_price == null ? "" : String(variant.old_price),
    stockQuantity: String(variant.stock_quantity),
    sortOrder: String(variant.sort_order),
    isAvailable: variant.is_available,
    status: variant.status,
  };
}

function parseForm(form: VariantForm) {
  const sku = form.sku.trim();
  const weightG = Number(form.weightG.replace(",", "."));
  const price = Number(form.price.replace(",", "."));
  const oldPrice = form.oldPrice.trim()
    ? Number(form.oldPrice.replace(",", "."))
    : null;
  const stockQuantity = Number(form.stockQuantity);
  const sortOrder = Number(form.sortOrder);

  if (!sku) throw new Error("Укажите SKU.");
  if (!form.weightG.trim() || !Number.isFinite(weightG) || weightG <= 0) {
    throw new Error("Вес должен быть больше 0.");
  }
  if (!form.price.trim() || !Number.isFinite(price) || price < 0) {
    throw new Error("Цена должна быть числом от 0.");
  }
  if (oldPrice !== null && (!Number.isFinite(oldPrice) || oldPrice <= price)) {
    throw new Error("Старая цена должна быть больше текущей.");
  }
  if (!Number.isInteger(stockQuantity) || stockQuantity < 0) {
    throw new Error("Остаток должен быть целым числом от 0.");
  }
  if (!Number.isInteger(sortOrder) || sortOrder < 0) {
    throw new Error("Порядок должен быть целым числом от 0.");
  }

  return {
    sku,
    weightG,
    price,
    oldPrice,
    stockQuantity,
    sortOrder,
    isAvailable: form.isAvailable,
    status: form.status,
  };
}

function errorMessage(error: unknown, fallback: string) {
  if (error instanceof Error && error.message) return error.message;
  return fallback;
}

export default function AdminProductVariantsEditor({
  productId,
  variants,
  onChanged,
}: Props) {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<VariantForm>(emptyVariant);
  const [creating, setCreating] = useState(false);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const sorted = useMemo(
    () =>
      [...variants].sort(
        (a, b) =>
          Number(a.sort_order) - Number(b.sort_order) ||
          Number(a.weight_g) - Number(b.weight_g),
      ),
    [variants],
  );

  const setField = <K extends keyof VariantForm>(
    field: K,
    value: VariantForm[K],
  ) => {
    setForm((current) => ({ ...current, [field]: value }));
    setError("");
    setMessage("");
  };

  const startCreate = () => {
    setEditingId(null);
    setForm({
      ...emptyVariant,
      sortOrder: String(
        sorted.length ? Math.max(...sorted.map((v) => Number(v.sort_order) || 0)) + 10 : 0,
      ),
    });
    setCreating(true);
    setError("");
    setMessage("");
  };

  const startEdit = (variant: AdminEditableVariant) => {
    setCreating(false);
    setEditingId(variant.id);
    setForm(toForm(variant));
    setError("");
    setMessage("");
  };

  const cancel = () => {
    setCreating(false);
    setEditingId(null);
    setForm(emptyVariant);
    setError("");
  };

  const save = async () => {
    try {
      const payload = parseForm(form);
      setBusy(true);
      setError("");
      setMessage("");

      if (creating) {
        await apiRequest(`/moderator/products/${productId}/variants`, {
          method: "POST",
          body: JSON.stringify(payload),
        });
        setMessage("Вариант добавлен.");
      } else if (editingId) {
        await apiRequest(
          `/moderator/products/${productId}/variants/${editingId}`,
          {
            method: "PATCH",
            body: JSON.stringify(payload),
          },
        );
        setMessage("Вариант сохранён.");
      }

      setCreating(false);
      setEditingId(null);
      setForm(emptyVariant);
      await onChanged();
    } catch (e) {
      setError(errorMessage(e, "Не удалось сохранить вариант."));
    } finally {
      setBusy(false);
    }
  };

  const remove = async (variant: AdminEditableVariant) => {
    if (variants.length <= 1) {
      setError(
        "Нельзя удалить единственный вариант. У товара должен оставаться минимум один вариант.",
      );
      return;
    }

    if (!window.confirm(`Удалить вариант ${variant.sku}?`)) return;

    try {
      setBusy(true);
      setError("");
      setMessage("");

      await apiRequest(
        `/moderator/products/${productId}/variants/${variant.id}`,
        { method: "DELETE" },
      );

      setMessage("Вариант удалён.");
      await onChanged();
    } catch (e) {
      setError(
        errorMessage(
          e,
          "Не удалось удалить вариант. Если он используется в корзине или заказах, скройте или архивируйте его.",
        ),
      );
    } finally {
      setBusy(false);
    }
  };

  const editor = creating || editingId ? (
    <div className="admin-variant-editor">
      <div className="admin-form-grid admin-form-grid-four">
        <label className="admin-field">
          <span>SKU *</span>
          <input
            value={form.sku}
            onChange={(e) => setField("sku", e.target.value)}
          />
        </label>

        <label className="admin-field">
          <span>Вес, г *</span>
          <input
            inputMode="decimal"
            value={form.weightG}
            onChange={(e) => setField("weightG", e.target.value)}
          />
        </label>

        <label className="admin-field">
          <span>Цена, ₽ *</span>
          <input
            inputMode="decimal"
            value={form.price}
            onChange={(e) => setField("price", e.target.value)}
          />
        </label>

        <label className="admin-field">
          <span>Старая цена, ₽</span>
          <input
            inputMode="decimal"
            value={form.oldPrice}
            onChange={(e) => setField("oldPrice", e.target.value)}
          />
        </label>

        <label className="admin-field">
          <span>Остаток</span>
          <input
            inputMode="numeric"
            value={form.stockQuantity}
            onChange={(e) => setField("stockQuantity", e.target.value)}
          />
        </label>

        <label className="admin-field">
          <span>Порядок</span>
          <input
            inputMode="numeric"
            value={form.sortOrder}
            onChange={(e) => setField("sortOrder", e.target.value)}
          />
        </label>

        <label className="admin-field">
          <span>Статус</span>
          <select
            value={form.status}
            onChange={(e) => setField("status", e.target.value as VariantStatus)}
          >
            <option value="active">Активный</option>
            <option value="hidden">Скрытый</option>
            <option value="archived">Архивный</option>
          </select>
        </label>

        <label className="admin-switch-row admin-variant-available">
          <input
            type="checkbox"
            checked={form.isAvailable}
            onChange={(e) => setField("isAvailable", e.target.checked)}
          />
          <span>
            <strong>Доступен</strong>
            <small>Можно выбрать для покупки.</small>
          </span>
        </label>
      </div>

      <div className="admin-variant-editor-actions">
        <button
          className="admin-primary-button"
          type="button"
          onClick={save}
          disabled={busy}
        >
          <Save size={17} />
          {busy ? "Сохранение…" : "Сохранить вариант"}
        </button>

        <button
          className="admin-secondary-button"
          type="button"
          onClick={cancel}
          disabled={busy}
        >
          <X size={17} />
          Отмена
        </button>
      </div>
    </div>
  ) : null;

  return (
    <section className="admin-editor-card admin-editor-card-wide">
      <div className="admin-editor-section-heading admin-variants-heading">
        <div>
          <h2>Варианты товара</h2>
          <p>
            SKU, вес, цена, доступность и статус варианта. Остаток хранится у
            конкретного SKU.
          </p>
        </div>

        {!creating && !editingId ? (
          <button
            className="admin-primary-button"
            type="button"
            onClick={startCreate}
            disabled={busy}
          >
            <Plus size={17} />
            Добавить вариант
          </button>
        ) : null}
      </div>

      {error ? <div className="admin-editor-message is-error">{error}</div> : null}
      {message ? (
        <div className="admin-editor-message is-success">{message}</div>
      ) : null}

      {editor}

      <div className="admin-variants-table-wrap">
        <table className="admin-variants-table">
          <thead>
            <tr>
              <th>Вес</th>
              <th>SKU</th>
              <th>Цена</th>
              <th>Старая цена</th>
              <th>Остаток</th>
              <th>Доступность</th>
              <th>Статус</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {sorted.map((variant) => (
              <tr key={variant.id}>
                <td data-label="Вес">{Number(variant.weight_g)} г</td>
                <td data-label="SKU"><strong>{variant.sku}</strong></td>
                <td data-label="Цена">
                  {Number(variant.price).toLocaleString("ru-RU")} ₽
                </td>
                <td data-label="Старая цена">
                  {variant.old_price == null
                    ? "—"
                    : `${Number(variant.old_price).toLocaleString("ru-RU")} ₽`}
                </td>
                <td data-label="Остаток">{variant.stock_quantity}</td>
                <td data-label="Доступность">
                  {variant.is_available ? "Доступен" : "Недоступен"}
                </td>
                <td data-label="Статус">
                  {variant.status === "active"
                    ? "Активный"
                    : variant.status === "hidden"
                      ? "Скрытый"
                      : "Архивный"}
                </td>
                <td className="admin-variant-actions">
                  <button
                    type="button"
                    className="admin-secondary-button"
                    onClick={() => startEdit(variant)}
                    disabled={busy}
                  >
                    Изменить
                  </button>
                  <button
                    type="button"
                    className="admin-icon-danger-button"
                    onClick={() => remove(variant)}
                    disabled={busy}
                    title="Удалить вариант"
                  >
                    <Trash2 size={17} />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}
