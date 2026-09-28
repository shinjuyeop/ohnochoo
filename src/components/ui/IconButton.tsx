import type { ComponentProps } from "react";
import { cn } from "../../lib/utils";

export function IconButton({ className, type = "button", ...props }: ComponentProps<"button"> & { "aria-label": string }) {
  return <button type={type} className={cn("icon-button glass-control", className)} {...props} />;
}
