"use client";

import { useEffect, useRef, useState } from "react";
import type {
  CSSProperties,
  PointerEvent as ReactPointerEvent,
} from "react";

type CompareViewProps = {
  before: string;
  after: string;
  variant?: "default" | "hero";
};

const initialPosition = 54;

export function CompareView({
  before,
  after,
  variant = "default",
}: CompareViewProps) {
  const [hasInteracted, setHasInteracted] = useState(false);
  const frameRef = useRef<HTMLDivElement>(null);
  const controlRef = useRef<HTMLInputElement>(null);
  const draggingPointerRef = useRef<number | null>(null);
  const dragStartRef = useRef<number | null>(null);
  const hasInteractedRef = useRef(false);
  const pendingPositionRef = useRef(initialPosition);
  const animationFrameRef = useRef<number | null>(null);

  const markInteracted = () => {
    if (hasInteractedRef.current) return;
    hasInteractedRef.current = true;
    setHasInteracted(true);
  };

  const applyPosition = (position: number) => {
    frameRef.current?.style.setProperty("--compare-position", `${position}%`);
    if (controlRef.current) controlRef.current.value = String(position);
  };

  const schedulePosition = (position: number) => {
    pendingPositionRef.current = Math.min(100, Math.max(0, position));
    if (animationFrameRef.current !== null) return;

    animationFrameRef.current = requestAnimationFrame(() => {
      applyPosition(pendingPositionRef.current);
      animationFrameRef.current = null;
    });
  };

  const updatePosition = (clientX: number) => {
    const bounds = frameRef.current?.getBoundingClientRect();
    if (!bounds?.width) return;
    const nextPosition = ((clientX - bounds.left) / bounds.width) * 100;
    schedulePosition(nextPosition);
  };

  useEffect(
    () => () => {
      if (animationFrameRef.current !== null) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    },
    [],
  );

  const handlePointerDown = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (event.pointerType === "mouse" && event.button !== 0) return;
    event.preventDefault();
    event.stopPropagation();
    draggingPointerRef.current = event.pointerId;
    dragStartRef.current = event.clientX;
    event.currentTarget.setPointerCapture(event.pointerId);
    controlRef.current?.focus({ preventScroll: true });
    updatePosition(event.clientX);
  };

  const handlePointerMove = (event: ReactPointerEvent<HTMLDivElement>) => {
    event.stopPropagation();
    if (draggingPointerRef.current !== event.pointerId) return;
    event.preventDefault();
    if (
      dragStartRef.current !== null &&
      Math.abs(event.clientX - dragStartRef.current) > 3
    ) {
      markInteracted();
    }
    updatePosition(event.clientX);
  };

  const handlePointerEnd = (event: ReactPointerEvent<HTMLDivElement>) => {
    event.stopPropagation();
    if (draggingPointerRef.current !== event.pointerId) return;
    updatePosition(event.clientX);
    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }
    draggingPointerRef.current = null;
    dragStartRef.current = null;
  };

  const handlePointerCancel = (event: ReactPointerEvent<HTMLDivElement>) => {
    event.stopPropagation();
    if (draggingPointerRef.current !== event.pointerId) return;
    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }
    draggingPointerRef.current = null;
    dragStartRef.current = null;
  };

  const frameStyle = {
    "--compare-position": `${initialPosition}%`,
  } as CSSProperties;

  return (
    <div
      className={`compare-frame ${variant === "hero" ? "compare-frame-hero" : "aspect-[3/4] w-full"} ${variant === "default" && !hasInteracted ? "compare-frame-awaiting-interaction" : ""}`}
      onPointerCancel={handlePointerCancel}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerEnd}
      ref={frameRef}
      style={frameStyle}
    >
      <img alt="Фото до примерки" draggable={false} src={before} />
      <div className="compare-after">
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
        defaultValue={initialPosition}
        onChange={(event) => {
          markInteracted();
          schedulePosition(Number(event.target.value));
        }}
        ref={controlRef}
        type="range"
      />
    </div>
  );
}
