import { Children, useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import type { CSSProperties, PointerEvent, ReactNode } from "react";
import "../../../shared/styles/home-mobile-drum.css";

type Props = { children: ReactNode; className: string; label: string };
type Gesture = { id: number; x: number; y: number; previousX: number; previousTime: number; velocity: number; horizontal: boolean; vertical: boolean };
const clamp = (value: number, low: number, high: number) => Math.max(low, Math.min(high, value));

export default function HomeMobileDrum({ children, className, label }: Props) {
  const slides = Children.toArray(children);
  const count = slides.length;
  const [position, setPosition] = useState(0);
  const [dragging, setDragging] = useState(false);
  const positionRef = useRef(0);
  const targetRef = useRef(0);
  const animationRef = useRef<number | null>(null);
  const gestureRef = useRef<Gesture | null>(null);
  const suppressClickRef = useRef(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const wheelRef = useRef({ amount: 0, last: 0, lockedUntil: 0 });
  const countRef = useRef(count);
  countRef.current = count;

  // Desktop uses native, linear scrolling. Fifteen identical sets make the
  // circular boundary invisible; scroll position is recentered as needed.
  const desktopRef = useRef<HTMLDivElement>(null);
  const desktopDragRef = useRef<{ id: number; x: number; left: number; moved: boolean } | null>(null);
  const desktopSuppressClickRef = useRef(false);
  const desktopWidthRef = useRef(0);
  const desktopAdjustingRef = useRef(false);

  const measureDesktop = useCallback((reset = false) => {
    const node = desktopRef.current;
    if (!node || countRef.current < 1) return;
    const setWidth = node.scrollWidth / 15;
    if (setWidth <= 0) return;
    const previous = desktopWidthRef.current;
    desktopWidthRef.current = setWidth;
    if (reset || previous === 0) node.scrollLeft = setWidth * 7;
    else if (Math.abs(previous - setWidth) > 1) node.scrollLeft += (setWidth - previous) * 7;
  }, []);

  useLayoutEffect(() => {
    measureDesktop(true);
    const node = desktopRef.current;
    if (!node || typeof ResizeObserver === "undefined") return;
    const observer = new ResizeObserver(() => measureDesktop());
    observer.observe(node);
    return () => observer.disconnect();
  }, [count, measureDesktop]);

  const onDesktopScroll = () => {
    const node = desktopRef.current;
    const width = desktopWidthRef.current;
    if (!node || width <= 0 || desktopAdjustingRef.current) return;
    // Keep one full copy on either side, including during mouse dragging.
    if (node.scrollLeft < width * 6 || node.scrollLeft > width * 8) {
      const shift = node.scrollLeft < width * 6 ? width : -width;
      desktopAdjustingRef.current = true;
      node.scrollLeft += shift;
      if (desktopDragRef.current) desktopDragRef.current.left += shift;
      desktopAdjustingRef.current = false;
    }
  };

  const onDesktopPointerDown = (event: PointerEvent<HTMLDivElement>) => {
    if (event.pointerType !== "mouse" || event.button !== 0 || count < 1) return;
    const node = desktopRef.current;
    if (!node) return;
    desktopDragRef.current = { id: event.pointerId, x: event.clientX, left: node.scrollLeft, moved: false };
  };
  const onDesktopPointerMove = (event: PointerEvent<HTMLDivElement>) => {
    const drag = desktopDragRef.current;
    const node = desktopRef.current;
    if (!drag || !node || drag.id !== event.pointerId) return;
    if (!drag.moved && Math.abs(event.clientX - drag.x) > 5) {
      drag.moved = true;
      node.setPointerCapture(event.pointerId);
    }
    if (drag.moved) {
      node.scrollLeft = drag.left - (event.clientX - drag.x);
      desktopSuppressClickRef.current = true;
    }
  };
  const onDesktopPointerEnd = (event: PointerEvent<HTMLDivElement>) => {
    const drag = desktopDragRef.current;
    if (!drag || drag.id !== event.pointerId) return;
    desktopDragRef.current = null;
    if (drag.moved && event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }
  };

  const setVisualPosition = useCallback((next: number) => {
    positionRef.current = next;
    setPosition(next);
  }, []);
  const stopAnimation = useCallback(() => {
    if (animationRef.current !== null) cancelAnimationFrame(animationRef.current);
    animationRef.current = null;
  }, []);
  const settleTo = useCallback((target: number) => {
    stopAnimation();
    targetRef.current = target;
    let previous = performance.now();
    const frame = (now: number) => {
      const dt = Math.min(50, now - previous);
      previous = now;
      const alpha = 1 - Math.exp(-dt / 115);
      const next = positionRef.current + (targetRef.current - positionRef.current) * alpha;
      if (Math.abs(next - targetRef.current) < 0.002) {
        setVisualPosition(targetRef.current);
        animationRef.current = null;
      } else {
        setVisualPosition(next);
        animationRef.current = requestAnimationFrame(frame);
      }
    };
    animationRef.current = requestAnimationFrame(frame);
  }, [setVisualPosition, stopAnimation]);

  useEffect(() => () => stopAnimation(), [stopAnimation]);
  useEffect(() => {
    if (count < 2) {
      stopAnimation();
      setVisualPosition(0);
      targetRef.current = 0;
    }
  }, [count, setVisualPosition, stopAnimation]);
  const move = useCallback((delta: number) => {
    if (countRef.current < 2) return;
    settleTo(Math.round(targetRef.current) + delta);
  }, [settleTo]);

  useEffect(() => {
    const node = rootRef.current;
    if (!node) return;
    const onWheel = (event: WheelEvent) => {
      if (!window.matchMedia("(max-width: 42rem)").matches || countRef.current < 2) return;
      if (Math.abs(event.deltaX) <= Math.abs(event.deltaY) || Math.abs(event.deltaX) < 3) return;
      event.preventDefault();
      const now = performance.now();
      if (now - wheelRef.current.last > 240) wheelRef.current.amount = 0;
      wheelRef.current.last = now;
      if (now < wheelRef.current.lockedUntil) return;
      wheelRef.current.amount += event.deltaX;
      if (Math.abs(wheelRef.current.amount) >= 55) {
        const direction = Math.sign(wheelRef.current.amount);
        wheelRef.current.amount = 0;
        wheelRef.current.lockedUntil = now + 360;
        move(direction);
      }
    };
    node.addEventListener("wheel", onWheel, { passive: false });
    return () => node.removeEventListener("wheel", onWheel);
  }, [move]);

  const onPointerDown = (event: PointerEvent<HTMLDivElement>) => {
    if (event.pointerType === "mouse" && event.button !== 0) return;
    if (count < 2 || !window.matchMedia("(max-width: 42rem)").matches) return;
    const now = performance.now();
    gestureRef.current = { id: event.pointerId, x: event.clientX, y: event.clientY,
      previousX: event.clientX, previousTime: now, velocity: 0,
      horizontal: false, vertical: false };
    suppressClickRef.current = false;
  };
  const onPointerMove = (event: PointerEvent<HTMLDivElement>) => {
    const g = gestureRef.current;
    if (!g || g.id !== event.pointerId || g.vertical) return;
    const dx = event.clientX - g.x;
    const dy = event.clientY - g.y;
    if (!g.horizontal) {
      if (Math.abs(dy) > 10 && Math.abs(dy) > Math.abs(dx)) { g.vertical = true; return; }
      if (Math.abs(dx) < 8 || Math.abs(dx) < Math.abs(dy) * 1.25) return;
      g.horizontal = true;
      stopAnimation();
      targetRef.current = Math.round(positionRef.current);
      setDragging(true);
      if (event.pointerType === "mouse") event.currentTarget.setPointerCapture(event.pointerId);
    }
    const now = performance.now();
    const elapsed = now - g.previousTime;
    if (elapsed > 8) {
      const instant = (event.clientX - g.previousX) / elapsed;
      g.velocity = g.velocity * 0.55 + instant * 0.45;
      g.previousX = event.clientX;
      g.previousTime = now;
    }
    const stepPx = Math.max(125, event.currentTarget.clientWidth * 0.47);
    setVisualPosition(targetRef.current + clamp(-dx / stepPx, -2.5, 2.5));
    suppressClickRef.current = true;
  };
  const finish = (event: PointerEvent<HTMLDivElement>, cancelled = false) => {
    const g = gestureRef.current;
    if (!g || g.id !== event.pointerId) return;
    gestureRef.current = null;
    if (!g.horizontal) return;
    setDragging(false);
    const dx = event.clientX - g.x;
    const stepPx = Math.max(125, event.currentTarget.clientWidth * 0.47);
    const displacement = -dx / stepPx;
    const recent = performance.now() - g.previousTime < 90;
    const projected = cancelled ? 0 : displacement - (recent ? g.velocity * 140 / stepPx : 0);
    const steps = cancelled ? 0 : Math.abs(projected) < 0.23 ? 0 : clamp(Math.round(projected), -2, 2);
    settleTo(targetRef.current + steps);
    suppressClickRef.current = true;
  };
  const reducedMotion = typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  return (
    <div ref={rootRef} className={`home-mobile-drum ${className}${dragging ? " home-mobile-drum--dragging" : ""}`}
      aria-label={label} onPointerDown={onPointerDown} onPointerMove={onPointerMove}
      onPointerUp={(event) => finish(event)} onPointerCancel={(event) => finish(event, true)}
      onClickCapture={(event) => {
        if (suppressClickRef.current) {
          event.preventDefault(); event.stopPropagation(); suppressClickRef.current = false;
        }
      }}>
      <div className="home-mobile-drum__mobile">
        {slides.map((slide, index) => {
          const relative = count > 0 ? ((index - position + count * 10000 + count / 2) % count + count) % count - count / 2 : 0;
          const depth = Math.min(Math.abs(relative), 2.5);
          const isCenter = Math.abs(relative) < 0.5;
          const hidden = Math.abs(relative) > 2.3;
          return (
            <div key={index}
              className={`home-mobile-drum__slide${isCenter ? " home-mobile-drum__slide--active" : ""}`}
              style={{ "--drum-position": relative, "--drum-depth": depth,
                "--drum-angle": `${clamp(relative, -1.5, 1.5) * -12}deg`,
                zIndex: Math.round(100 - depth * 10),
                visibility: hidden ? "hidden" : "visible",
                transition: reducedMotion ? "none" : undefined
              } as CSSProperties}
              aria-hidden={!isCenter}
              onClickCapture={(event) => {
                if (suppressClickRef.current) return;
                if (!isCenter) {
                  event.preventDefault(); event.stopPropagation();
                  move(relative > 0 ? 1 : -1);
                }
              }}>
              {slide}
            </div>
          );
        })}
      </div>
      <div ref={desktopRef} className="home-mobile-drum__desktop" aria-label={`${label}: горизонтальная прокрутка`}
        onScroll={onDesktopScroll} onPointerDown={onDesktopPointerDown}
        onPointerMove={onDesktopPointerMove} onPointerUp={onDesktopPointerEnd}
        onPointerCancel={onDesktopPointerEnd}
        onClickCapture={(event) => {
          if (desktopSuppressClickRef.current) {
            event.preventDefault(); event.stopPropagation();
            desktopSuppressClickRef.current = false;
          }
        }}>
        {count > 0 ? Array.from({ length: 15 }, (_, index) => index).flatMap((copy) => slides.map((slide, index) => (
          <div key={`${copy}-${index}`} className="home-mobile-drum__desktop-slide" aria-hidden={copy !== 7}>
            {slide}
          </div>
        ))) : slides.map((slide, index) => (
          <div key={index} className="home-mobile-drum__desktop-slide">{slide}</div>
        ))}
      </div>
    </div>
  );
}
