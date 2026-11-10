import { useEffect, useRef, useState } from "react";
import type { PointerEvent as ReactPointerEvent } from "react";
import "./admin-image-cropper.css";

type Props = { file: File; onCancel: () => void; onApply: (file: File) => Promise<void> | void };
const SIZE = 1200;

export default function AdminImageCropper({ file, onCancel, onApply }: Props) {
  const [src, setSrc] = useState("");
  const [dimensions, setDimensions] = useState({ w: 0, h: 0 });
  const [crop, setCrop] = useState({ x: 0, y: 0, size: 0 });
  const [working, setWorking] = useState(false);
  const [error, setError] = useState("");
  const imageRef = useRef<HTMLImageElement>(null);
  const drag = useRef<{ x: number; y: number; cropX: number; cropY: number } | null>(null);

  useEffect(() => {
    const url = URL.createObjectURL(file);
    setSrc(url);
    return () => URL.revokeObjectURL(url);
  }, [file]);

  const onLoad = () => {
    const image = imageRef.current;
    if (!image) return;
    const w = image.naturalWidth, h = image.naturalHeight;
    const size = Math.min(w, h);
    setDimensions({ w, h });
    setCrop({ x: (w - size) / 2, y: (h - size) / 2, size });
  };

  const move = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (!drag.current || !imageRef.current) return;
    const rect = imageRef.current.getBoundingClientRect();
    if (!rect.width || !rect.height) return;
    const dx = (event.clientX - drag.current.x) * dimensions.w / rect.width;
    const dy = (event.clientY - drag.current.y) * dimensions.h / rect.height;
    const x = Math.max(0, Math.min(dimensions.w - crop.size, drag.current.cropX + dx));
    const y = Math.max(0, Math.min(dimensions.h - crop.size, drag.current.cropY + dy));
    setCrop(current => ({ ...current, x, y }));
  };

  const save = async () => {
    const image = imageRef.current;
    if (!image || !dimensions.w || !crop.size || working) return;
    setWorking(true); setError("");
    try {
      const canvas = document.createElement("canvas");
      canvas.width = SIZE; canvas.height = SIZE;
      const context = canvas.getContext("2d");
      if (!context) throw new Error("Не удалось создать изображение");
      context.imageSmoothingEnabled = true;
      context.imageSmoothingQuality = "high";
      context.drawImage(image, crop.x, crop.y, crop.size, crop.size, 0, 0, SIZE, SIZE);
      const blob = await new Promise<Blob>((resolve, reject) => {
        canvas.toBlob(result => result ? resolve(result) : reject(new Error("Ошибка кодирования WebP")), "image/webp", 0.85);
      });
      if (blob.type !== "image/webp") throw new Error("Браузер не поддерживает WebP");
      const name = file.name.replace(/\.[^.]+$/, "") + ".webp";
      await onApply(new File([blob], name, { type: "image/webp" }));
    } catch (e) {
      setError(e instanceof Error ? e.message : "Не удалось обработать изображение");
    } finally { setWorking(false); }
  };

  const left = dimensions.w ? crop.x / dimensions.w * 100 : 0;
  const top = dimensions.h ? crop.y / dimensions.h * 100 : 0;
  const width = dimensions.w ? crop.size / dimensions.w * 100 : 0;
  const height = dimensions.h ? crop.size / dimensions.h * 100 : 0;

  return (
    <div className="tea-crop-overlay" role="presentation" onPointerDown={e => e.stopPropagation()}>
      <div className="tea-crop-dialog" role="dialog" aria-modal="true" aria-label="Кадрирование фотографии">
        <h2>Кадрирование фотографии</h2>
        <p>Перемещайте квадратную рамку по изображению. Формат фотографии товара — 1:1.</p>
        <div className="tea-crop-stage">
          <img ref={imageRef} src={src} onLoad={onLoad} alt="Исходное изображение" draggable={false} />
          {dimensions.w > 0 && (
            <div className="tea-crop-box" style={{ left: `${left}%`, top: `${top}%`, width: `${width}%`, height: `${height}%` }}
              onPointerDown={e => { e.preventDefault(); e.currentTarget.setPointerCapture(e.pointerId); drag.current = { x: e.clientX, y: e.clientY, cropX: crop.x, cropY: crop.y }; }}
              onPointerMove={move}
              onPointerUp={e => { drag.current = null; if (e.currentTarget.hasPointerCapture(e.pointerId)) e.currentTarget.releasePointerCapture(e.pointerId); }}
              onPointerCancel={() => { drag.current = null; }}
            ><span className="tea-crop-crosshair">+</span></div>
          )}
        </div>
        {error && <p className="tea-crop-error" role="alert">{error}</p>}
        <div className="tea-crop-actions">
          <button type="button" onClick={onCancel} disabled={working}>Отмена</button>
          <button type="button" onClick={() => void save()} disabled={working || !dimensions.w}>{working ? "Загрузка…" : "Применить"}</button>
        </div>
      </div>
    </div>
  );
}
