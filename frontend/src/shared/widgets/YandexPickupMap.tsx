import { useDeferredValue, useEffect, useMemo, useRef, useState } from "react";
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
  /** Растянуть на всю доступную высоту (для полноэкранного окна выбора). */
  fill?: boolean;
};

// API Яндекс Карт 2.1 не поставляет типы для TypeScript.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type YandexApi = any;

declare global {
  interface Window {
    ymaps?: YandexApi;
  }
}

let mapsScript: Promise<void> | null = null;

function loadMaps(key: string): Promise<void> {
  if (window.ymaps) {
    return new Promise(resolve => window.ymaps.ready(resolve));
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
const DEFAULT_PRESET = "islands#blueDotIcon";
const SELECTED_PRESET = "islands#redDotIcon";

function coordinates(p: PickupPoint): number[] | null {
  const lat = Number(p.latitude);
  const lon = Number(p.longitude);
  return Number.isFinite(lat) && Number.isFinite(lon) &&
    lat >= -90 && lat <= 90 && lon >= -180 && lon <= 180 &&
    lat !== 0 && lon !== 0
    ? [lat, lon]
    : null;
}

/**
 * Карта ПВЗ Яндекс Доставки.
 *
 * Метки выводятся через ObjectManager: он сам рисует только видимые точки
 * и объединяет их в кластеры, поэтому карта не тормозит даже на десятках
 * тысяч пунктов. Размер карты подстраивается под окно (ResizeObserver).
 */
export default function YandexPickupMap({
  points,
  selectedId,
  onSelect,
  title = "Выбор пункта выдачи",
  fill = false
}: Props) {
  const node = useRef<HTMLDivElement>(null);
  const mapRef = useRef<YandexApi>(null);
  const managerRef = useRef<YandexApi>(null);
  const onSelectRef = useRef(onSelect);
  const pointsByIdRef = useRef(new Map<string, PickupPoint>());
  const shownSelectedRef = useRef("");
  const [ready, setReady] = useState(false);
  const [error, setError] = useState("");
  const [filter, setFilter] = useState("");
  const [listLimit, setListLimit] = useState(100);
  const deferredFilter = useDeferredValue(filter);

  onSelectRef.current = onSelect;

  const key = import.meta.env.VITE_YANDEX_MAPS_API_KEY as string | undefined;

  const pointsById = useMemo(() => new Map(points.map(p => [p.id, p])), [points]);
  pointsByIdRef.current = pointsById;

  const visible = useMemo(() => {
    const q = deferredFilter.trim().toLocaleLowerCase("ru");
    return q
      ? points.filter(p =>
          `${p.name} ${p.address}`.toLocaleLowerCase("ru").includes(q)
        )
      : points;
  }, [points, deferredFilter]);

  useEffect(() => { setListLimit(100); }, [deferredFilter, points]);

  // Создание карты — один раз за время показа окна.
  useEffect(() => {
    let cancelled = false;
    let resizeObserver: ResizeObserver | null = null;

    if (!key) {
      setError("Не настроен ключ Яндекс Карт");
      return;
    }

    void loadMaps(key).then(() => {
      if (cancelled || !node.current || !window.ymaps) return;

      const ymaps = window.ymaps;
      const selectedPoint = pointsByIdRef.current.get(selectedId);
      const selectedCoords = selectedPoint ? coordinates(selectedPoint) : null;

      const map = new ymaps.Map(
        node.current,
        {
          center: selectedCoords ?? SPB_CENTER,
          zoom: selectedCoords ? 15 : 11,
          controls: ["zoomControl", "geolocationControl"]
        },
        { suppressMapOpenBlock: true }
      );
      mapRef.current = map;

      const manager = new ymaps.ObjectManager({
        clusterize: true,
        gridSize: 64,
        clusterDisableClickZoom: false
      });
      manager.objects.options.set({ preset: DEFAULT_PRESET, hasBalloon: false });
      manager.clusters.options.set({ preset: "islands#blueClusterIcons", hasBalloon: false });
      manager.objects.events.add("click", (event: YandexApi) => {
        const point = pointsByIdRef.current.get(String(event.get("objectId")));
        if (point) onSelectRef.current(point);
      });
      map.geoObjects.add(manager);
      managerRef.current = manager;

      // Карта должна занимать весь контейнер, даже если окно поменяло размер
      // (поворот телефона, анимация открытия, изменение окна браузера).
      resizeObserver = new ResizeObserver(() => map.container.fitToViewport());
      resizeObserver.observe(node.current);

      // Без выбранного пункта показываем город покупателя (по IP, без запроса разрешения).
      if (!selectedCoords) {
        ymaps.geolocation
          .get({ provider: "yandex", mapStateAutoApply: false })
          .then((result: YandexApi) => {
            if (cancelled || !mapRef.current) return;
            const coords = result.geoObjects.get(0)?.geometry.getCoordinates();
            if (coords) mapRef.current.setCenter(coords, 11);
          })
          .catch(() => { /* Город не определился — остаёмся в Санкт-Петербурге. */ });
      }

      setReady(true);
    }).catch(e => {
      if (!cancelled) {
        setError(e instanceof Error ? e.message : "Ошибка карты");
      }
    });

    return () => {
      cancelled = true;
      resizeObserver?.disconnect();
      managerRef.current = null;
      shownSelectedRef.current = "";
      if (mapRef.current) {
        mapRef.current.destroy();
        mapRef.current = null;
      }
    };
    // Карта создаётся заново только при смене ключа; точки и выбор обновляются ниже.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);

  // Метки: передаём найденные точки целиком, ObjectManager сам решает, что рисовать.
  useEffect(() => {
    const manager = managerRef.current;
    if (!ready || !manager) return;

    const features = visible.flatMap(p => {
      const c = coordinates(p);
      return c ? [{
        type: "Feature",
        id: p.id,
        geometry: { type: "Point", coordinates: c },
        properties: { hintContent: `${p.name}<br>${p.address}` },
        options: p.id === selectedId ? { preset: SELECTED_PRESET } : {}
      }] : [];
    });

    manager.removeAll();
    manager.add({ type: "FeatureCollection", features });
    shownSelectedRef.current = selectedId;

    // При поиске показываем найденные пункты целиком.
    if (deferredFilter.trim() && features.length) {
      const bounds = manager.getBounds();
      if (bounds) mapRef.current?.setBounds(bounds, { checkZoomRange: true, zoomMargin: 40 });
    }
    // selectedId обрабатывается отдельным эффектом, чтобы не пересобирать все метки.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ready, visible]);

  // Подсветка выбранного пункта без пересборки всех меток.
  useEffect(() => {
    const manager = managerRef.current;
    if (!ready || !manager) return;
    const previous = shownSelectedRef.current;
    if (previous && previous !== selectedId && manager.objects.getById(previous)) {
      manager.objects.setObjectOptions(previous, { preset: DEFAULT_PRESET });
    }
    if (selectedId && manager.objects.getById(selectedId)) {
      manager.objects.setObjectOptions(selectedId, { preset: SELECTED_PRESET });
    }
    shownSelectedRef.current = selectedId;
  }, [ready, selectedId]);

  const selected = pointsById.get(selectedId);

  const choosePoint = (p: PickupPoint) => {
    onSelect(p);
    const c = coordinates(p);
    if (mapRef.current && c) {
      mapRef.current.setCenter(c, 16, { duration: 300 });
    }
  };

  return (
    <div className={`yandex-pickup-picker${fill ? " yandex-pickup-picker--fill" : ""}`}>
      <div className="yandex-pickup-side">
        <label className="yandex-pickup-search">
          {title}
          <input
            type="search"
            value={filter}
            onChange={e => setFilter(e.target.value)}
            placeholder="Город, улица или название пункта"
          />
        </label>

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

      {error
        ? <div role="alert" className="yandex-pickup-map-error">
            <strong>{error}</strong>
            <p>Пункт можно выбрать из списка — поиск по городу или улице работает и без карты.
              Если карта не открывается, проверьте блокировщик рекламы или VPN в браузере.</p>
          </div>
        : <div
            ref={node}
            className="yandex-pickup-map"
            aria-label="Интерактивная карта пунктов выдачи"
          />
      }
    </div>
  );
}
