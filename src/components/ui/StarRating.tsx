import { Star } from "lucide-react";
import type { KeyboardEvent, MouseEvent } from "react";

export function StarRating({ value, onChange, readOnly = false, label = "별점" }: { value: number; onChange?: (value: number) => void; readOnly?: boolean; label?: string }) {
  const normalized = Math.max(0, Math.min(5, Math.round(value * 2) / 2));
  const update = (next: number) => onChange?.(Math.max(0, Math.min(5, Math.round(next * 2) / 2)));
  const onClick = (event: MouseEvent<HTMLButtonElement>, index: number) => {
    const rect = event.currentTarget.getBoundingClientRect();
    const score = index - (event.clientX - rect.left < rect.width / 2 ? 0.5 : 0);
    update(normalized === 0.5 && score === 0.5 ? 0 : score);
  };
  const onKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if (readOnly) return;
    if (event.key === "ArrowRight" || event.key === "ArrowUp") { event.preventDefault(); update(normalized + 0.5); }
    if (event.key === "ArrowLeft" || event.key === "ArrowDown") { event.preventDefault(); update(normalized - 0.5); }
  };
  return (
    <div className="rating-row">
      <div className="star-picker" role={readOnly ? "img" : "slider"} aria-label={`${label} ${normalized.toFixed(1)}점`} aria-valuemin={readOnly ? undefined : 0} aria-valuemax={readOnly ? undefined : 5} aria-valuenow={readOnly ? undefined : normalized} tabIndex={readOnly ? -1 : 0} onKeyDown={onKeyDown}>
        {[1, 2, 3, 4, 5].map((index) => {
          const fill = Math.max(0, Math.min(1, normalized - index + 1));
          return (
            <button type="button" key={index} disabled={readOnly} tabIndex={-1} onClick={(event) => onClick(event, index)} aria-hidden="true">
              <Star className="star-empty" />
              <span className="star-fill" style={{ width: `${fill * 100}%` }}><Star /></span>
            </button>
          );
        })}
      </div>
      {!readOnly ? <span className="rating-value">{normalized.toFixed(1)}</span> : null}
    </div>
  );
}
