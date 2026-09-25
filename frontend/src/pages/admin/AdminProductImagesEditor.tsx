import { ImagePlus, RefreshCw, Save, Trash2 } from "lucide-react";
import { useMemo, useRef, useState } from "react";
import {
  deleteAdminProductImage,
  replaceAdminProductImage,
  updateAdminProductImage,
  uploadAdminProductImage,
} from "../../shared/api/admin";
import type { AdminProductImage } from "../../shared/api/admin";

type Props = {
  productId: string;
  images: AdminProductImage[];
  productName: string;
  onChanged: () => Promise<void> | void;
};

function imageUrl(image: AdminProductImage) {
  return image.url || image.image_url || "";
}
function imageAlt(image: AdminProductImage) {
  return image.alt_text ?? image.alt ?? "";
}

export default function AdminProductImagesEditor({
  productId,
  images,
  productName,
  onChanged,
}: Props) {
  const sorted = useMemo(
    () => [...images].sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0)),
    [images],
  );
  const addRef = useRef<HTMLInputElement>(null);
  const replaceRefs = useRef<Record<string, HTMLInputElement | null>>({});
  const [busy, setBusy] = useState("");
  const [message, setMessage] = useState("");
  const [drafts, setDrafts] = useState<Record<string, { alt: string; order: string }>>({});

  const draftFor = (image: AdminProductImage) =>
    drafts[image.id] ?? {
      alt: imageAlt(image),
      order: String(image.sort_order ?? 0),
    };

  const setDraft = (image: AdminProductImage, key: "alt" | "order", value: string) => {
    const current = draftFor(image);
    setDrafts((old) => ({ ...old, [image.id]: { ...current, [key]: value } }));
  };

  const refresh = async () => {
    await onChanged();
    setDrafts({});
  };

  const add = async (file?: File) => {
    if (!file) return;
    setBusy("add"); setMessage("");
    try {
      const nextOrder = sorted.length
        ? Math.max(...sorted.map((i) => i.sort_order ?? 0)) + 1
        : 0;
      await uploadAdminProductImage(productId, file, productName, nextOrder);
      await refresh();
      setMessage("Изображение добавлено.");
    } catch {
      setMessage("Не удалось загрузить изображение.");
    } finally {
      setBusy("");
      if (addRef.current) addRef.current.value = "";
    }
  };

  const saveMeta = async (image: AdminProductImage) => {
    const draft = draftFor(image);
    const order = Number(draft.order);
    if (!Number.isInteger(order) || order < 0) {
      setMessage("Порядок должен быть целым неотрицательным числом.");
      return;
    }
    setBusy(image.id); setMessage("");
    try {
      await updateAdminProductImage(productId, image.id, {
        altText: draft.alt.trim() || null,
        sortOrder: order,
      });
      await refresh();
      setMessage("Данные изображения сохранены.");
    } catch {
      setMessage("Не удалось сохранить данные изображения.");
    } finally { setBusy(""); }
  };

  const replace = async (image: AdminProductImage, file?: File) => {
    if (!file) return;
    const draft = draftFor(image);
    const order = Number(draft.order);
    setBusy(image.id); setMessage("");
    try {
      await replaceAdminProductImage(
        productId, image.id, file,
        draft.alt.trim() || null,
        Number.isInteger(order) && order >= 0 ? order : image.sort_order ?? 0,
      );
      await refresh();
      setMessage("Изображение заменено.");
    } catch {
      setMessage("Не удалось заменить изображение.");
    } finally {
      setBusy("");
      const input = replaceRefs.current[image.id];
      if (input) input.value = "";
    }
  };

  const remove = async (image: AdminProductImage) => {
    if (!window.confirm("Удалить это изображение товара?")) return;
    setBusy(image.id); setMessage("");
    try {
      await deleteAdminProductImage(productId, image.id);
      await refresh();
      setMessage("Изображение удалено.");
    } catch {
      setMessage("Не удалось удалить изображение.");
    } finally { setBusy(""); }
  };

  return (
    <section className="admin-editor-card admin-editor-card-wide admin-images-editor">
      <div className="admin-editor-section-heading admin-images-heading">
        <div>
          <h2>Изображения товара</h2>
          <p>Первым показывается изображение с наименьшим значением порядка. JPEG, PNG или WEBP, до 10 МБ.</p>
        </div>
        <button
          className="admin-secondary-button"
          type="button"
          disabled={Boolean(busy)}
          onClick={() => addRef.current?.click()}
        >
          <ImagePlus size={18} />
          {busy === "add" ? "Загрузка…" : "Добавить фото"}
        </button>
        <input
          ref={addRef}
          className="admin-hidden-file-input"
          type="file"
          accept="image/jpeg,image/png,image/webp"
          onChange={(e) => void add(e.target.files?.[0])}
        />
      </div>

      {message ? <div className="admin-image-message">{message}</div> : null}

      {!sorted.length ? (
        <div className="admin-images-empty">У товара пока нет изображений.</div>
      ) : (
        <div className="admin-images-grid">
          {sorted.map((image, index) => {
            const draft = draftFor(image);
            return (
              <article className="admin-image-card" key={image.id}>
                <div className="admin-image-preview">
                  {imageUrl(image) ? (
                    <img src={imageUrl(image)} alt={imageAlt(image) || productName} />
                  ) : (
                    <span>Нет изображения</span>
                  )}
                  {index === 0 ? <strong className="admin-image-main-badge">Главное</strong> : null}
                </div>

                <div className="admin-image-fields">
                  <label className="admin-field">
                    <span>Alt</span>
                    <input
                      value={draft.alt}
                      maxLength={500}
                      onChange={(e) => setDraft(image, "alt", e.target.value)}
                    />
                  </label>
                  <label className="admin-field">
                    <span>Порядок</span>
                    <input
                      type="number"
                      min={0}
                      step={1}
                      value={draft.order}
                      onChange={(e) => setDraft(image, "order", e.target.value)}
                    />
                  </label>
                </div>

                <div className="admin-image-actions">
                  <button
                    className="admin-secondary-button"
                    type="button"
                    disabled={Boolean(busy)}
                    onClick={() => void saveMeta(image)}
                  >
                    <Save size={16} /> Сохранить
                  </button>
                  <button
                    className="admin-secondary-button"
                    type="button"
                    disabled={Boolean(busy)}
                    onClick={() => replaceRefs.current[image.id]?.click()}
                  >
                    <RefreshCw size={16} /> Заменить
                  </button>
                  <input
                    ref={(node) => { replaceRefs.current[image.id] = node; }}
                    className="admin-hidden-file-input"
                    type="file"
                    accept="image/jpeg,image/png,image/webp"
                    onChange={(e) => void replace(image, e.target.files?.[0])}
                  />
                  <button
                    className="admin-danger-button"
                    type="button"
                    disabled={Boolean(busy)}
                    onClick={() => void remove(image)}
                  >
                    <Trash2 size={16} /> Удалить
                  </button>
                </div>
              </article>
            );
          })}
        </div>
      )}
    </section>
  );
}
