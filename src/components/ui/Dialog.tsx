import * as DialogPrimitive from "@radix-ui/react-dialog";
import { X } from "lucide-react";
import type { ReactNode } from "react";
import { cn } from "../../lib/utils";
import { IconButton } from "./IconButton";

interface DialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description?: string;
  children: ReactNode;
  className?: string;
}

export function Dialog({ open, onOpenChange, title, description, children, className }: DialogProps) {
  return (
    <DialogPrimitive.Root open={open} onOpenChange={onOpenChange}>
      <DialogPrimitive.Portal>
        <DialogPrimitive.Overlay className="dialog-overlay" />
        <DialogPrimitive.Content className={cn("dialog-content", className)} {...(!description ? { "aria-describedby": undefined } : {})}>
          <header className="dialog-header">
            <div>
              <DialogPrimitive.Title>{title}</DialogPrimitive.Title>
              {description ? <DialogPrimitive.Description>{description}</DialogPrimitive.Description> : null}
            </div>
            <DialogPrimitive.Close asChild><IconButton aria-label="닫기"><X size={22} aria-hidden="true" /></IconButton></DialogPrimitive.Close>
          </header>
          {children}
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  );
}
