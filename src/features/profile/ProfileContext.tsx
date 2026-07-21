import { createContext, useContext, useMemo, useState, type ReactNode } from "react";
import type { Member } from "../../types";

type SelectedProfile = Pick<Member, "id" | "name" | "avatar_url" | "avatar_updated_at">;

interface ProfileContextValue {
  profile: SelectedProfile | null;
  selectProfile: (member: SelectedProfile) => void;
  clearProfile: () => void;
}

const ProfileContext = createContext<ProfileContextValue | null>(null);

function readStoredProfile(): SelectedProfile | null {
  const id = localStorage.getItem("selectedMemberId") || "";
  const name = localStorage.getItem("selectedMemberName") || "";
  const avatar_url = localStorage.getItem("selectedMemberAvatarUrl") || null;
  const avatar_updated_at = localStorage.getItem("selectedMemberAvatarUpdatedAt") || null;
  return id || name ? { id, name, avatar_url, avatar_updated_at } : null;
}

export function ProfileProvider({ children }: { children: ReactNode }) {
  const [profile, setProfile] = useState<SelectedProfile | null>(readStoredProfile);

  const value = useMemo<ProfileContextValue>(
    () => ({
      profile,
      selectProfile(member) {
        localStorage.setItem("selectedMemberId", member.id);
        localStorage.setItem("selectedMemberName", member.name);
        if (member.avatar_url) localStorage.setItem("selectedMemberAvatarUrl", member.avatar_url);
        else localStorage.removeItem("selectedMemberAvatarUrl");
        if (member.avatar_updated_at) localStorage.setItem("selectedMemberAvatarUpdatedAt", member.avatar_updated_at);
        else localStorage.removeItem("selectedMemberAvatarUpdatedAt");
        setProfile(member);
      },
      clearProfile() {
        localStorage.removeItem("selectedMemberId");
        localStorage.removeItem("selectedMemberName");
        localStorage.removeItem("selectedMemberAvatarUrl");
        localStorage.removeItem("selectedMemberAvatarUpdatedAt");
        setProfile(null);
      },
    }),
    [profile],
  );

  return <ProfileContext.Provider value={value}>{children}</ProfileContext.Provider>;
}

export function useProfile() {
  const context = useContext(ProfileContext);
  if (!context) throw new Error("ProfileProvider가 필요합니다.");
  return context;
}
