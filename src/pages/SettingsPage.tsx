import { useState } from "react";
import { Bell, BellOff, ChevronRight, LoaderCircle, LogOut, Music2, Send, Shield, Trash2, UserPlus, UsersRound } from "lucide-react";
import { Avatar } from "../components/ui/Avatar";
import { Dialog } from "../components/ui/Dialog";
import { useProfile } from "../features/profile/ProfileContext";
import { useClubData } from "../hooks/useClubData";
import { useClubMutations } from "../hooks/useClubMutations";
import { useNotifications } from "../hooks/useNotifications";
import { useToast } from "../components/ui/Toast";
import { ADMIN_PASSWORD } from "../lib/constants";
import { emptyVoteStats, isMutigoeulReady } from "../lib/songRules";
import { errorMessage } from "../lib/utils";

type AdminDialog = "members" | "move" | "delete" | null;

export function SettingsPage() {
  const { profile, clearProfile } = useProfile();
  const { data, onochuSongs, mutigoeulSongs, voteStats } = useClubData();
  const mutations = useClubMutations();
  const notifications = useNotifications(profile);
  const toast = useToast();
  const [dialog, setDialog] = useState<AdminDialog>(null);
  const [memberName, setMemberName] = useState("");
  const [songId, setSongId] = useState("");
  if (!profile || !data) return null;

  const requirePassword = (label: string) => {
    if (window.prompt(`${label} 비밀번호를 입력하세요`) === ADMIN_PASSWORD) return true;
    toast("비밀번호가 올바르지 않아요.", "error");
    return false;
  };
  const eligible = onochuSongs.filter((song) => {
    const stats = voteStats.get(song.id) ?? emptyVoteStats();
    return isMutigoeulReady(song, stats.promotedCount, stats.releasedCount);
  });
  const allSongs = [...onochuSongs, ...mutigoeulSongs];

  const addMember = async (event: React.FormEvent) => {
    event.preventDefault();
    const name = memberName.trim();
    if (!name || !requirePassword("평가자 추가")) return;
    if (data.members.some((member) => member.name === name)) return toast("이미 등록된 평가자예요.", "error");
    try { await mutations.addMember.mutateAsync(name); setMemberName(""); toast("평가자를 추가했어요.", "success"); }
    catch (error) { toast(errorMessage(error), "error"); }
  };
  const moveSong = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!songId || !requirePassword("무티고을 이동")) return;
    try { await mutations.moveToMutigoeul.mutateAsync(songId); setSongId(""); setDialog(null); toast("무티고을로 이동했어요.", "success"); }
    catch (error) { toast(errorMessage(error), "error"); }
  };
  const deleteSong = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!songId || !requirePassword("노래 삭제")) return;
    const song = data.songs.find((item) => item.id === songId);
    if (!song || !window.confirm(`‘${song.title}’을 정말 삭제할까요? 평가도 함께 삭제됩니다.`)) return;
    try { await mutations.deleteSong.mutateAsync(songId); setSongId(""); setDialog(null); toast("노래를 삭제했어요.", "success"); }
    catch (error) { toast(errorMessage(error), "error"); }
  };
  const notificationAction = async (action: () => Promise<unknown>, success: string) => {
    try { const result = await action() as { count?: number } | undefined; toast(result?.count !== undefined ? `${success} (${result.count}개 기기)` : success, "success"); }
    catch (error) { toast(errorMessage(error), "error"); }
  };

  return (
    <div className="page settings-page">
      <header className="page-header"><div><span className="eyebrow">SETTINGS</span><h1>내 정보</h1><p>프로필과 이 기기의 알림을 관리해요.</p></div></header>
      <div className="settings-layout">
        <div className="settings-main">
          <section className="settings-card profile-settings-card">
            <Avatar name={profile.name} size="lg" /><div><span>현재 프로필</span><h2>{profile.name}</h2><p>평가자</p></div><button className="secondary-button" onClick={clearProfile}><LogOut size={17} /> 프로필 변경</button>
          </section>
          <section className="settings-card">
            <div className="settings-title"><span className="settings-icon"><Bell /></span><div><h2>알림</h2><p>이 브라우저에 연결된 푸시 알림을 관리해요.</p></div></div>
            <div className="notification-state"><span className={notifications.enabled ? "on" : "off"}>{notifications.enabled ? <Bell size={18} /> : <BellOff size={18} />}</span><div><b>{notifications.status}</b><p>{notifications.hint}</p></div></div>
            <div className="settings-actions">
              {!notifications.enabled && !notifications.blocked ? <button className="primary-button" onClick={() => void notificationAction(notifications.enable, "알림을 켰어요.")}><Bell size={17} /> 알림 받기</button> : null}
              {notifications.enabled ? <><button className="secondary-button" onClick={() => void notificationAction(notifications.sendTest, "테스트 알림을 보냈어요.")}><Send size={17} /> 테스트 알림</button><button className="ghost-danger-button" onClick={() => void notificationAction(notifications.disable, "알림을 껐어요.")}><BellOff size={17} /> 알림 끄기</button></> : null}
            </div>
          </section>
        </div>
        <aside className="admin-panel">
          <div className="admin-heading"><Shield /><div><h2>관리 도구</h2><p>필요할 때만 사용하는 기능이에요.</p></div></div>
          <button onClick={() => setDialog("members")}><span className="admin-action-icon"><UsersRound /></span><span><b>평가자 관리</b><small>{data.members.length}명 참여 중</small></span><ChevronRight /></button>
          <button onClick={() => { setSongId(""); setDialog("move"); }}><span className="admin-action-icon"><Music2 /></span><span><b>무티고을로 보내기</b><small>이동 가능한 곡 {eligible.length}개</small></span><ChevronRight /></button>
          <button className="danger-row" onClick={() => { setSongId(""); setDialog("delete"); }}><span className="admin-action-icon"><Trash2 /></span><span><b>노래 삭제</b><small>오노추와 무티고을에서 삭제</small></span><ChevronRight /></button>
        </aside>
      </div>

      <Dialog open={dialog === "members"} onOpenChange={(open) => { if (!open) setDialog(null); }} title="평가자 관리" description="현재 평가자와 새 평가자를 관리해요.">
        <div className="dialog-body"><div className="member-list">{data.members.map((member) => <div key={member.id}><Avatar name={member.name} size="sm" /><span>{member.name}</span></div>)}</div><form className="inline-add-form" onSubmit={addMember}><input value={memberName} onChange={(event) => setMemberName(event.target.value)} placeholder="새 평가자 이름" /><button className="primary-button" disabled={mutations.addMember.isPending}>{mutations.addMember.isPending ? <LoaderCircle className="spin" /> : <UserPlus size={17} />} 추가</button></form></div>
      </Dialog>
      <Dialog open={dialog === "move"} onOpenChange={(open) => { if (!open) setDialog(null); }} title="무티고을로 보내기" description="7일과 승격 조건을 모두 만족한 곡만 이동할 수 있어요.">
        <form className="dialog-body form-stack" onSubmit={moveSong}><label className="field-label"><span>이동할 곡</span><select value={songId} onChange={(event) => setSongId(event.target.value)} disabled={!eligible.length}><option value="">{eligible.length ? "곡을 선택해 주세요" : "이동 가능한 곡이 없어요"}</option>{eligible.map((song) => <option key={song.id} value={song.id}>{song.title} — {song.artist}</option>)}</select></label><button className="primary-button" disabled={!songId || mutations.moveToMutigoeul.isPending}>{mutations.moveToMutigoeul.isPending ? "이동 중..." : "무티고을로 보내기"}</button></form>
      </Dialog>
      <Dialog open={dialog === "delete"} onOpenChange={(open) => { if (!open) setDialog(null); }} title="노래 삭제" description="곡과 연결된 평가가 함께 삭제되는 관리자 기능입니다.">
        <form className="dialog-body form-stack" onSubmit={deleteSong}><label className="field-label"><span>삭제할 곡</span><select value={songId} onChange={(event) => setSongId(event.target.value)}><option value="">곡을 선택해 주세요</option>{allSongs.map((song) => <option key={song.id} value={song.id}>[{mutigoeulSongs.some((item) => item.id === song.id) ? "무티고을" : "오노추"}] {song.title} — {song.artist}</option>)}</select></label><button className="danger-button" disabled={!songId || mutations.deleteSong.isPending}>{mutations.deleteSong.isPending ? "삭제 중..." : "노래 삭제"}</button></form>
      </Dialog>
    </div>
  );
}
