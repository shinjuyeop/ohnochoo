import { Search, X } from "lucide-react";
import { useRef, type ComponentProps } from "react";
import { cn } from "../../lib/utils";

type SearchFieldProps = Omit<ComponentProps<"input">, "type"> & { onClear: () => void };

export function SearchField({ className, onClear, ...props }: SearchFieldProps) {
  const input = useRef<HTMLInputElement>(null);
  const label = props["aria-label"] ?? props.placeholder ?? "검색";
  return (
    <div className={cn("search-field", className)}>
      <Search size={20} aria-hidden="true" />
      <input ref={input} type="search" autoComplete="off" {...props} aria-label={label} />
      {props.value ? <button type="button" className="search-clear" aria-label={`${label} 지우기`} onClick={() => { onClear(); input.current?.focus(); }}><X size={15} aria-hidden="true" /></button> : null}
    </div>
  );
}
