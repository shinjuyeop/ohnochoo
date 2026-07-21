import { useEffect, useState, type ReactNode } from "react";
import { LoaderCircle, Plus, UsersRound } from "lucide-react";
import { Avatar } from "./ui/Avatar";
import { Dialog } from "./ui/Dialog";
import { useClubData } from "../hooks/useClubData";
import { useClubMutations } from "../hooks/useClubMutations";
import { useProfile } from "../features/profile/ProfileContext";
import { useToast } from "./ui/Toast";
import { errorMessage } from "../lib/utils";
import { useAdminAuth } from "../features/admin/AdminAuthContext";
import { AdminLoginForm } from "../features/admin/AdminLoginForm";

export function ProfileGate({ children }: { children: ReactNode }) {
  const { data, isLoading, error } = useClubData();
  const { profile, selectProfile, clearProfile } = useProfile();
  const { addMember } = useClubMutations();
  const toast = useToast();
  const { isAdmin } = useAdminAuth();
  const [manageOpen, setManageOpen] = useState(false);
  const [memberName, setMemberName] = useState("");

  useEffect(() => {
    if (!profile || !data) return;
    const match = data.members.find((member) => member.id === profile.id || member.name === profile.name);
    if (!match) clearProfile();
    else if (match.id !== profile.id || match.name !== profile.name || match.avatar_url !== profile.avatar_url || match.avatar_updated_at !== profile.avatar_updated_at) selectProfile(match);
  }, [data, profile, clearProfile, selectProfile]);

  const createMember = async (event: React.FormEvent) => {
    event.preventDefault();
    const name = memberName.trim();
    if (!name) return;
    if (data?.members.some((member) => member.name === name)) {
      toast("이미 등록된 평가자예요.", "error");
      return;
    }
    if (!isAdmin) {
      toast("관리자 로그인이 필요해요.", "error");
      return;
    }
    try {
      await addMember.mutateAsync(name);
      setMemberName("");
      setManageOpen(false);
      toast("새 평가자를 추가했어요.", "success");
    } catch (mutationError) {
      toast(`평가자 추가 실패: ${errorMessage(mutationError)}`, "error");
    }
  };

  if (isLoading) {
    return <div className="app-loading"><div className="brand-mark">O</div><LoaderCircle className="spin" /><p>불러오는 중...</p></div>;
  }
  if (error || !data) {
    return <div className="app-loading error-state"><CircleError /><h1>연결하지 못했어요</h1><p>{errorMessage(error)}</p><button onClick={() => window.location.reload()}>다시 시도</button></div>;
  }
  if (profile) return children;

  return (
    <main className="profile-gate">
      <div className="profile-gate-inner">
        <div className="brand-lockup"><span className="brand-mark">O</span><span>ohnochoo</span></div>
        <div className="profile-intro">
          <h1>프로필 선택</h1>
        </div>
        {data.members.length ? (
          <div className="profile-grid">
            {data.members.map((member) => (
              <button key={member.id} className="profile-choice" onClick={() => selectProfile(member)}>
                <Avatar name={member.name} imageUrl={member.avatar_url} imageVersion={member.avatar_updated_at} size="lg" />
                <span>{member.name}</span>
              </button>
            ))}
          </div>
        ) : <div className="empty-card"><UsersRound /><p>아직 등록된 평가자가 없어요.</p></div>}
        <button className="text-button profile-add" onClick={() => setManageOpen(true)}><Plus size={17} /> 평가자 추가</button>
      </div>
      <Dialog open={manageOpen} onOpenChange={setManageOpen} title="평가자 추가" description="새 평가자의 이름을 등록해요.">
        <div className="dialog-body">
          {isAdmin ? (
            <form className="form-stack" onSubmit={createMember}>
              <label><span>이름</span><input value={memberName} onChange={(event) => setMemberName(event.target.value)} placeholder="이름 입력" autoFocus /></label>
              <button className="primary-button" disabled={!memberName.trim() || addMember.isPending}>{addMember.isPending ? "추가 중..." : "평가자 추가"}</button>
            </form>
          ) : <AdminLoginForm />}
        </div>
      </Dialog>
    </main>
  );
}

function CircleError() {
  return <span className="error-symbol">!</span>;
}
