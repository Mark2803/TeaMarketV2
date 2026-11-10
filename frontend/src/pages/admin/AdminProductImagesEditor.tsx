import { ImagePlus, RefreshCw, Trash2, GripVertical } from "lucide-react";
import { forwardRef, useEffect, useImperativeHandle, useRef, useState } from "react";
import {
  deleteAdminProductImage,
  replaceAdminProductImage,
  updateAdminProductImage,
  uploadAdminProductImage,
} from "../../shared/api/admin";
import type { AdminProductImage } from "../../shared/api/admin";

export type ProductImagesEditorHandle = { save: () => Promise<void> };
type Props = {
  productId: string;
  images: AdminProductImage[];
  productName: string;
  onChanged: () => Promise<void> | void;
};
const imageUrl = (image: AdminProductImage) => image.url || image.image_url || "";
const imageAlt = (image: AdminProductImage) => image.alt_text ?? image.alt ?? "";
const ordered = (images: AdminProductImage[]) => [...images].sort((a, b) =>
  (a.sort_order ?? 0) - (b.sort_order ?? 0) || a.id.localeCompare(b.id));

const AdminProductImagesEditor = forwardRef<ProductImagesEditorHandle, Props>(function AdminProductImagesEditor(
  { productId, images, productName, onChanged }, ref,
) {
  const [items, setItems] = useState(() => ordered(images));
  const [alts, setAlts] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const addRef = useRef<HTMLInputElement>(null);
  const replaceRefs = useRef<Record<string, HTMLInputElement | null>>({});
  const dragId = useRef<string | null>(null);
  const pointerId = useRef<string | null>(null);
  const itemsRef = useRef(items);
  const altsRef = useRef(alts);
  itemsRef.current = items;
  altsRef.current = alts;

  useEffect(() => {
    setItems(ordered(images));
    setAlts({});
  }, [images]);

  const move = (fromId: string, toId: string) => {
    if (fromId === toId) return;
    setItems((old) => {
      const from = old.findIndex((item) => item.id === fromId);
      const to = old.findIndex((item) => item.id === toId);
      if (from < 0 || to < 0) return old;
      const next = [...old];
      next.splice(to, 0, next.splice(from, 1)[0]);
      return next;
    });
    setMessage("");
  };

  useImperativeHandle(ref, () => ({
    async save() {
      const current = itemsRef.current;
      const currentAlts = altsRef.current;
      // Each image receives a unique sequential position, including images that were not moved.
      for (let index = 0; index < current.length; index++) {
        const image = current[index];
        const alt = (currentAlts[image.id] ?? imageAlt(image)).trim();
        if (image.sort_order !== index || alt !== imageAlt(image)) {
          await updateAdminProductImage(productId, image.id, {
            altText: alt || null,
            sortOrder: index,
          });
        }
      }
    },
  }), [productId]);

  const upload = async (file?: File) => {
    if (!file) return;
    setBusy(true); setMessage("");
    try {
      await uploadAdminProductImage(productId, file, productName, itemsRef.current.length);
      await onChanged();
      setMessage("Фотография добавлена.");
    } catch { setMessage("Не удалось загрузить фотографию."); }
    finally { setBusy(false); if (addRef.current) addRef.current.value = ""; }
  };

  const replace = async (image: AdminProductImage, file?: File) => {
    if (!file) return;
    setBusy(true); setMessage("");
    try {
      await replaceAdminProductImage(productId, image.id, file,
        (altsRef.current[image.id] ?? imageAlt(image)).trim() || null,
        itemsRef.current.findIndex((item) => item.id === image.id));
      await onChanged();
      setMessage("Фотография заменена.");
    } catch { setMessage("Не удалось заменить фотографию."); }
    finally {
      setBusy(false);
      const input = replaceRefs.current[image.id];
      if (input) input.value = "";
    }
  };

  const remove = async (image: AdminProductImage) => {
    if (!window.confirm("Удалить это изображение товара?")) return;
    setBusy(true); setMessage("");
    try {
      await deleteAdminProductImage(productId, image.id);
      await onChanged();
      setMessage("Фотография удалена.");
    } catch { setMessage("Не удалось удалить фотографию."); }
    finally { setBusy(false); }
  };

  return (
    <section className="admin-editor-card admin-editor-card-wide admin-images-editor">
      <div className="admin-editor-section-heading admin-images-heading">
        <div>
          <h2>Изображения товара</h2>
          <p>Перетащите фотографию за значок перемещения. Первая фотография — главная. Порядок и Alt сохраняются общей кнопкой «Сохранить».</p>
        </div>
        <button className="admin-secondary-button" type="button" disabled={busy} onClick={() => addRef.current?.click()}>
          <ImagePlus size={18} /> Добавить фото
        </button>
        <input ref={addRef} className="admin-hidden-file-input" type="file" accept="image/jpeg,image/png,image/webp" onChange={(e) => void upload(e.target.files?.[0])} />
      </div>
      {message ? <div className="admin-image-message">{message}</div> : null}
      {!items.length ? <div className="admin-images-empty">У товара пока нет изображений.</div> : (
        <div className="admin-images-grid">
          {items.map((image, index) => (
            <article className="admin-image-card" key={image.id} data-image-id={image.id}
              onDragOver={(e) => { if (dragId.current) e.preventDefault(); }}
              onDrop={(e) => { e.preventDefault(); if (dragId.current) move(dragId.current, image.id); dragId.current = null; }}>
              <div className="admin-image-preview"
                  draggable={!busy}
                  onDragStart={(e) => {
                    dragId.current = image.id;
                    e.dataTransfer.effectAllowed = "move";
                    e.dataTransfer.setData("text/plain", image.id);
                  }}
                  onDragEnd={() => { dragId.current = null; }}
                  style={{ cursor: busy ? "default" : "grab" }}>
                {imageUrl(image) ? <img src={imageUrl(image)} alt={(alts[image.id] ?? imageAlt(image)) || productName} /> : <span>Нет изображения</span>}
                {index === 0 ? <strong className="admin-image-main-badge">Главное</strong> : null}
              </div>
              <div className="admin-image-fields">
                <label className="admin-field">
                  <span>Alt</span>
                  <input value={alts[image.id] ?? imageAlt(image)} maxLength={500}
                    onChange={(e) => setAlts((old) => ({ ...old, [image.id]: e.target.value }))} />
                </label>
              </div>
              <div className="admin-image-actions">
                <span draggable={!busy} aria-label="Перетащить фотографию" title="Перетащить фотографию"
                  style={{ cursor: "grab", touchAction: "none", display: "inline-flex", alignItems: "center", padding: 8 }}
                  onDragStart={(e) => { dragId.current = image.id; e.dataTransfer.effectAllowed = "move"; e.dataTransfer.setData("text/plain", image.id); }}
                  onDragEnd={() => { dragId.current = null; }}
                  onPointerDown={(e) => { if (e.pointerType === "touch") { pointerId.current = image.id; e.currentTarget.setPointerCapture(e.pointerId); } }}
                  onPointerUp={(e) => {
                    if (!pointerId.current) return;
                    const target = document.elementFromPoint(e.clientX, e.clientY)?.closest("[data-image-id]");
                    const toId = target?.getAttribute("data-image-id");
                    if (toId) move(pointerId.current, toId);
                    pointerId.current = null;
                  }}
                  onPointerCancel={() => { pointerId.current = null; }}>
                  <GripVertical size={20} />
                </span>
                <button className="admin-secondary-button" type="button" disabled={busy} onClick={() => replaceRefs.current[image.id]?.click()}>
                  <RefreshCw size={16} /> Заменить
                </button>
                <input ref={(node) => { replaceRefs.current[image.id] = node; }} className="admin-hidden-file-input"
                  type="file" accept="image/jpeg,image/png,image/webp" onChange={(e) => void replace(image, e.target.files?.[0])} />
                <button className="admin-danger-button" type="button" disabled={busy} onClick={() => void remove(image)}>
                  <Trash2 size={16} /> Удалить
                </button>
              </div>
            </article>
          ))}
        </div>
      )}
    </section>
  );
});
export default AdminProductImagesEditor;
