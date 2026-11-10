import { useEffect, useMemo, useRef, useState } from "react";
import "./yandex-pickup-map.css";

export type PickupPoint = {
  id: string;
  name: string;
  address: string;
  city?: string;
  latitude?: number | null;
  longitude?: number | null;
  availableForDropoff?: boolean;
};

type Props = {
  points: PickupPoint[];
  selectedId: string;
  onSelect: (point: PickupPoint) => void;
  title?: string;
};

type YMap = any;

declare global {
  interface Window {
    ymaps?: any;
  }
}

let mapsScript: Promise<void> | null = null;

function loadMaps(key: string): Promise<void> {
  if (window.ymaps) {
    return new Promise(resolve => window.ymaps!.ready(resolve));
  }

  if (!mapsScript) {
    mapsScript = new Promise<void>((resolve, reject) => {
      const script = document.createElement("script");
      script.src =
        `https://api-maps.yandex.ru/2.1/?apikey=${encodeURIComponent(key)}&lang=ru_RU`;
      script.async = true;
      script.onload = () =>
        window.ymaps
          ? window.ymaps.ready(resolve)
          : reject(new Error("Яндекс Карты не загрузились"));
      script.onerror = () => reject(new Error("Не удалось загрузить Яндекс Карты"));
      document.head.appendChild(script);
    }).catch(error => {
      mapsScript = null;
      throw error;
    });
  }

  return mapsScript;
}

const SPB_CENTER = [59.9386, 30.3141];

function coordinates(p: PickupPoint): number[] | null {
  const lat = Number(p.latitude);
  const lon = Number(p.longitude);
  return Number.isFinite(lat) && Number.isFinite(lon) &&
    lat >= -90 && lat <= 90 && lon >= -180 && lon <= 180 &&
    lat !== 0 && lon !== 0
    ? [lat, lon]
    : null;
}

export default function YandexPickupMap({
  points,
  selectedId,
  onSelect,
  title = "Выбор пункта выдачи"
}: Props) {
  const node = useRef<HTMLDivElement>(null);
  const mapRef = useRef<YMap>(null);
  const clusterRef = useRef<YMap>(null);
  const onSelectRef = useRef(onSelect);
  const pointsRef = useRef(points);
  const selectedRef = useRef(selectedId);
  const updateRef = useRef<() => void>(() => {});
  const [ready, setReady] = useState(false);
  const [error, setError] = useState("");
  const [filter, setFilter] = useState("");
  const [listLimit, setListLimit] = useState(100);

  onSelectRef.current = onSelect;
  pointsRef.current = points;
  selectedRef.current = selectedId;

  const key = import.meta.env.VITE_YANDEX_MAPS_API_KEY as string | undefined;

  const visible = useMemo(() => {
    const q = filter.trim().toLocaleLowerCase("ru");
    return q
      ? points.filter(p =>
          `${p.name} ${p.address}`.toLocaleLowerCase("ru").includes(q)
        )
      : points;
  }, [points, filter]);

  useEffect(() => { setListLimit(100); }, [filter, points]);

  const visibleRef = useRef(visible);
  visibleRef.current = visible;

  useEffect(() => {
    let cancelled = false;

    if (!key) {
      setError("Не настроен ключ Яндекс Карт");
      return;
    }

    void loadMaps(key).then(() => {
      if (cancelled || !node.current || !window.ymaps) return;

      const ymaps = window.ymaps;

      const map = new ymaps.Map(
        node.current,
        {
          center: SPB_CENTER,
          zoom: 11,
          controls: ["zoomControl"]
        },
        { suppressMapOpenBlock: false }
      );

      mapRef.current = map;

      const clusterer = new ymaps.Clusterer({
        preset: "islands#blueClusterIcons",
        groupByCoordinates: false,
        clusterDisableClickZoom: false,
        clusterOpenBalloonOnClick: false
      });

      clusterRef.current = clusterer;
      map.geoObjects.add(clusterer);

      let updateTimer: ReturnType<typeof setTimeout> | null = null;

      const updateMarkers = () => {
        if (cancelled || !mapRef.current || !clusterRef.current) return;

        const bounds = map.getBounds();
        if (!bounds) return;

        const selected = selectedRef.current;
        const matches = visibleRef.current.filter(p => {
          const c = coordinates(p);
          if (!c) return false;
          return c[0] >= bounds[0][0] - 0.15 &&
            c[0] <= bounds[1][0] + 0.15 &&
            c[1] >= bounds[0][1] - 0.2 &&
            c[1] <= bounds[1][1] + 0.2;
        });

        const limited = matches;
        const selectedPoint = visibleRef.current.find(p => p.id === selected);

        if (selectedPoint && !limited.some(p => p.id === selectedPoint.id)) {
          limited.push(selectedPoint);
        }

        const markers = limited.flatMap(p => {
          const c = coordinates(p);
          if (!c) return [];

          const marker = new ymaps.Placemark(
            c,
            {
              hintContent: p.name,
              balloonContentHeader: p.name,
              balloonContentBody: p.address
            },
            {
              preset: p.id === selected
                ? "islands#redIcon"
                : "islands#blueIcon"
            }
          );

          marker.events.add("click", () => onSelectRef.current(p));
          return [marker];
        });

        clusterer.removeAll();
        clusterer.add(markers);
      };

      updateRef.current = () => {
        if (updateTimer) clearTimeout(updateTimer);
        updateTimer = setTimeout(updateMarkers, 120);
      };

      map.events.add("boundschange", updateRef.current);

      updateMarkers();
      setReady(true);

      return undefined;
    }).catch(e => {
      if (!cancelled) {
        setError(e instanceof Error ? e.message : "Ошибка карты");
      }
    });

    return () => {
      cancelled = true;
      updateRef.current = () => {};
      clusterRef.current = null;
      if (mapRef.current) {
        mapRef.current.destroy();
        mapRef.current = null;
      }
    };
  }, [key]);

  useEffect(() => {
    if (ready) updateRef.current();
  }, [ready, visible, selectedId]);

  const selected = points.find(p => p.id === selectedId);

  const choosePoint = (p: PickupPoint) => {
    onSelect(p);
    const c = coordinates(p);
    if (mapRef.current && c) {
      mapRef.current.setCenter(c, 15);
    }
  };

  return (
    <div className="yandex-pickup-picker">
      <label className="yandex-pickup-search">
        {title}
        <input
          type="search"
          value={filter}
          onChange={e => setFilter(e.target.value)}
          placeholder="Поиск по названию или адресу"
        />
      </label>

      {error
        ? <p role="alert">{error}</p>
        : <div
            ref={node}
            className="yandex-pickup-map"
            aria-label="Интерактивная карта пунктов выдачи"
          />
      }

      <div
        className="yandex-pickup-list"
        role="listbox"
        aria-label="Пункты выдачи"
      >
        {visible.slice(0, listLimit).map(p => (
          <button
            type="button"
            role="option"
            aria-selected={selectedId === p.id}
            className={selectedId === p.id ? "is-selected" : ""}
            key={p.id}
            onClick={() => choosePoint(p)}
          >
            <strong>{p.name}</strong>
            <span>{p.address}</span>
          </button>
        ))}

        {visible.length > listLimit && (
          <button type="button" onClick={() => setListLimit(current => current + 100)}>
            Показать ещё 100 пунктов (всего {visible.length})
          </button>
        )}
        {!visible.length && <p>Подходящих пунктов нет.</p>}
      </div>

      {selected && (
        <div className="yandex-pickup-selected">
          <strong>Выбрано: {selected.name}</strong>
          <span>{selected.address}</span>
          <a
            href={`https://yandex.ru/maps/?pt=${encodeURIComponent(
              String(selected.longitude)
            )},${encodeURIComponent(String(selected.latitude))}&z=16`}
            target="_blank"
            rel="noopener noreferrer"
          >
            Открыть в Картах
          </a>
        </div>
      )}
    </div>
  );
}
