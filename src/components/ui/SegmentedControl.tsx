import type { CSSProperties, ReactNode } from "react";
import { cn } from "../../lib/utils";

interface Segment<T extends string> { value: T; label: ReactNode; accessibleLabel?: string }

export function SegmentedControl<T extends string>({ value, options, onChange, label, className }: {
  value: T;
  options: Segment<T>[];
  onChange: (value: T) => void;
  label: string;
  className?: string;
}) {
  const style = { "--segment-count": options.length, "--segment-index": Math.max(0, options.findIndex((option) => option.value === value)) } as CSSProperties;
  return (
    <div className={cn("segmented-control", className)} style={style} role="group" aria-label={label}>
      {options.map((option) => <button type="button" key={option.value} className={value === option.value ? "active" : ""} aria-label={option.accessibleLabel} aria-pressed={value === option.value} onClick={() => onChange(option.value)}>{option.label}</button>)}
    </div>
  );
}
