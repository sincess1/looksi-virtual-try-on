"use client";

import {
  AlertCircle,
  ArrowLeft,
  ArrowRight,
  ArrowUpRight,
  Check,
  Clock3,
  Download,
  ImageIcon,
  RotateCcw,
  ShieldCheck,
  Sparkles,
} from "lucide-react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { useEffect, useRef, useState } from "react";

import {
  isHeicFile,
  prepareImage,
  validateImageFile,
} from "@/lib/image-processing";
import { pollTryOn, preloadImage, startTryOn } from "@/lib/try-on-client";

import { AmbientField } from "./ambient-field";
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

const screenMotion = {
  initial: { opacity: 0, y: 22, filter: "blur(8px)" },
  animate: { opacity: 1, y: 0, filter: "blur(0px)" },
  exit: { opacity: 0, y: -16, filter: "blur(6px)" },
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
    <main className="relative min-h-dvh overflow-hidden text-[#261b14]">
      <AmbientField />

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
            <span>{step}</span>
          </div>
        ) : (
          <div className="flex items-center gap-2 text-[0.65rem] font-bold uppercase tracking-[0.15em] text-[#7b6a5e]">
            <span className="size-1.5 rounded-full bg-[#c8893a] shadow-[0_0_10px_#c8893a]" />
            Виртуальная примерка
          </div>
        )}
      </header>

      <AnimatePresence initial={false} mode="wait">
        {screen === "intro" && (
          <motion.section
            {...screenMotion}
            className="relative z-10 mx-auto grid min-h-[calc(100dvh-88px)] w-full max-w-[88rem] items-center gap-5 px-5 pb-10 sm:px-8 lg:grid-cols-[0.92fr_1.08fr] lg:gap-12 lg:px-12 lg:pb-16"
            key="intro"
            transition={{
              duration: reducedMotion ? 0 : 0.55,
              ease: [0.22, 1, 0.36, 1],
            }}
          >
            <div className="contents">
              <div className="order-2 max-w-[39rem] pb-4 lg:order-1 lg:pb-0">
                <div className="mb-6 flex items-center gap-3 text-[0.68rem] font-extrabold uppercase tracking-[0.18em] text-[#9a642f]">
                  <span className="h-px w-10 bg-[#c8893a]" />
                  Твой образ — до покупки
                </div>
                <h1 className="font-display text-[clamp(3.15rem,8.7vw,6.8rem)] font-semibold leading-[0.83] tracking-[-0.045em] text-[#2a1c13]">
                  Примерь вещь.
                  <span className="mt-2 block font-medium italic text-[#a5672f]">
                    Увидь себя.
                  </span>
                </h1>
                <p className="mt-7 max-w-[34rem] text-[0.96rem] leading-7 text-[#6f6258] sm:text-base sm:leading-8">
                  Загрузи фото в полный рост и снимок вещи — через несколько
                  минут увидишь готовый образ на себе.
                </p>

                <div className="mt-8 flex flex-col items-start gap-5 sm:flex-row sm:items-center">
                  <button
                    className="h-14 w-full rounded-2xl bg-[#281b13] px-7 text-sm font-bold text-[#fff8ec] shadow-[0_16px_35px_rgba(49,29,16,0.24)] hover:bg-[#3a271c] sm:w-auto"
                    onClick={() => setScreen("upload")}
                    type="button"
                  >
                    Начать примерку
                    <ArrowRight className="ml-2 size-4" />
                  </button>
                  <div className="flex items-center gap-3 text-xs font-semibold text-[#75685e]">
                    <span className="flex -space-x-2">
                      <span className="size-7 rounded-full border-2 border-[#f4eee3] bg-[#d9c6ab]" />
                      <span className="size-7 rounded-full border-2 border-[#f4eee3] bg-[#d9c6ab]/80" />
                      <span className="size-7 rounded-full border-2 border-[#f4eee3] bg-[#d9c6ab]/65" />
                    </span>
                    2 фото · 1 новый образ
                  </div>
                </div>

                <div className="mt-10 grid max-w-[34rem] grid-cols-3 gap-3 border-t border-[#ad9c8a]/30 pt-5 text-[0.68rem] font-bold uppercase tracking-[0.11em] text-[#796a5f] sm:gap-6">
                  <span>Без регистрации</span>
                  <span>Удаление через час</span>
                  <span>Для телефона</span>
                </div>
              </div>

              <div className="order-1 flex min-h-[20rem] items-center justify-center lg:order-2 lg:min-h-[38rem]">
                <VisualStage />
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
              <button
                className="mb-6 flex items-center gap-2 text-xs font-bold uppercase tracking-[0.13em] text-[#806e61] transition-colors hover:text-[#2b1d15]"
                onClick={() => setScreen("intro")}
                type="button"
              >
                <ArrowLeft className="size-4" />
                Назад
              </button>

              <div className="mx-auto max-w-[46rem] text-center">
                <span className="text-[0.68rem] font-extrabold uppercase tracking-[0.18em] text-[#a5672f]">
                  Два фото — один образ
                </span>
                <h1 className="font-display mt-3 text-[clamp(2.8rem,7vw,5.1rem)] font-semibold leading-[0.9] tracking-[-0.04em]">
                  Соберём твою примерку
                </h1>
                <p className="mx-auto mt-4 max-w-[35rem] text-sm leading-6 text-[#75685e] sm:text-base">
                  Чем ровнее свет и свободнее поза, тем естественнее будет
                  результат.
                </p>
              </div>

              {error && (
                <div
                  className="mx-auto mt-6 flex max-w-[43rem] items-start gap-3 rounded-2xl border border-[#bd755f]/25 bg-[#fff7ef]/82 px-4 py-3 text-sm text-[#814937]"
                  role="alert"
                >
                  <AlertCircle className="mt-0.5 size-4 shrink-0" />
                  <span>{error}</span>
                </div>
              )}

              <div className="mt-8 grid gap-4 md:grid-cols-2 md:gap-5">
                <UploadCard
                  description="Человек полностью в кадре, руки не закрывают одежду"
                  index="01"
                  onSelect={(file) => selectPhoto("person", file)}
                  selection={photos.person}
                  title="Фото в полный рост"
                />
                <UploadCard
                  description="Вещь целиком, лучше на однотонном фоне"
                  index="02"
                  onSelect={(file) => selectPhoto("product", file)}
                  selection={photos.product}
                  title="Фото вещи"
                />
              </div>

              <div className="mt-6 flex flex-col items-center justify-between gap-4 rounded-[1.5rem] border border-[#bfae9b]/30 bg-[#fffaf1]/48 px-5 py-4 sm:flex-row">
                <div className="flex items-center gap-3 text-xs leading-5 text-[#78695e]">
                  <ShieldCheck
                    className="size-5 shrink-0 text-[#9a642f]"
                    strokeWidth={1.6}
                  />
                  Фото не сохраняются в профиле и удаляются автоматически.
                </div>
                <button
                  className="h-14 w-full rounded-2xl bg-[#281b13] px-7 font-bold text-[#fff8ec] shadow-[0_12px_28px_rgba(49,29,16,0.2)] hover:bg-[#3a271c] sm:w-auto"
                  disabled={!photos.person || !photos.product}
                  onClick={runGeneration}
                  type="button"
                >
                  Примерить образ
                  <Sparkles className="ml-2 size-4 text-[#efc982]" />
                </button>
              </div>
            </div>
          </motion.section>
        )}

        {screen === "processing" && (
          <motion.section
            {...screenMotion}
            className="relative z-10 mx-auto flex min-h-[calc(100dvh-90px)] w-full max-w-[65rem] flex-col items-center justify-center px-5 pb-16 text-center sm:px-8"
            key="processing"
            transition={{ duration: reducedMotion ? 0 : 0.45 }}
          >
            <div className="contents">
              <div className="relative mb-10 flex h-56 w-72 items-center justify-center sm:h-64 sm:w-80">
                <motion.div
                  animate={
                    reducedMotion
                      ? undefined
                      : { rotate: [-5, -8, -5], y: [0, -6, 0] }
                  }
                  className="absolute left-2 top-5 h-44 w-32 overflow-hidden rounded-[1.6rem] border-4 border-[#fffaf1]/85 bg-[#d9cbb8] shadow-[0_18px_45px_rgba(67,40,22,0.17)] sm:h-52 sm:w-40"
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
                  className="absolute bottom-2 right-2 h-44 w-32 overflow-hidden rounded-[1.6rem] border-4 border-[#fffaf1]/85 bg-[#c8a87d] shadow-[0_18px_45px_rgba(67,40,22,0.17)] sm:h-52 sm:w-40"
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
                <div className="absolute z-20 size-24 rounded-full bg-[#2b1d15] shadow-[0_22px_48px_rgba(47,27,14,0.26)] sm:size-28">
                  <span className="processing-ring" />
                  <span className="absolute inset-0 flex items-center justify-center">
                    <Sparkles
                      className="size-8 text-[#efc982]"
                      strokeWidth={1.4}
                    />
                  </span>
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

              <div
                className="mt-8 grid w-full max-w-[25rem] grid-cols-4 gap-2"
                aria-hidden="true"
              >
                {Array.from({ length: 4 }, (_, index) => (
                  <span
                    className={`h-1 rounded-full transition-colors duration-500 ${index <= stageIndex[stage] ? "bg-[#b87531]" : "bg-[#cdbdab]/55"}`}
                    key={index}
                  />
                ))}
              </div>
              <div className="mt-6 flex items-center gap-2 text-xs text-[#827268]">
                <Clock3 className="size-4" strokeWidth={1.6} />
                Обычно это занимает несколько минут
              </div>
            </div>
          </motion.section>
        )}

        {screen === "result" && resultUrl && beforeUrl && (
          <motion.section
            {...screenMotion}
            className="relative z-10 mx-auto grid min-h-[calc(100dvh-90px)] w-full max-w-[76rem] items-center gap-9 px-5 pb-12 pt-4 sm:px-8 lg:grid-cols-[0.92fr_1.08fr] lg:px-12 lg:pb-16"
            key="result"
            transition={{
              duration: reducedMotion ? 0 : 0.6,
              ease: [0.22, 1, 0.36, 1],
            }}
          >
            <div className="contents">
              <div className="mx-auto w-full max-w-[28rem] lg:order-2">
                <CompareView after={resultUrl} before={beforeUrl} />
                <p className="mt-3 text-center text-xs text-[#817064]">
                  Проведи по фото, чтобы сравнить
                </p>
              </div>

              <div className="max-w-[35rem] lg:order-1">
                <div className="mb-5 flex items-center gap-3 text-[0.68rem] font-extrabold uppercase tracking-[0.18em] text-[#9a642f]">
                  <span className="flex size-7 items-center justify-center rounded-full bg-[#2b1d15] text-[#f0c57e]">
                    <Check className="size-3.5" />
                  </span>
                  Образ готов
                </div>
                <h1 className="font-display text-[clamp(3rem,7vw,5.5rem)] font-semibold leading-[0.86] tracking-[-0.045em]">
                  Вот как вещь выглядит на тебе
                </h1>
                <p className="mt-6 max-w-[32rem] text-sm leading-7 text-[#75685e] sm:text-base">
                  Сравни результат с исходным фото и сохрани образ, если он тебе
                  подходит.
                </p>

                <div className="mt-8 flex flex-col gap-3 sm:flex-row">
                  <a
                    className="flex h-14 items-center justify-center rounded-2xl bg-[#281b13] px-7 text-sm font-bold text-[#fff8ec] shadow-[0_16px_35px_rgba(49,29,16,0.22)] transition-colors hover:bg-[#3a271c]"
                    href={resultUrl}
                    download="looksi-result.png"
                    rel="noreferrer"
                    target="_blank"
                  >
                    <Download className="mr-2 size-4" />
                    Скачать результат
                    <ArrowUpRight className="ml-2 size-3.5 text-[#efc982]" />
                  </a>
                  <button
                    className="h-14 rounded-2xl border border-[#9d8875]/35 bg-[#fffaf1]/58 px-7 text-sm font-bold text-[#3b291e] hover:bg-[#fffaf1]"
                    onClick={startAnother}
                    type="button"
                  >
                    <RotateCcw className="mr-2 size-4" />
                    Новая примерка
                  </button>
                </div>

                <div className="mt-8 flex items-start gap-3 border-t border-[#ad9c8a]/30 pt-5 text-xs leading-5 text-[#7c6d62]">
                  <ShieldCheck className="mt-0.5 size-4 shrink-0 text-[#9a642f]" />
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
