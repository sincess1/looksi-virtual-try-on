"use client";

import { ImageIcon, Sparkles } from "lucide-react";
import {
  motion,
  useMotionValue,
  useReducedMotion,
  useSpring,
} from "motion/react";
import type { PointerEvent } from "react";

export function VisualStage() {
  const reducedMotion = useReducedMotion();
  const rotateX = useSpring(useMotionValue(0), { stiffness: 140, damping: 20 });
  const rotateY = useSpring(useMotionValue(0), { stiffness: 140, damping: 20 });

  const handlePointerMove = (event: PointerEvent<HTMLDivElement>) => {
    if (reducedMotion || event.pointerType !== "mouse") return;

    const bounds = event.currentTarget.getBoundingClientRect();
    const x = (event.clientX - bounds.left) / bounds.width - 0.5;
    const y = (event.clientY - bounds.top) / bounds.height - 0.5;
    rotateX.set(y * -9);
    rotateY.set(x * 11);
  };

  const resetTilt = () => {
    rotateX.set(0);
    rotateY.set(0);
  };

  return (
    <motion.div
      className="stage-shell mx-auto"
      onPointerLeave={resetTilt}
      onPointerMove={handlePointerMove}
      style={{ rotateX, rotateY }}
    >
      <motion.div
        animate={reducedMotion ? undefined : { y: [0, -9, 0] }}
        className="stage-card left-[3%] top-[9%] h-[68%] w-[54%] -rotate-6 p-4 sm:p-5"
        transition={{ duration: 5.6, ease: "easeInOut", repeat: Infinity }}
      >
        <div className="flex items-center justify-between text-[0.62rem] font-bold uppercase tracking-[0.16em] text-[#8b7768]">
          <span>Твоё фото</span>
          <span>01</span>
        </div>
        <div className="mt-4 flex h-[calc(100%-2rem)] items-center justify-center rounded-[1.35rem] border border-white/70 bg-[#eadfce] p-5">
          <div className="relative flex h-full w-full items-center justify-center overflow-hidden rounded-2xl border border-[#bca995]/45 bg-[#f8f0e4]/75 shadow-inner">
            <span className="absolute inset-x-4 top-4 h-px bg-[#bda890]/45" />
            <span className="absolute inset-x-7 bottom-5 h-px bg-[#bda890]/35" />
            <span className="absolute left-5 top-8 h-[55%] w-px bg-[#bda890]/35" />
            <ImageIcon
              className="relative z-10 size-7 text-[#9b8068]"
              strokeWidth={1.4}
            />
          </div>
        </div>
      </motion.div>

      <motion.div
        animate={reducedMotion ? undefined : { y: [0, 11, 0] }}
        className="stage-card bottom-[4%] right-[2%] h-[66%] w-[55%] rotate-5 p-4 sm:p-5"
        transition={{ duration: 6.2, ease: "easeInOut", repeat: Infinity }}
      >
        <div className="flex items-center justify-between text-[0.62rem] font-bold uppercase tracking-[0.16em] text-[#8b7768]">
          <span>Твоя вещь</span>
          <span>02</span>
        </div>
        <div className="mt-4 flex h-[calc(100%-2rem)] flex-col items-center justify-center gap-6 rounded-[1.35rem] border border-white/70 bg-[#d7b27e]">
          <div className="relative h-[46%] w-[58%]">
            <span className="absolute inset-[20%_0_0_20%] rounded-xl border border-[#fff4df]/55 bg-[#a9682f]/45" />
            <span className="absolute inset-[10%_10%_10%_10%] rounded-xl border border-[#fff4df]/65 bg-[#c98945]/62" />
            <span className="absolute inset-[0_20%_20%_0] rounded-xl border border-[#fff4df]/75 bg-[#e4bd85]/75 shadow-[0_12px_28px_rgba(91,48,12,0.16)]" />
          </div>
          <div className="flex gap-2">
            {["#34241a", "#b87936", "#f5e5cc"].map((color) => (
              <span
                className="size-3 rounded-full border border-white/50"
                key={color}
                style={{ backgroundColor: color }}
              />
            ))}
          </div>
        </div>
      </motion.div>

      <motion.div
        animate={reducedMotion ? undefined : { rotate: [0, 7, -5, 0] }}
        className="hero-orbit absolute left-1/2 top-1/2 z-20 flex size-20 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full border border-white/70 bg-[#2b1c13] text-[#f2c57f] sm:size-24"
        transition={{ duration: 7, ease: "easeInOut", repeat: Infinity }}
      >
        <Sparkles className="size-8 sm:size-9" strokeWidth={1.35} />
      </motion.div>

      <motion.div
        animate={reducedMotion ? undefined : { x: [0, 8, 0], y: [0, -5, 0] }}
        className="glass-panel absolute bottom-[3%] left-[4%] z-30 flex items-center gap-2 rounded-full px-4 py-2 text-[0.68rem] font-bold uppercase tracking-[0.12em] text-[#5f4838]"
        transition={{ duration: 4.8, ease: "easeInOut", repeat: Infinity }}
      >
        <span className="size-1.5 rounded-full bg-[#c8893a] shadow-[0_0_12px_#c8893a]" />
        Образ собран
      </motion.div>
    </motion.div>
  );
}
