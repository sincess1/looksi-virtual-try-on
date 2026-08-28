"use client";

import {
  AlertCircle,
  ArrowLeft,
  ArrowUpRight,
  Check,
  Clock3,
  Download,
  ImageIcon,
  RotateCcw,
  ShieldCheck,
  Sparkles,
} from "lucide-react";
import {
  AnimatePresence,
  motion,
  type Variants,
  useReducedMotion,
} from "motion/react";
import { useEffect, useRef, useState } from "react";

import {
  isHeicFile,
  prepareImage,
  validateImageFile,
} from "@/lib/image-processing";
import { pollTryOn, preloadImage, startTryOn } from "@/lib/try-on-client";

import { CompareView } from "./compare-view";
import { type PhotoSelection, UploadCard } from "./upload-card";
import { VisualStage } from "./visual-stage";

type Screen = "intro" | "upload" | "processing" | "result";
type ProcessingStage = "preparing" | "queued" | "processing" | "finishing";
type PhotoKind = "person" | "product";
type Photos = Partial<Record<PhotoKind, PhotoSelection>>;

const stageContent: Record<ProcessingStage, { title: string; text: string }> = {
  preparing: {
    title: "Готовим фотографии",
    text: "Поворачиваем, сжимаем и проверяем качество",
  },
  queued: {
    title: "Примерка в очереди",
    text: "Фотографии готовы, скоро начнём собирать образ",
  },
  processing: {
    title: "Собираем новый образ",
    text: "Сохраняем позу, пропорции и детали выбранной вещи",
  },
  finishing: {
    title: "Последний штрих",
    text: "Загружаем готовый результат",
  },
};

const stageIndex: Record<ProcessingStage, number> = {
  preparing: 0,
  queued: 1,
  processing: 2,
  finishing: 3,
};

const processingSteps = [
  "Подготовка",
  "Очередь",
  "Примерка",
  "Результат",
];

const screenMotion = {
  initial: { opacity: 0, y: 18 },
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: -12 },
};

const uploadReveal: Variants = {
  hidden: { opacity: 0, y: 18 },
  visible: (delay: number) => ({
    opacity: 1,
    y: 0,
    transition: { delay, duration: 0.58, ease: [0.22, 1, 0.36, 1] },
  }),
};

export function TryOnExperience() {
  const [screen, setScreen] = useState<Screen>("intro");
  const [photos, setPhotos] = useState<Photos>({});
  const [stage, setStage] = useState<ProcessingStage>("preparing");
  const [queuePosition, setQueuePosition] = useState<number>();
  const [resultUrl, setResultUrl] = useState<string>();
  const [error, setError] = useState<string>();
  const abortController = useRef<AbortController | null>(null);
  const photosRef = useRef(photos);
  const reducedMotion = useReducedMotion();

  useEffect(() => {
    photosRef.current = photos;
  }, [photos]);

  useEffect(() => {
    window.scrollTo({ behavior: "auto", left: 0, top: 0 });
  }, [screen]);

  useEffect(
    () => () => {
      abortController.current?.abort();
      Object.values(photosRef.current).forEach((photo) => {
        if (photo.previewUrl) URL.revokeObjectURL(photo.previewUrl);
      });
    },
    [],
  );

  const selectPhoto = (kind: PhotoKind, file: File) => {
    const validationError = validateImageFile(file);
    if (validationError) {
      setError(validationError);
      return;
    }

    setError(undefined);
    const previewUrl = isHeicFile(file) ? undefined : URL.createObjectURL(file);
    setPhotos((current) => {
      if (current[kind]?.previewUrl)
        URL.revokeObjectURL(current[kind].previewUrl);
      return {
        ...current,
        [kind]: { file, previewUrl, isHeic: isHeicFile(file) },
      };
    });
  };

  const runGeneration = async () => {
    if (!photos.person || !photos.product) return;

    const controller = new AbortController();
    abortController.current?.abort();
    abortController.current = controller;
    setError(undefined);
    setQueuePosition(undefined);
    setStage("preparing");
    setScreen("processing");

    try {
      const [person, product] = await Promise.all([
        prepareImage(photos.person.file),
        prepareImage(photos.product.file),
      ]);

      setPhotos((current) => {
        const personPreview =
          current.person?.previewUrl ?? URL.createObjectURL(person);
        const productPreview =
          current.product?.previewUrl ?? URL.createObjectURL(product);
        return {
          person: current.person && {
            ...current.person,
            previewUrl: personPreview,
          },
          product: current.product && {
            ...current.product,
            previewUrl: productPreview,
          },
        };
      });

      const queued = await startTryOn(person, product, controller.signal);
      setQueuePosition(queued.queuePosition);
      setStage("queued");

      const imageUrl = await pollTryOn(
        queued.requestId,
        queued.token,
        controller.signal,
        (status) => {
          if (status.status === "queued") {
            setStage("queued");
            setQueuePosition(status.queuePosition);
          }
          if (status.status === "processing") setStage("processing");
        },
      );

      setStage("finishing");
      await preloadImage(imageUrl, controller.signal);
      setResultUrl(imageUrl);
      setScreen("result");
    } catch (reason) {
      if (reason instanceof DOMException && reason.name === "AbortError")
        return;
      setError(
        reason instanceof Error
          ? reason.message
          : "Не удалось собрать образ. Попробуйте ещё раз.",
      );
      setScreen("upload");
    }
  };

  const clearPhotos = () => {
    abortController.current?.abort();
    Object.values(photosRef.current).forEach((photo) => {
      if (photo.previewUrl) URL.revokeObjectURL(photo.previewUrl);
    });
    setPhotos({});
    setResultUrl(undefined);
    setError(undefined);
    setQueuePosition(undefined);
  };

  const startAnother = () => {
    clearPhotos();
    setScreen("upload");
  };

  const step =
    screen === "upload"
      ? "01 / 03"
      : screen === "processing"
        ? "02 / 03"
        : screen === "result"
          ? "03 / 03"
          : undefined;
  const beforeUrl = photos.person?.previewUrl;

  return (
    <main className="experience-shell relative min-h-dvh overflow-hidden text-[#261b14]">
      <header className="relative z-40 mx-auto flex w-full max-w-[88rem] items-center justify-between px-5 py-5 sm:px-8 lg:px-12 lg:py-7">
        <button
          aria-label="На главный экран"
          className="group flex items-center gap-3"
          onClick={() => {
            if (screen !== "processing") setScreen("intro");
          }}
          type="button"
        >
          <span className="flex size-9 items-center justify-center rounded-[0.8rem] bg-[#281b13] text-lg font-bold text-[#e9b970] shadow-[0_8px_24px_rgba(43,27,18,0.18)] transition-transform group-hover:-rotate-3">
            L
          </span>
          <span className="text-sm font-extrabold tracking-[0.22em]">
            LOOKSI
          </span>
        </button>

        {step ? (
          <div className="flex items-center gap-3 text-[0.68rem] font-bold uppercase tracking-[0.16em] text-[#7b6a5e]">
            <span className="hidden sm:inline">Виртуальная примерка</span>
            <span className="h-px w-8 bg-[#bca994]" />
            <span className="whitespace-nowrap">Шаг {step}</span>
          </div>
        ) : (
          <div className="flex items-center gap-2 text-[0.54rem] font-bold uppercase tracking-[0.09em] text-[#7b6a5e] sm:text-[0.65rem] sm:tracking-[0.15em]">
            <span className="size-1.5 rounded-full bg-[#c8893a] shadow-[0_0_10px_#c8893a]" />
            <span>
              <span className="hidden sm:inline">Виртуальная </span>
              примерка нового поколения
            </span>
          </div>
        )}
      </header>

      <AnimatePresence initial={false} mode="wait">
        {screen === "intro" && (
          <motion.section
            {...screenMotion}
            className="intro-layout relative z-10 mx-auto"
            key="intro"
            transition={{
              duration: reducedMotion ? 0 : 0.55,
              ease: [0.22, 1, 0.36, 1],
            }}
          >
            <div className="contents">
              <div className="intro-heading">
                <h1 className="intro-title font-display">
                  <span>Примерь вещь.</span>
                  <em>Оцени образ.</em>
                </h1>
              </div>

              <p className="intro-description">
                Загрузи фото в полный рост и снимок вещи. Через несколько минут
                получишь персональную примерку с сохранением позы и пропорций.
              </p>

              <div className="intro-visual">
                <VisualStage />
              </div>

              <div className="intro-actions">
                <button
                  className="primary-action intro-primary-action"
                  onClick={() => setScreen("upload")}
                  type="button"
                >
                  <span className="primary-action-decoration">
                    <Sparkles className="size-4" strokeWidth={1.6} />
                  </span>
                  <span className="primary-action-label">Начать примерку</span>
                  <span className="primary-action-icon">
                    <ArrowUpRight className="size-[1.1rem]" strokeWidth={1.6} />
                  </span>
                </button>
                <div className="intro-assurance">
                  <ShieldCheck className="size-4 shrink-0" strokeWidth={1.7} />
                  Фото удаляются через час
                </div>
              </div>

              <div className="intro-facts">
                <div>
                  <span>Нужно</span>
                  <strong>Два фото</strong>
                </div>
                <div>
                  <span>Ожидание</span>
                  <strong>Пара минут</strong>
                </div>
                <div>
                  <span>Результат</span>
                  <strong>Один образ</strong>
                </div>
              </div>
            </div>
          </motion.section>
        )}

        {screen === "upload" && (
          <motion.section
            {...screenMotion}
            className="relative z-10 mx-auto w-full max-w-[76rem] px-5 pb-12 pt-4 sm:px-8 lg:px-12 lg:pb-16 lg:pt-8"
            key="upload"
            transition={{
              duration: reducedMotion ? 0 : 0.5,
              ease: [0.22, 1, 0.36, 1],
            }}
          >
            <div className="contents">
              <motion.button
                animate="visible"
                className="mb-6 flex items-center gap-2 text-xs font-bold uppercase tracking-[0.13em] text-[#806e61] transition-colors hover:text-[#2b1d15]"
                custom={0.05}
                initial={reducedMotion ? false : "hidden"}
                onClick={() => setScreen("intro")}
                type="button"
                variants={uploadReveal}
              >
                <ArrowLeft className="size-4" />
                Назад
              </motion.button>

              <motion.div
                animate="visible"
                className="mx-auto max-w-[46rem] text-center"
                custom={0.12}
                initial={reducedMotion ? false : "hidden"}
                variants={uploadReveal}
              >
                <span className="text-[0.68rem] font-extrabold uppercase tracking-[0.18em] text-[#a5672f]">
                  Два фото — один образ
                </span>
                <h1 className="font-display mt-3 text-[clamp(2.8rem,7vw,5.1rem)] font-semibold leading-[0.9] tracking-[-0.04em]">
                  Создадим твой образ
                </h1>
                <p className="mx-auto mt-4 max-w-[35rem] text-sm leading-6 text-[#75685e] sm:text-base">
                  Чем ровнее свет и свободнее поза, тем естественнее будет
                  результат.
                </p>
              </motion.div>

              {error && (
                <motion.div
                  animate="visible"
                  className="mx-auto mt-6 flex max-w-[43rem] items-start gap-3 rounded-2xl border border-[#bd755f]/25 bg-[#fff7ef]/82 px-4 py-3 text-sm text-[#814937]"
                  custom={0.16}
                  initial={reducedMotion ? false : "hidden"}
                  role="alert"
                  variants={uploadReveal}
                >
                  <AlertCircle className="mt-0.5 size-4 shrink-0" />
                  <span>{error}</span>
                </motion.div>
              )}

              <div className="mt-8 grid gap-4 md:grid-cols-2 md:gap-5">
                <motion.div
                  animate="visible"
                  custom={0.22}
                  initial={reducedMotion ? false : "hidden"}
                  variants={uploadReveal}
                >
                  <UploadCard
                    description="Человек полностью в кадре, руки не закрывают одежду"
                    exampleSrc="/looksi-model.webp"
                    index="01"
                    onSelect={(file) => selectPhoto("person", file)}
                    selection={photos.person}
                    title="Фото в полный рост"
                  />
                </motion.div>
                <motion.div
                  animate="visible"
                  custom={0.32}
                  initial={reducedMotion ? false : "hidden"}
                  variants={uploadReveal}
                >
                  <UploadCard
                    description="Вещь целиком, лучше на однотонном фоне"
                    exampleSrc="/looksi-jacket.webp"
                    index="02"
                    onSelect={(file) => selectPhoto("product", file)}
                    selection={photos.product}
                    title="Фото вещи"
                  />
                </motion.div>
              </div>

              <motion.div
                animate="visible"
                className="upload-actions"
                custom={0.42}
                initial={reducedMotion ? false : "hidden"}
                variants={uploadReveal}
              >
                <button
                  className="primary-action primary-action-compact w-full"
                  disabled={!photos.person || !photos.product}
                  onClick={runGeneration}
                  type="button"
                >
                  <span className="primary-action-label">Примерить образ</span>
                  <span className="primary-action-icon">
                    <Sparkles className="size-4" />
                  </span>
                </button>
                <div className="upload-privacy">
                  <ShieldCheck
                    className="size-5 shrink-0 text-[#9a642f]"
                    strokeWidth={1.6}
                  />
                  Фото не сохраняются в профиле и удаляются автоматически.
                </div>
              </motion.div>
            </div>
          </motion.section>
        )}

        {screen === "processing" && (
          <motion.section
            {...screenMotion}
            className="processing-layout relative z-10 mx-auto flex min-h-[calc(100dvh-90px)] w-full max-w-[65rem] flex-col items-center justify-center px-5 pb-16 text-center sm:px-8"
            key="processing"
            transition={{ duration: reducedMotion ? 0 : 0.45 }}
          >
            <div className="contents">
              <div
                aria-hidden="true"
                className="processing-drape"
                key="processing-drape"
              />
              <div className="processing-visual relative flex items-center justify-center">
                <motion.div
                  animate={
                    reducedMotion
                      ? undefined
                      : { rotate: [-5, -8, -5], y: [0, -6, 0] }
                  }
                  className="processing-photo-person absolute overflow-hidden rounded-[1.6rem] border border-[#fffaf1]/55 bg-[#d9cbb8] shadow-[0_16px_40px_rgba(67,40,22,0.12)]"
                  transition={{ duration: 4.5, repeat: Infinity }}
                >
                  {photos.person?.previewUrl ? (
                    <img
                      alt="Загруженное фото"
                      className="h-full w-full object-cover"
                      src={photos.person.previewUrl}
                    />
                  ) : (
                    <ImageIcon className="m-auto mt-20 size-7 text-[#927b67]" />
                  )}
                </motion.div>
                <motion.div
                  animate={
                    reducedMotion
                      ? undefined
                      : { rotate: [6, 9, 6], y: [0, 7, 0] }
                  }
                  className="processing-photo-product absolute overflow-hidden rounded-[1.6rem] border border-[#fffaf1]/55 bg-[#c8a87d] shadow-[0_16px_40px_rgba(67,40,22,0.12)]"
                  transition={{ duration: 5.2, repeat: Infinity }}
                >
                  {photos.product?.previewUrl ? (
                    <img
                      alt="Загруженная вещь"
                      className="h-full w-full object-cover"
                      src={photos.product.previewUrl}
                    />
                  ) : (
                    <ImageIcon className="m-auto mt-20 size-7 text-[#765334]" />
                  )}
                </motion.div>
                <div className="processing-core absolute z-20">
                  <motion.span
                    animate={
                      reducedMotion
                        ? undefined
                        : {
                            opacity: [0.35, 1, 0.35],
                            scaleX: [0.55, 1, 0.55],
                            y: [0, 42, 0],
                          }
                    }
                    className="processing-scan-line"
                    transition={{
                      duration: 2.2,
                      ease: "linear",
                      repeat: Infinity,
                    }}
                  />
                  <Sparkles
                    className="processing-core-mark"
                    strokeWidth={1.3}
                  />
                  <span className="processing-core-label">LOOKSI</span>
                </div>
              </div>

              <div aria-live="polite">
                <span className="text-[0.68rem] font-extrabold uppercase tracking-[0.18em] text-[#a5672f]">
                  Шаг 2 из 3
                </span>
                <h1 className="font-display mt-3 text-[clamp(2.6rem,7vw,4.7rem)] font-semibold leading-[0.92] tracking-[-0.04em]">
                  {stageContent[stage].title}
                </h1>
                <p className="mx-auto mt-4 max-w-[34rem] text-sm leading-6 text-[#75685e] sm:text-base">
                  {stageContent[stage].text}
                </p>
                {stage === "queued" &&
                  queuePosition !== undefined &&
                  queuePosition > 0 && (
                    <p className="mt-2 text-xs font-semibold text-[#8a7565]">
                      Перед вами: {queuePosition}
                    </p>
                  )}
              </div>

              <ol
                aria-label="Этапы виртуальной примерки"
                className="processing-steps"
              >
                {processingSteps.map((label, index) => {
                  const current = stageIndex[stage];
                  const state =
                    index < current
                      ? "complete"
                      : index === current
                        ? "active"
                        : "pending";

                  return (
                    <li className="processing-step" data-state={state} key={label}>
                      <span className="processing-step-mark">
                        {state === "complete" ? <Check /> : <span />}
                      </span>
                      <span>{label}</span>
                    </li>
                  );
                })}
              </ol>
              <div className="processing-time mt-6 flex items-center gap-2 text-xs text-[#827268]">
                <Clock3 className="size-4" strokeWidth={1.6} />
                Обычно это занимает несколько минут
              </div>
            </div>
          </motion.section>
        )}

        {screen === "result" && resultUrl && beforeUrl && (
          <motion.section
            {...screenMotion}
            className="result-layout relative z-10"
            key="result"
            transition={{
              duration: reducedMotion ? 0 : 0.6,
              ease: [0.22, 1, 0.36, 1],
            }}
          >
            <div className="contents">
              <div
                aria-hidden="true"
                className="result-drape"
                key="result-drape"
              />
              <div className="result-copy">
                <div className="result-kicker">
                  <span>
                    <Check />
                  </span>
                  Образ готов
                </div>
                <h1 className="font-display result-title">
                  Вот как вещь выглядит на тебе
                </h1>
              </div>

              <div className="result-visual">
                <CompareView after={resultUrl} before={beforeUrl} />
              </div>

              <div className="result-guidance">
                <p className="result-description">
                  Сравни результат с исходным фото и сохрани образ, если он тебе
                  подходит.
                </p>
                <p className="result-drag-hint">
                  Нажми в любом месте и проведи, чтобы сравнить
                </p>
              </div>

              <div className="result-actions">
                <div className="result-buttons">
                  <a
                    className="result-download"
                    href={resultUrl}
                    download="looksi-result.png"
                    rel="noreferrer"
                    target="_blank"
                  >
                    <Download />
                    Скачать результат
                    <ArrowUpRight />
                  </a>
                  <button
                    className="result-restart"
                    onClick={startAnother}
                    type="button"
                  >
                    <RotateCcw />
                    Новая примерка
                  </button>
                </div>

                <div className="result-notice">
                  <ShieldCheck />
                  Результат доступен ограниченное время. Сохрани его на
                  устройство.
                </div>
              </div>
            </div>
          </motion.section>
        )}
      </AnimatePresence>
    </main>
  );
}
