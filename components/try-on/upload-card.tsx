import { Check, ImagePlus, RefreshCw } from "lucide-react";
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
  selection?: PhotoSelection;
  onSelect: (file: File) => void;
};

const accept =
  "image/jpeg,image/png,image/webp,image/heic,image/heif,.heic,.heif";

export function UploadCard({
  index,
  title,
  description,
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
      data-selected={Boolean(selection)}
    >
      <input
        accept={accept}
        className="sr-only"
        onChange={handleChange}
        type="file"
      />

      {selection?.previewUrl ? (
        <img alt={title} src={selection.previewUrl} />
      ) : (
        <div className="flex h-full min-h-[inherit] flex-col items-center justify-center px-7 py-10 text-center">
          <span className="mb-6 flex size-14 items-center justify-center rounded-2xl border border-[#d8c9b8] bg-[#fffaf1] text-[#9d6228] shadow-[0_10px_30px_rgba(84,48,18,0.09)]">
            <ImagePlus className="size-6" strokeWidth={1.5} />
          </span>
          <span className="font-display text-[2rem] font-semibold leading-none text-[#2b1d15]">
            {title}
          </span>
          <span className="mt-3 max-w-[18rem] text-sm leading-6 text-[#75685e]">
            {selection?.isHeic ? "HEIC готов к обработке" : description}
          </span>
          {selection && (
            <span className="mt-4 max-w-full truncate rounded-full border border-[#d8c9b8] bg-[#fffaf1]/80 px-3 py-1.5 text-xs font-semibold text-[#684b36]">
              {selection.file.name}
            </span>
          )}
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
