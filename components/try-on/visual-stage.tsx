"use client";

import { MoveHorizontal } from "lucide-react";
import Image from "next/image";
import {
  motion,
  useMotionValue,
  useReducedMotion,
  useSpring,
} from "motion/react";
import type { PointerEvent } from "react";

import { CompareView } from "./compare-view";

export function VisualStage() {
  const reducedMotion = useReducedMotion();
  const rotateX = useSpring(useMotionValue(0), { stiffness: 190, damping: 30 });
  const rotateY = useSpring(useMotionValue(0), { stiffness: 190, damping: 30 });

  const handlePointerMove = (event: PointerEvent<HTMLDivElement>) => {
    if (reducedMotion || event.pointerType !== "mouse") return;

    if ((event.target as HTMLElement).closest(".compare-frame")) {
      rotateX.set(0);
      rotateY.set(0);
      return;
    }

    const bounds = event.currentTarget.getBoundingClientRect();
    const x = (event.clientX - bounds.left) / bounds.width - 0.5;
    const y = (event.clientY - bounds.top) / bounds.height - 0.5;
    rotateX.set(y * -2.5);
    rotateY.set(x * 3.5);
  };

  const resetTilt = () => {
    rotateX.set(0);
    rotateY.set(0);
  };

  return (
    <div
      className="stage-shell mx-auto"
      onPointerLeave={resetTilt}
      onPointerMove={handlePointerMove}
    >
      <motion.div className="stage-plane" style={{ rotateX, rotateY }}>
        <div className="stage-halo" />
        <div className="stage-drape" aria-hidden="true">
          <Image
            alt=""
            fill
            priority
            sizes="(max-width: 640px) 110vw, 680px"
            src="/looksi-drape.webp"
          />
        </div>

        <motion.article
          animate={{ opacity: 1, rotate: -2.25, y: 0 }}
          className="stage-card stage-card-result"
          initial={
            reducedMotion ? false : { opacity: 0, rotate: -5, y: 18 }
          }
          transition={{ duration: 0.72, ease: [0.22, 1, 0.36, 1] }}
        >
          <div className="stage-card-heading">
            <span>Результат примерки</span>
            <span className="stage-drag-hint">
              <MoveHorizontal />
              Потяни
            </span>
          </div>
          <div className="stage-result-frame">
            <CompareView
              after="/looksi-result.webp"
              before="/looksi-before.webp"
              variant="hero"
            />
          </div>
        </motion.article>

        <motion.article
          animate={{ opacity: 1, rotate: 3.5, x: 0 }}
          className="stage-card stage-card-garment"
          initial={
            reducedMotion ? false : { opacity: 0, rotate: 7, x: 20 }
          }
          transition={{
            delay: reducedMotion ? 0 : 0.14,
            duration: 0.72,
            ease: [0.22, 1, 0.36, 1],
          }}
        >
          <div className="stage-card-heading">
            <span>Выбранная вещь</span>
          </div>
          <div className="stage-garment-frame">
            <Image
              alt="Иллюстрация выбранного кожаного жакета"
              className="stage-garment-image"
              fill
              priority
              sizes="(max-width: 640px) 38vw, 210px"
              src="/looksi-jacket.webp"
            />
          </div>
        </motion.article>

        <motion.div
          animate={{ opacity: 1, y: 0 }}
          className="glass-panel stage-status"
          initial={reducedMotion ? false : { opacity: 0, y: 12 }}
          transition={{ delay: reducedMotion ? 0 : 0.44, duration: 0.5 }}
        >
          <span className="stage-status-mark" />
          Готово к примерке
        </motion.div>
      </motion.div>
    </div>
  );
}
