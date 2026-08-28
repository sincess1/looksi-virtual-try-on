import { Check, ImagePlus, RefreshCw } from "lucide-react";
import Image from "next/image";
import type { ChangeEvent } from "react";

export type PhotoSelection = {
  file: File;
  previewUrl?: string;
  isHeic: boolean;
};

type UploadCardProps = {
  index: string;
  title: string;
  description: string;
  exampleSrc: string;
  selection?: PhotoSelection;
  onSelect: (file: File) => void;
};

const accept =
  "image/jpeg,image/png,image/webp,image/heic,image/heif,.heic,.heif";

export function UploadCard({
  index,
  title,
  description,
  exampleSrc,
  selection,
  onSelect,
}: UploadCardProps) {
  const handleChange = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) onSelect(file);
    event.target.value = "";
  };

  return (
    <label
      className="upload-card block cursor-pointer"
      data-example={index}
      data-selected={Boolean(selection)}
    >
      <input
        accept={accept}
        className="upload-file-input"
        onChange={handleChange}
        type="file"
      />

      {selection?.previewUrl ? (
        <img alt={title} src={selection.previewUrl} />
      ) : (
        <div className="upload-empty">
          <div className="upload-example-visual">
            <Image
              alt=""
              className="object-contain"
              fill
              sizes="(max-width: 768px) 48vw, 260px"
              src={exampleSrc}
            />
          </div>
          <div className="upload-empty-copy">
            <span className="upload-icon">
              <ImagePlus className="size-5" strokeWidth={1.5} />
            </span>
            <span className="font-display text-[1.8rem] font-semibold leading-none text-[#2b1d15]">
              {title}
            </span>
            <span className="mt-3 text-sm leading-6 text-[#75685e]">
              {selection?.isHeic ? "HEIC готов к обработке" : description}
            </span>
            {selection && (
              <span className="mt-4 max-w-full truncate rounded-full border border-[#d8c9b8] bg-[#fffaf1]/80 px-3 py-1.5 text-xs font-semibold text-[#684b36]">
                {selection.file.name}
              </span>
            )}
          </div>
        </div>
      )}

      <span className="absolute left-4 top-4 flex size-8 items-center justify-center rounded-full border border-white/65 bg-[#fffaf1]/85 text-[0.68rem] font-bold text-[#624a39] shadow-sm backdrop-blur-md">
        {selection ? <Check className="size-4" strokeWidth={2.2} /> : index}
      </span>

      {selection?.previewUrl && (
        <span className="absolute inset-x-3 bottom-3 flex items-center justify-between rounded-2xl border border-white/60 bg-[#2b1d15]/75 px-4 py-3 text-xs font-semibold text-white backdrop-blur-md">
          <span className="max-w-[70%] truncate">{selection.file.name}</span>
          <span className="flex items-center gap-1.5 text-[#f3cf94]">
            <RefreshCw className="size-3.5" />
            Заменить
          </span>
        </span>
      )}
    </label>
  );
}
