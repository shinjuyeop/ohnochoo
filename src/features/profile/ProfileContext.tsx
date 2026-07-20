import { createContext, useContext, useMemo, useState, type ReactNode } from "react";
import type { Member } from "../../types";

type SelectedProfile = Pick<Member, "id" | "name">;

interface ProfileContextValue {
  profile: SelectedProfile | null;
  selectProfile: (member: SelectedProfile) => void;
  clearProfile: () => void;
}

const ProfileContext = createContext<ProfileContextValue | null>(null);

function readStoredProfile(): SelectedProfile | null {
  const id = localStorage.getItem("selectedMemberId") || "";
  const name = localStorage.getItem("selectedMemberName") || "";
  return id || name ? { id, name } : null;
}

export function ProfileProvider({ children }: { children: ReactNode }) {
  const [profile, setProfile] = useState<SelectedProfile | null>(readStoredProfile);

  const value = useMemo<ProfileContextValue>(
    () => ({
      profile,
      selectProfile(member) {
        localStorage.setItem("selectedMemberId", member.id);
        localStorage.setItem("selectedMemberName", member.name);
        setProfile(member);
      },
      clearProfile() {
        localStorage.removeItem("selectedMemberId");
        localStorage.removeItem("selectedMemberName");
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
