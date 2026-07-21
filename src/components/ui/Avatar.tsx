import { avatarTone, cn, getInitials } from "../../lib/utils";

export function Avatar({ name, imageUrl, imageVersion, size = "md" }: { name: string; imageUrl?: string | null; imageVersion?: string | null; size?: "sm" | "md" | "lg" | "vote" }) {
  const separator = imageUrl?.includes("?") ? "&" : "?";
  const source = imageUrl ? `${imageUrl}${separator}v=${encodeURIComponent(imageVersion || "current")}` : null;
  return (
    <span className={cn("avatar", `avatar-${size}`, `avatar-${avatarTone(name)}`, source && "avatar-has-image")} aria-hidden="true">
      {source ? <img src={source} alt="" /> : getInitials(name)}
    </span>
  );
}
