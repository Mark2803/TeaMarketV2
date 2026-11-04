import { Children, useCallback, useEffect, useRef, useState } from "react";
import type { CSSProperties, PointerEvent, ReactNode, WheelEvent } from "react";
import "../../../shared/styles/home-mobile-drum.css";

type Props = { children: ReactNode; className: string; label: string };
type Point = { x: number; y: number; pointerId: number };

export default function HomeMobileDrum({ children, className, label }: Props) {
  const slides = Children.toArray(children);
  const count = slides.length;
  const [active, setActive] = useState(0);
  const start = useRef<Point | null>(null);
  const dragged = useRef(false);
  const lastWheel = useRef(0);

  const move = useCallback((delta: number) => {
    if (count > 1) setActive((index) => (index + delta + count) % count);
  }, [count]);

  useEffect(() => {
    setActive((index) => count ? index % count : 0);
  }, [count]);

  const onPointerDown = (event: PointerEvent<HTMLDivElement>) => {
    if (event.pointerType === "mouse" && event.button !== 0) return;
    start.current = { x: event.clientX, y: event.clientY, pointerId: event.pointerId };
    dragged.current = false;
  };

  const onPointerUp = (event: PointerEvent<HTMLDivElement>) => {
    const point = start.current;
    if (!point || point.pointerId !== event.pointerId) return;
    start.current = null;
    const dx = event.clientX - point.x;
    const dy = event.clientY - point.y;
    if (Math.abs(dx) >= 35 && Math.abs(dx) > Math.abs(dy) * 1.2) {
      dragged.current = true;
      move(dx < 0 ? 1 : -1);
    }
  };

  const onWheel = (event: WheelEvent<HTMLDivElement>) => {
    if (window.matchMedia("(min-width: 42.001rem)").matches) return;
    if (count < 2 || Math.abs(event.deltaX) < 8 || Math.abs(event.deltaX) <= Math.abs(event.deltaY)) return;
    event.preventDefault();
    const now = Date.now();
    if (now - lastWheel.current < 360) return;
    lastWheel.current = now;
    move(event.deltaX > 0 ? 1 : -1);
  };

  return (
    <div
      className={`home-mobile-drum ${className}`}
      aria-label={label}
      onPointerDown={onPointerDown}
      onPointerUp={onPointerUp}
      onPointerCancel={() => { start.current = null; }}
      onWheel={onWheel}
      onClickCapture={(event) => {
        if (dragged.current) {
          event.preventDefault();
          event.stopPropagation();
          dragged.current = false;
        }
      }}
    >
      {slides.map((slide, index) => {
        let offset = ((index - active) % count + count) % count;
        if (offset > count / 2) offset -= count;
        // For an even count, keep the opposite card out of view.
        const visible = Math.abs(offset) <= 1;
        return (
          <div
            key={index}
            className={`home-mobile-drum__slide${offset === 0 ? " home-mobile-drum__slide--active" : ""}`}
            style={{ "--drum-offset": offset, "--drum-scale": offset === 0 ? 1 : 0.86 } as CSSProperties}
            aria-hidden={!visible || offset !== 0}
            onClickCapture={(event) => {
              if (offset !== 0) {
                event.preventDefault();
                event.stopPropagation();
                move(offset > 0 ? 1 : -1);
              }
            }}
          >
            {slide}
          </div>
        );
      })}
    </div>
  );
}
