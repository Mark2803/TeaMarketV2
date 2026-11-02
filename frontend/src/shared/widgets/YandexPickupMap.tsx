import { useEffect, useMemo, useRef, useState } from "react";
import "./yandex-pickup-map.css";

export type PickupPoint = { id: string; name: string; address: string; city?: string; latitude?: number | null; longitude?: number | null; availableForDropoff?: boolean };
type Props = { points: PickupPoint[]; selectedId: string; onSelect: (point: PickupPoint) => void; title?: string };
type MapApi = { Map: new (node: HTMLElement, state: object, options?: object) => any; Placemark: new (coords: number[], properties: object, options?: object) => any; geoObject: unknown };
declare global { interface Window { ymaps?: { ready: (callback: () => void) => void; Map: MapApi["Map"]; Placemark: MapApi["Placemark"] } } }
let mapsScript: Promise<void> | null = null;
function loadMaps(key: string): Promise<void> {
  if (window.ymaps) return Promise.resolve();
  if (!mapsScript) mapsScript = new Promise<void>((resolve, reject) => {
    const script = document.createElement("script");
    script.src = `https://api-maps.yandex.ru/2.1/?apikey=${encodeURIComponent(key)}&lang=ru_RU`;
    script.async = true;
    script.onload = () => window.ymaps ? window.ymaps.ready(resolve) : reject(new Error("Яндекс Карты не загрузились"));
    script.onerror = () => reject(new Error("Не удалось загрузить Яндекс Карты"));
    document.head.appendChild(script);
  }).catch(error => { mapsScript = null; throw error; });
  return mapsScript;
}
export default function YandexPickupMap({ points, selectedId, onSelect, title = "Выбор пункта выдачи" }: Props) {
  const node = useRef<HTMLDivElement>(null);
  const mapRef = useRef<any>(null);
  const onSelectRef = useRef(onSelect);
  onSelectRef.current = onSelect;
  const [error, setError] = useState("");
  const [filter, setFilter] = useState("");
  const key = import.meta.env.VITE_YANDEX_MAPS_API_KEY as string | undefined;
  const visible = useMemo(() => points.filter(p => `${p.name} ${p.address}`.toLocaleLowerCase("ru").includes(filter.toLocaleLowerCase("ru"))), [points, filter]);
  useEffect(() => {
    let cancelled = false;
    if (!key) { setError("Добавьте VITE_YANDEX_MAPS_API_KEY в frontend/.env и перезапустите Vite"); return; }
    void loadMaps(key).then(() => {
      if (cancelled || !node.current || !window.ymaps) return;
      const coords = points.find(p => Number.isFinite(Number(p.latitude)) && Number.isFinite(Number(p.longitude)));
      const center = coords ? [Number(coords.latitude), Number(coords.longitude)] : [55.751244, 37.618423];
      const map = new window.ymaps.Map(node.current, { center, zoom: 10, controls: ["zoomControl", "geolocationControl"] }, { suppressMapOpenBlock: false });
      mapRef.current = map;
      const bounds: number[][] = [];
      points.forEach(p => {
        const lat = Number(p.latitude), lon = Number(p.longitude);
        if (!Number.isFinite(lat) || !Number.isFinite(lon) || !lat || !lon) return;
        bounds.push([lat, lon]);
        const marker = new window.ymaps!.Placemark([lat, lon], { hintContent: p.name, balloonContentHeader: p.name, balloonContentBody: p.address }, { preset: p.id === selectedId ? "islands#redIcon" : "islands#blueIcon" });
        marker.events.add("click", () => onSelectRef.current(p));
        map.geoObjects.add(marker);
      });
      if (bounds.length > 1) map.setBounds(map.geoObjects.getBounds(), { checkZoomRange: true, zoomMargin: 35 });
      if (map.getZoom() > 13) map.setZoom(13);
    }).catch(e => { if (!cancelled) setError(e instanceof Error ? e.message : "Ошибка карты"); });
    return () => { cancelled = true; mapRef.current?.destroy(); mapRef.current = null; };
  }, [key, points, selectedId]);
  const selected = points.find(p => p.id === selectedId);
  return <div className="yandex-pickup-picker">
    <label className="yandex-pickup-search">{title}<input type="search" value={filter} onChange={e => setFilter(e.target.value)} placeholder="Поиск по названию или адресу" /></label>
    {error ? <p role="alert">{error}</p> : <div ref={node} className="yandex-pickup-map" aria-label="Интерактивная карта пунктов выдачи" />}
    <div className="yandex-pickup-list" role="listbox" aria-label="Пункты выдачи">
      {visible.slice(0, 100).map(p => <button type="button" role="option" aria-selected={selectedId === p.id} className={selectedId === p.id ? "is-selected" : ""} key={p.id} onClick={() => { onSelect(p); if (mapRef.current && p.latitude && p.longitude) mapRef.current.setCenter([Number(p.latitude), Number(p.longitude)], 15); }}><strong>{p.name}</strong><span>{p.address}</span></button>)}
      {!visible.length && <p>Подходящих пунктов нет.</p>}
    </div>
    {selected && <div className="yandex-pickup-selected"><strong>Выбрано: {selected.name}</strong><span>{selected.address}</span><a href={`https://yandex.ru/maps/?pt=${encodeURIComponent(String(selected.longitude))},${encodeURIComponent(String(selected.latitude))}&z=16`} target="_blank" rel="noopener noreferrer">Открыть в Картах</a></div>}
    <a className="yandex-pickup-open" href="https://yandex.ru/maps/" target="_blank" rel="noopener noreferrer">Открыть в Картах</a>
  </div>;
}
