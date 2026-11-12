import { Star } from "lucide-react";
import type { KeyboardEvent, MouseEvent } from "react";

export function StarRating({ value, onChange, readOnly = false, label = "별점" }: { value: number; onChange?: (value: number) => void; readOnly?: boolean; label?: string }) {
  const normalized = Math.max(0, Math.min(5, Math.round(value * 2) / 2));
  if (readOnly && normalized === 0) return null;
  const update = (next: number) => onChange?.(Math.max(0, Math.min(5, Math.round(next * 2) / 2)));
  const onClick = (event: MouseEvent<HTMLDivElement>) => {
    if (readOnly) return;
    const rect = event.currentTarget.getBoundingClientRect();
    if (!rect.width) return;
    const score = Math.max(0.5, Math.min(5, Math.ceil((event.clientX - rect.left) / rect.width * 10) / 2));
    event.currentTarget.focus();
    update(normalized === 0.5 && score === 0.5 ? 0 : score);
  };
  const onKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if (readOnly) return;
    if (event.key === "ArrowRight" || event.key === "ArrowUp") { event.preventDefault(); update(normalized + 0.5); }
    if (event.key === "ArrowLeft" || event.key === "ArrowDown") { event.preventDefault(); update(normalized - 0.5); }
    if (event.key === "Home" || event.key === "Backspace" || event.key === "Delete" || event.key === "0") { event.preventDefault(); update(0); }
  };
  return (
    <div className="rating-row" data-empty={normalized === 0 ? "true" : undefined}>
      <div className="star-picker" role={readOnly ? "img" : "slider"} aria-label={readOnly ? `${label} ${normalized === 0 ? "미입력" : `${normalized.toFixed(1)}점`}` : label} aria-valuetext={readOnly ? undefined : normalized === 0 ? "미입력, 평균에서 제외" : `${normalized.toFixed(1)}점`} aria-valuemin={readOnly ? undefined : 0} aria-valuemax={readOnly ? undefined : 5} aria-valuenow={readOnly ? undefined : normalized} aria-orientation={readOnly ? undefined : "horizontal"} tabIndex={readOnly ? undefined : 0} onKeyDown={onKeyDown} onClick={readOnly ? undefined : onClick}>
        {[1, 2, 3, 4, 5].map((index) => {
          const fill = Math.max(0, Math.min(1, normalized - index + 1));
          return (
            <span className="star-step" key={index} aria-hidden="true">
              <span className="star-glyph"><Star className="star-empty" /><span className="star-fill" style={{ width: `${fill * 100}%` }}><Star /></span></span>
            </span>
          );
        })}
      </div>
      {!readOnly ? (
        <div className="star-rating-meta">
          <span className={`star-rating-value ${normalized === 0 ? "is-empty" : ""}`}>
            {normalized === 0 ? "미입력" : `${normalized.toFixed(1)}점`}
          </span>
          {normalized > 0 ? (
            <button
              type="button"
              className="star-rating-reset"
              onClick={() => update(0)}
              aria-label="별점 미입력으로 초기화"
            >
              초기화
            </button>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
