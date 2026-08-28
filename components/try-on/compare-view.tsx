"use client";

import { useRef, useState } from "react";
import type { PointerEvent as ReactPointerEvent } from "react";

type CompareViewProps = {
  before: string;
  after: string;
  variant?: "default" | "hero";
};

export function CompareView({
  before,
  after,
  variant = "default",
}: CompareViewProps) {
  const [position, setPosition] = useState(54);
  const frameRef = useRef<HTMLDivElement>(null);
  const controlRef = useRef<HTMLInputElement>(null);

  const updatePosition = (clientX: number) => {
    const bounds = frameRef.current?.getBoundingClientRect();
    if (!bounds?.width) return;
    const nextPosition = ((clientX - bounds.left) / bounds.width) * 100;
    setPosition(Math.min(100, Math.max(0, nextPosition)));
  };

  const handlePointerDown = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (event.pointerType === "mouse" && event.button !== 0) return;
    event.preventDefault();
    event.currentTarget.setPointerCapture(event.pointerId);
    controlRef.current?.focus({ preventScroll: true });
    updatePosition(event.clientX);
  };

  const handlePointerMove = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (!event.currentTarget.hasPointerCapture(event.pointerId)) return;
    event.preventDefault();
    updatePosition(event.clientX);
  };

  const handlePointerEnd = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (!event.currentTarget.hasPointerCapture(event.pointerId)) return;
    updatePosition(event.clientX);
    event.currentTarget.releasePointerCapture(event.pointerId);
  };

  return (
    <div
      className={`compare-frame ${variant === "hero" ? "compare-frame-hero" : "aspect-[3/4] w-full"}`}
      onPointerCancel={handlePointerEnd}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerEnd}
      ref={frameRef}
    >
      <img alt="Фото до примерки" draggable={false} src={before} />
      <div
        className="compare-after"
        style={{ clipPath: `inset(0 0 0 ${position}%)` }}
      >
        <img
          alt="Результат виртуальной примерки"
          draggable={false}
          src={after}
        />
      </div>

      <span className="compare-label compare-label-before">
        До
      </span>
      <span className="compare-label compare-label-after">
        После
      </span>

      <span
        aria-hidden="true"
        className="compare-divider"
        style={{ left: `${position}%` }}
      >
        <span className="compare-handle">
          <span className="compare-arrow compare-arrow-left" />
          <span className="compare-arrow compare-arrow-right" />
        </span>
      </span>

      <input
        aria-label="Сравнить фото до и после"
        className="compare-control"
        max="100"
        min="0"
        onChange={(event) => setPosition(Number(event.target.value))}
        ref={controlRef}
        type="range"
        value={position}
      />
    </div>
  );
}
