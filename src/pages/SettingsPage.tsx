import { useState } from "react";
import { Bell, BellOff, ChevronRight, LoaderCircle, LockKeyhole, LogOut, Music2, Search, Send, Shield, Trash2, UserPlus, UsersRound } from "lucide-react";
import { Avatar } from "../components/ui/Avatar";
import { Dialog } from "../components/ui/Dialog";
import { AdminLoginForm } from "../features/admin/AdminLoginForm";
import { useAdminAuth } from "../features/admin/AdminAuthContext";
import { useProfile } from "../features/profile/ProfileContext";
import { useClubData } from "../hooks/useClubData";
import { useClubMutations } from "../hooks/useClubMutations";
import { useNotifications } from "../hooks/useNotifications";
import { useToast } from "../components/ui/Toast";
import { emptyVoteStats, getSongStatus, isMutigoeulReady } from "../lib/songRules";
import { errorMessage } from "../lib/utils";

type AdminDialog = "members" | "move" | "delete" | null;
type DeleteFilter = "release" | "all";

export function SettingsPage() {
  const { profile, clearProfile } = useProfile();
  const { data, onochuSongs, mutigoeulSongs, voteStats } = useClubData();
  const { user, isAdmin, isLoading: isAdminLoading, logout } = useAdminAuth();
  const mutations = useClubMutations();
  const notifications = useNotifications(profile);
  const toast = useToast();
  const [dialog, setDialog] = useState<AdminDialog>(null);
  const [memberName, setMemberName] = useState("");
  const [songId, setSongId] = useState("");
  const [deleteFilter, setDeleteFilter] = useState<DeleteFilter>("release");
  const [deleteSearch, setDeleteSearch] = useState("");
  const [selectedSongIds, setSelectedSongIds] = useState<string[]>([]);
  if (!profile || !data) return null;

  const eligible = onochuSongs.filter((song) => {
    const stats = voteStats.get(song.id) ?? emptyVoteStats();
    return isMutigoeulReady(song, stats.promotedCount, stats.releasedCount);
  });
  const mutigoeulIds = new Set(mutigoeulSongs.map((song) => song.id));
  const releaseCandidates = onochuSongs.filter((song) => {
    const stats = voteStats.get(song.id) ?? emptyVoteStats();
    return getSongStatus(song, stats.promotedCount, stats.releasedCount).tone === "release";
  });
  const deleteCandidates = deleteFilter === "release" ? releaseCandidates : [...onochuSongs, ...mutigoeulSongs];
  const normalizedSearch = deleteSearch.trim().toLocaleLowerCase("ko-KR");
  const visibleDeleteCandidates = deleteCandidates.filter((song) =>
    !normalizedSearch || `${song.title} ${song.artist} ${song.adder}`.toLocaleLowerCase("ko-KR").includes(normalizedSearch),
  );
  const visibleIds = visibleDeleteCandidates.map((song) => song.id);
  const selectedIds = new Set(selectedSongIds);
  const allVisibleSelected = visibleIds.length > 0 && visibleIds.every((id) => selectedIds.has(id));

  const openDeleteDialog = () => {
    setDeleteFilter("release");
    setDeleteSearch("");
    setSelectedSongIds([]);
    setDialog("delete");
  };
  const toggleSong = (id: string) => {
    setSelectedSongIds((current) => current.includes(id) ? current.filter((item) => item !== id) : [...current, id]);
  };
  const toggleVisible = () => {
    setSelectedSongIds((current) => {
      const currentSet = new Set(current);
      if (allVisibleSelected) visibleIds.forEach((id) => currentSet.delete(id));
      else visibleIds.forEach((id) => currentSet.add(id));
      return [...currentSet];
    });
  };
  const addMember = async (event: React.FormEvent) => {
    event.preventDefault();
    const name = memberName.trim();
    if (!name || !isAdmin) return;
    if (data.members.some((member) => member.name === name)) return toast("이미 등록된 평가자예요.", "error");
    try { await mutations.addMember.mutateAsync(name); setMemberName(""); toast("평가자를 추가했어요.", "success"); }
    catch (error) { toast(errorMessage(error), "error"); }
  };
  const moveSong = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!songId || !isAdmin) return;
    try { await mutations.moveToMutigoeul.mutateAsync(songId); setSongId(""); setDialog(null); toast("무티고을로 이동했어요.", "success"); }
    catch (error) { toast(errorMessage(error), "error"); }
  };
  const deleteSelectedSongs = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!selectedSongIds.length || !isAdmin) return;
    const selectedSongs = data.songs.filter((song) => selectedIds.has(song.id));
    const preview = selectedSongs.slice(0, 3).map((song) => `‘${song.title}’`).join(", ");
    const rest = selectedSongs.length > 3 ? ` 외 ${selectedSongs.length - 3}곡` : "";
    if (!window.confirm(`${preview}${rest}을 삭제할까요? 연결된 평가도 함께 삭제됩니다.`)) return;
    try {
      const count = await mutations.deleteSongs.mutateAsync(selectedSongIds);
      setSelectedSongIds([]);
      setDialog(null);
      toast(`${count}곡을 삭제했어요.`, "success");
    } catch (error) { toast(errorMessage(error), "error"); }
  };
  const logoutAdmin = async () => {
    try { await logout(); toast("관리자 모드를 종료했어요.", "success"); }
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
          <div className="admin-heading"><Shield /><div><h2>관리 도구</h2><p>{isAdmin ? "관리자 모드가 켜져 있어요." : "관리자만 사용할 수 있어요."}</p></div></div>
          {isAdminLoading ? <div className="admin-auth-loading"><LoaderCircle className="spin" /> 권한 확인 중...</div> : isAdmin ? (
            <>
              <div className="admin-session"><span><b>관리자</b><small>{user?.email}</small></span><button onClick={() => void logoutAdmin()}>로그아웃</button></div>
              <button onClick={() => setDialog("members")}><span className="admin-action-icon"><UsersRound /></span><span><b>평가자 관리</b><small>{data.members.length}명 참여 중</small></span><ChevronRight /></button>
              <button onClick={() => { setSongId(""); setDialog("move"); }}><span className="admin-action-icon"><Music2 /></span><span><b>무티고을로 보내기</b><small>이동 가능한 곡 {eligible.length}개</small></span><ChevronRight /></button>
              <button className="danger-row" onClick={openDeleteDialog}><span className="admin-action-icon"><Trash2 /></span><span><b>곡 정리</b><small>방출 예정 {releaseCandidates.length}곡 · 여러 곡 선택 가능</small></span><ChevronRight /></button>
            </>
          ) : <div className="admin-panel-login"><AdminLoginForm /></div>}
        </aside>
      </div>

      <Dialog open={dialog === "members"} onOpenChange={(open) => { if (!open) setDialog(null); }} title="평가자 관리" description="현재 평가자와 새 평가자를 관리해요.">
        <div className="dialog-body"><div className="member-list">{data.members.map((member) => <div key={member.id}><Avatar name={member.name} size="sm" /><span>{member.name}</span></div>)}</div><form className="inline-add-form" onSubmit={addMember}><input value={memberName} onChange={(event) => setMemberName(event.target.value)} placeholder="새 평가자 이름" /><button className="primary-button" disabled={mutations.addMember.isPending}>{mutations.addMember.isPending ? <LoaderCircle className="spin" /> : <UserPlus size={17} />} 추가</button></form></div>
      </Dialog>
      <Dialog open={dialog === "move"} onOpenChange={(open) => { if (!open) setDialog(null); }} title="무티고을로 보내기" description="7일과 승격 조건을 모두 만족한 곡만 이동할 수 있어요.">
        <form className="dialog-body form-stack" onSubmit={moveSong}><label className="field-label"><span>이동할 곡</span><select value={songId} onChange={(event) => setSongId(event.target.value)} disabled={!eligible.length}><option value="">{eligible.length ? "곡을 선택해 주세요" : "이동 가능한 곡이 없어요"}</option>{eligible.map((song) => <option key={song.id} value={song.id}>{song.title} — {song.artist}</option>)}</select></label><button className="primary-button" disabled={!songId || mutations.moveToMutigoeul.isPending}>{mutations.moveToMutigoeul.isPending ? "이동 중..." : "무티고을로 보내기"}</button></form>
      </Dialog>
      <Dialog open={dialog === "delete"} onOpenChange={(open) => { if (!open) setDialog(null); }} title="곡 정리" description="삭제할 곡을 여러 개 선택할 수 있어요." className="admin-delete-dialog">
        <form className="dialog-body admin-delete-body" onSubmit={deleteSelectedSongs}>
          <div className="admin-delete-tools">
            <div className="admin-delete-filters" aria-label="삭제 목록 필터">
              <button type="button" className={deleteFilter === "release" ? "active" : ""} onClick={() => { setDeleteFilter("release"); setSelectedSongIds([]); }}>방출 예정 <span>{releaseCandidates.length}</span></button>
              <button type="button" className={deleteFilter === "all" ? "active" : ""} onClick={() => { setDeleteFilter("all"); setSelectedSongIds([]); }}>전체 곡 <span>{data.songs.length}</span></button>
            </div>
            <label className="admin-song-search"><Search /><input value={deleteSearch} onChange={(event) => setDeleteSearch(event.target.value)} placeholder="제목, 아티스트 검색" /></label>
            <div className="admin-select-row"><label><input type="checkbox" checked={allVisibleSelected} onChange={toggleVisible} disabled={!visibleIds.length} /> 현재 목록 전체 선택</label><span>{selectedSongIds.length}곡 선택</span></div>
          </div>
          <div className="admin-song-list">
            {visibleDeleteCandidates.length ? visibleDeleteCandidates.map((song) => {
              const stats = voteStats.get(song.id) ?? emptyVoteStats();
              const inMutigoeul = mutigoeulIds.has(song.id);
              const status = inMutigoeul ? { label: "무티고을", tone: "ready" as const } : getSongStatus(song, stats.promotedCount, stats.releasedCount);
              return (
                <label key={song.id} className={`admin-song-option ${selectedIds.has(song.id) ? "selected" : ""}`}>
                  <input type="checkbox" checked={selectedIds.has(song.id)} onChange={() => toggleSong(song.id)} />
                  <span className="admin-song-cover">{song.coverImageUrl ? <img src={song.coverImageUrl} alt="" /> : <Music2 />}</span>
                  <span className="admin-song-copy"><b>{song.title}</b><small>{song.artist}</small><em className={`admin-status admin-status-${status.tone}`}>{status.label}</em></span>
                  <span className="admin-vote-counts"><b>{stats.promotedCount}</b> 승격 <b>{stats.releasedCount}</b> 방출</span>
                </label>
              );
            }) : <div className="admin-empty"><LockKeyhole /><p>{deleteFilter === "release" ? "방출 예정인 곡이 없어요." : "검색 결과가 없어요."}</p></div>}
          </div>
          <div className="admin-delete-footer"><span>선택한 곡과 연결된 평가가 함께 삭제됩니다.</span><button className="danger-button" disabled={!selectedSongIds.length || mutations.deleteSongs.isPending}>{mutations.deleteSongs.isPending ? "삭제 중..." : `${selectedSongIds.length}곡 삭제`}</button></div>
        </form>
      </Dialog>
    </div>
  );
}
