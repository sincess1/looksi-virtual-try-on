"use client";

import { useState } from "react";

type CompareViewProps = {
  before: string;
  after: string;
};

export function CompareView({ before, after }: CompareViewProps) {
  const [position, setPosition] = useState(54);

  return (
    <div className="compare-frame aspect-[3/4] w-full">
      <img alt="Фото до примерки" src={before} />
      <div
        className="compare-after"
        style={{ clipPath: `inset(0 ${100 - position}% 0 0)` }}
      >
        <img alt="Результат виртуальной примерки" src={after} />
      </div>

      <span className="absolute left-4 top-4 rounded-full border border-white/45 bg-[#2b1d15]/65 px-3 py-1.5 text-[0.68rem] font-bold uppercase tracking-[0.14em] text-white backdrop-blur-md">
        До
      </span>
      <span className="absolute right-4 top-4 rounded-full border border-white/55 bg-[#fffaf1]/78 px-3 py-1.5 text-[0.68rem] font-bold uppercase tracking-[0.14em] text-[#4c3323] backdrop-blur-md">
        После
      </span>

      <span
        aria-hidden="true"
        className="pointer-events-none absolute inset-y-0 z-20 w-px bg-white/90 shadow-[0_0_12px_rgba(40,23,12,0.35)]"
        style={{ left: `${position}%` }}
      >
        <span className="absolute left-1/2 top-1/2 flex size-11 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full border border-white/80 bg-[#2b1d15]/82 shadow-lg backdrop-blur-md">
          <span className="h-4 w-[3px] rounded-full bg-[#f0c47d]" />
          <span className="ml-1 h-4 w-[3px] rounded-full bg-[#f0c47d]" />
        </span>
      </span>

      <input
        aria-label="Сравнить фото до и после"
        className="absolute inset-0 z-30 h-full w-full cursor-ew-resize opacity-0"
        max="100"
        min="0"
        onChange={(event) => setPosition(Number(event.target.value))}
        type="range"
        value={position}
      />
    </div>
  );
}
