import { avatarTone, cn, getInitials } from "../../lib/utils";

export function Avatar({ name, size = "md" }: { name: string; size?: "sm" | "md" | "lg" }) {
  return <span className={cn("avatar", `avatar-${size}`, `avatar-${avatarTone(name)}`)} aria-hidden="true">{getInitials(name)}</span>;
}
