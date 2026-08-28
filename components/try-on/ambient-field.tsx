import type { CSSProperties } from "react";

type AmbientStyle = CSSProperties & {
  "--x": string;
  "--y": string;
  "--size": string;
  "--duration": string;
  "--delay": string;
  "--travel": string;
};

const dots = Array.from({ length: 24 }, (_, index) => ({
  x: `${(index * 37 + 7) % 97}%`,
  y: `${(index * 53 + 4) % 94}%`,
  size: `${5 + ((index * 7) % 18)}px`,
  duration: `${13 + ((index * 3) % 13)}s`,
  delay: `${-((index * 1.7) % 15)}s`,
  travel: `${14 + ((index * 11) % 34)}px`,
}));

export function AmbientField() {
  return (
    <div className="ambient-field" aria-hidden="true">
      {dots.map((dot, index) => (
        <span
          className="ambient-dot"
          key={index}
          style={
            {
              "--x": dot.x,
              "--y": dot.y,
              "--size": dot.size,
              "--duration": dot.duration,
              "--delay": dot.delay,
              "--travel": dot.travel,
            } as AmbientStyle
          }
        />
      ))}
    </div>
  );
}
