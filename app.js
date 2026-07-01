const state = {
    songs: [],
    votes: [],
    members: [],
    memberRecords: [],
    mutigoeulSongs: [],
    voteStatsBySongId: new Map(),
};

const selectedProfile = {
    id: localStorage.getItem("selectedMemberId") || "",
    name: localStorage.getItem("selectedMemberName") || "",
};

let supabaseClient = null;
let activeSongFilter = "all";
let isVoteSaveInFlight = false;
let lockedBodyScrollY = 0;

const songForm = document.getElementById("songForm");
const songTitle = document.getElementById("songTitle");
const songArtist = document.getElementById("songArtist");
const songAdder = document.getElementById("songAdder");
const recommendationReason = document.getElementById("recommendationReason");
const addRatingPicker = document.getElementById("addRatingPicker");
const addRatingStars = document.querySelectorAll("#addRatingPicker .rating-star");
const addRatingValue = document.getElementById("addRatingValue");
const addRatingValueLabel = document.getElementById("addRatingValueLabel");
const manualAddContainer = document.getElementById("manualAddContainer");

const memberForm = document.getElementById("memberForm");
const memberName = document.getElementById("memberName");
const memberManageCard = document.getElementById("memberManageCard");
const deleteSongForm = document.getElementById("deleteSongForm");
const deleteSongId = document.getElementById("deleteSongId");

const songTableBody = document.getElementById("songTableBody");
const voteSongId = document.getElementById("voteSongId");
const voterName = document.getElementById("voterName");
const voteForm = document.getElementById("voteForm");
const voteRegisterCard = document.getElementById("voteRegisterCard");
const voteFormHome = document.getElementById("voteFormHome");
const decisionValue = document.getElementById("decisionValue");
const decisionButtons = document.querySelectorAll(".decision-toggle-btn");
const ratingPicker = document.getElementById("ratingPicker");
const ratingStars = document.querySelectorAll("#ratingPicker .rating-star");
const ratingValue = document.getElementById("ratingValue");
const ratingValueLabel = document.getElementById("ratingValueLabel");
const memberList = document.getElementById("memberList");
const statusMessage = document.getElementById("statusMessage");
const mutigoeulForm = document.getElementById("mutigoeulForm");
const mutigoeulSongId = document.getElementById("mutigoeulSongId");
const mutigoeulTableBody = document.getElementById("mutigoeulTableBody");
const openMutigoeulAddBtn = document.getElementById("openMutigoeulAddBtn");
const closeMutigoeulAddBtn = document.getElementById("closeMutigoeulAddBtn");
const mutigoeulAddModal = document.getElementById("mutigoeulAddModal");
const toggleManualAddBtn = document.getElementById("toggleManualAddBtn");
const profileSelectScreen = document.getElementById("profileSelectScreen");
const profileCardList = document.getElementById("profileCardList");
const profileAddShortcutBtn = document.getElementById("profileAddShortcutBtn");
const closeMemberManageBtn = document.getElementById("closeMemberManageBtn");
const profileDashboard = document.getElementById("profileDashboard");
const currentProfileName = document.getElementById("currentProfileName");
const openProfileSettingsBtn = document.getElementById("openProfileSettingsBtn");
const profileSettingsMenu = document.getElementById("profileSettingsMenu");
const changeProfileBtn = document.getElementById("changeProfileBtn");
const showPendingSongsBtn = document.getElementById("showPendingSongsBtn");
const showVotedSongsBtn = document.getElementById("showVotedSongsBtn");
const showMySongsBtn = document.getElementById("showMySongsBtn");
const openAddSongBtn = document.getElementById("openAddSongBtn");
const closeAddSongBtn = document.getElementById("closeAddSongBtn");
const addSongCard = document.getElementById("addSongCard");
const songDetailModal = document.getElementById("songDetailModal");
const songDetailTitle = document.getElementById("songDetailTitle");
const songDetailContent = document.getElementById("songDetailContent");
const openNotificationSettingsBtn = document.getElementById("openNotificationSettingsBtn");
const closeNotificationSettingsBtn = document.getElementById("closeNotificationSettingsBtn");
const notificationSettingsModal = document.getElementById("notificationSettingsModal");
const notificationStatusText = document.getElementById("notificationStatusText");
const notificationHint = document.getElementById("notificationHint");
const enableNotificationsBtn = document.getElementById("enableNotificationsBtn");
const disableNotificationsBtn = document.getElementById("disableNotificationsBtn");
const sendTestNotificationBtn = document.getElementById("sendTestNotificationBtn");
const modalScrim = document.getElementById("modalScrim");
const openRuleInfoBtn = document.getElementById("openRuleInfoBtn");
const closeRuleInfoBtn = document.getElementById("closeRuleInfoBtn");
const ruleInfoModal = document.getElementById("ruleInfoModal");
const filterTabs = document.querySelectorAll(".filter-tab");

let inlineVoteSongId = null;
let activeSongDetailId = "";
let activeSongDetailAllowsVote = false;

if (voteRegisterCard) {
    voteRegisterCard.hidden = true;
}

if (profileAddShortcutBtn) {
    profileAddShortcutBtn.addEventListener("click", () => {
        openOverlayPanel(memberManageCard);
        memberName?.focus();
    });
}

if (closeMemberManageBtn) {
    closeMemberManageBtn.addEventListener("click", closeOverlayPanels);
}

if (openProfileSettingsBtn) {
    openProfileSettingsBtn.addEventListener("click", (event) => {
        event.stopPropagation();
        toggleProfileSettingsMenu();
    });
}

if (changeProfileBtn) {
    changeProfileBtn.addEventListener("click", () => {
        closeProfileSettingsMenu();
        clearSelectedProfile();
        renderAll();
    });
}

if (showPendingSongsBtn) {
    showPendingSongsBtn.addEventListener("click", () => {
        setActiveSongFilter("my-pending");
        document.querySelector(".playlist-card")?.scrollIntoView({ behavior: "smooth", block: "start" });
    });
}

if (showVotedSongsBtn) {
    showVotedSongsBtn.addEventListener("click", () => {
        setActiveSongFilter("my-voted");
        document.querySelector(".playlist-card")?.scrollIntoView({ behavior: "smooth", block: "start" });
    });
}

if (showMySongsBtn) {
    showMySongsBtn.addEventListener("click", () => {
        setActiveSongFilter("my-added");
        document.querySelector(".playlist-card")?.scrollIntoView({ behavior: "smooth", block: "start" });
    });
}

if (openAddSongBtn) {
    openAddSongBtn.addEventListener("click", () => {
        openOverlayPanel(addSongCard);
    });
}

if (songDetailContent) {
    songDetailContent.addEventListener("click", (event) => {
        const interactiveTarget = event.target.closest("button, input, select, textarea, label, form, .inline-vote-card, .inline-vote-card-mount");
        if (interactiveTarget) return;
        closeOverlayPanels();
    });
}

if (openNotificationSettingsBtn) {
    openNotificationSettingsBtn.addEventListener("click", async () => {
        closeProfileSettingsMenu();
        openOverlayPanel(notificationSettingsModal);
        await updateNotificationUi();
    });
}

if (closeNotificationSettingsBtn) {
    closeNotificationSettingsBtn.addEventListener("click", closeOverlayPanels);
}

if (enableNotificationsBtn) {
    enableNotificationsBtn.addEventListener("click", enableNotifications);
}

if (disableNotificationsBtn) {
    disableNotificationsBtn.addEventListener("click", disableNotifications);
}

if (sendTestNotificationBtn) {
    sendTestNotificationBtn.addEventListener("click", sendTestNotification);
}

if (openMutigoeulAddBtn) {
    openMutigoeulAddBtn.addEventListener("click", () => {
        openOverlayPanel(mutigoeulAddModal);
    });
}

if (closeMutigoeulAddBtn) {
    closeMutigoeulAddBtn.addEventListener("click", closeOverlayPanels);
}

if (closeAddSongBtn) {
    closeAddSongBtn.addEventListener("click", closeOverlayPanels);
}

if (openRuleInfoBtn) {
    openRuleInfoBtn.addEventListener("click", () => {
        openOverlayPanel(ruleInfoModal);
    });
}

if (closeRuleInfoBtn) {
    closeRuleInfoBtn.addEventListener("click", closeOverlayPanels);
}

if (modalScrim) {
    modalScrim.addEventListener("click", closeOverlayPanels);
}

document.addEventListener("click", (event) => {
    if (!profileSettingsMenu || profileSettingsMenu.hidden) return;
    if (profileSettingsMenu.contains(event.target) || openProfileSettingsBtn?.contains(event.target)) return;
    closeProfileSettingsMenu();
});

document.addEventListener("keydown", (event) => {
    if (event.key === "Escape") {
        closeProfileSettingsMenu();
        closeOverlayPanels();
    }
});

for (const tab of filterTabs) {
    tab.addEventListener("click", () => {
        setActiveSongFilter(tab.dataset.filter || "all");
    });
}

for (const button of decisionButtons) {
    button.addEventListener("click", () => {
        const value = button.dataset.value;
        decisionValue.value = value;

        for (const item of decisionButtons) {
            item.classList.toggle("active", item === button);
        }
    });
}

for (const starButton of ratingStars) {
    starButton.addEventListener("click", (event) => {
        const starIndex = Number(starButton.dataset.starIndex);
        const rect = starButton.getBoundingClientRect();
        const isLeftHalf = event.clientX - rect.left < rect.width / 2;
        const currentScore = Number(ratingValue.value || 0);
        let score = starIndex - (isLeftHalf ? 0.5 : 0);

        if (starIndex === 1 && isLeftHalf && currentScore === 0.5) {
            score = 0;
        }

        setRating(score);
    });
}

for (const starButton of addRatingStars) {
    starButton.addEventListener("click", (event) => {
        const starIndex = Number(starButton.dataset.starIndex);
        const rect = starButton.getBoundingClientRect();
        const isLeftHalf = event.clientX - rect.left < rect.width / 2;
        const currentScore = Number(addRatingValue.value || 0);
        let score = starIndex - (isLeftHalf ? 0.5 : 0);

        if (starIndex === 1 && isLeftHalf && currentScore === 0.5) {
            score = 0;
        }

        setAddRating(score);
    });
}

setRating(0);
setAddRating(5);

songForm.addEventListener("submit", async (event) => {
    event.preventDefault();

    const title = songTitle.value.trim();
    const artist = songArtist.value.trim();
    const reason = recommendationReason.value.trim();
    const addRating = Number(addRatingValue.value);
    const coverImageUrl = getSelectedFetchedCoverForSubmit(title, artist);

    if (!hasSelectedProfile()) {
        window.alert("먼저 프로필을 선택해주세요.");
        return;
    }

    if (!title || !artist || !reason || Number.isNaN(addRating)) return;

    if (!supabaseClient) return;

    const { data: insertedSong, error: songError } = await supabaseClient
        .from("songs")
        .insert({
            title,
            artist,
            adder: selectedProfile.name,
            adder_member_id: selectedProfile.id,
            coverImageUrl,
        })
        .select("id,title,artist,adder,adder_member_id")
        .single();

    if (songError) {
        setStatus(`노래 추가 실패: ${songError.message}`, true);
        return;
    }

    const { error: voteError } = await supabaseClient.from("votes").insert({
        songId: insertedSong.id,
        voter: selectedProfile.name,
        member_id: selectedProfile.id,
        decision: "승격",
        rating: addRating,
        reason,
    });

    if (voteError) {
        await reloadAllData();
        setStatus(`노래는 추가됐지만 추천 이유 저장에 실패했습니다: ${voteError.message}`, true);
        return;
    }

    await reloadAllData();
    songForm.reset();
    setAddRating(5);
    selectedFetchedSong = null;
    if (fetchedSongSelect) fetchedSongSelect.value = "";
    if (selectedProfile.name) songAdder.value = selectedProfile.name;
    closeOverlayPanels();
    setStatus("노래가 추가되었습니다.");
});

memberForm.addEventListener("submit", async (event) => {
    event.preventDefault();
    const name = memberName.value.trim();
    if (!name) return;

    const password = window.prompt("평가자 추가 비밀번호를 입력하세요");
    if (password !== "shinju") {
        setStatus("평가자 추가 실패: 비밀번호가 올바르지 않습니다.", true);
        return;
    }

    const inserted = await ensureMember(name);
    if (inserted) {
        await reloadAllData();
        setStatus("평가자가 추가되었습니다.");
    }
    memberForm.reset();
});

deleteSongForm.addEventListener("submit", async (event) => {
    event.preventDefault();

    const songId = deleteSongId.value;
    if (!songId) return;

    const password = window.prompt("노래 삭제 비밀번호를 입력하세요");
    if (password !== "shinju") {
        setStatus("노래 삭제 실패: 비밀번호가 올바르지 않습니다.", true);
        return;
    }
    if (!supabaseClient) return;

    const { error } = await supabaseClient.from("songs").delete().eq("id", songId);
    if (error) {
        setStatus(`노래 삭제 실패: ${error.message}`, true);
        return;
    }

    deleteSongForm.reset();
    await reloadAllData();
    setStatus("노래가 삭제되었습니다.");
});

voteForm.addEventListener("submit", async (event) => {
    event.preventDefault();

    if (isVoteSaveInFlight) return;
    isVoteSaveInFlight = true;

    try {
    const songId = voteSongId.value;
    const decision = decisionValue.value;
    const rating = Number(ratingValue.value);
    const reason = document.getElementById("reason").value.trim();

    if (!hasSelectedProfile()) {
        window.alert("먼저 프로필을 선택해주세요.");
        return;
    }

    if (!songId || !decision || !reason || Number.isNaN(rating)) return;

    const targetSong = state.songs.find((song) => song.id === songId);
    if (!targetSong || !supabaseClient) return;

    const votePayload = {
        songId,
        voter: selectedProfile.name,
        member_id: selectedProfile.id,
        decision,
        rating,
        reason,
    };
    const existingVote = getSelectedProfileVote(songId);

    if (existingVote) {
        const hasChanged = hasVoteChanged(existingVote, votePayload);
        if (!hasChanged) {
            await afterVoteSave({ isNewVote: false, isChanged: false, insertedVoteId: existingVote.id, song: targetSong, votePayload });
            return;
        }

        const saveResult = await saveExistingVote([existingVote.id], votePayload);
        if (saveResult.error) {
            setStatus(`투표 저장 실패: ${saveResult.error.message}`, true);
            return;
        }

        await afterVoteSave({ isNewVote: false, isChanged: true, insertedVoteId: saveResult.voteId, song: targetSong, votePayload });
        return;
    }

    const existingVoteResult = await supabaseClient
        .from("votes")
        .select("id,member_id,voter,decision,rating,reason")
        .eq("songId", songId);

    if (existingVoteResult.error) {
        setStatus(`투표 저장 실패: ${existingVoteResult.error.message}`, true);
        return;
    }

    const existingVotes = (existingVoteResult.data ?? []).filter(isVoteBySelectedProfile);
    const existingVoteIds = existingVotes.map((vote) => vote.id);
    if (existingVoteIds.length > 0) {
        const primaryExistingVote = existingVotes[0];
        const hasChanged = hasVoteChanged(primaryExistingVote, votePayload);
        if (!hasChanged) {
            await afterVoteSave({ isNewVote: false, isChanged: false, insertedVoteId: primaryExistingVote.id, song: targetSong, votePayload });
            return;
        }

        const saveResult = await saveExistingVote(existingVoteIds, votePayload);
        if (saveResult.error) {
            setStatus(`기존 투표 수정 실패: ${saveResult.error.message}`, true);
            return;
        }

        await afterVoteSave({ isNewVote: false, isChanged: true, insertedVoteId: saveResult.voteId, song: targetSong, votePayload });
        return;
    }

    const { data: insertedVote, error } = await supabaseClient
        .from("votes")
        .insert(votePayload)
        .select("id")
        .single();

    if (error) {
        setStatus(`투표 저장 실패: ${error.message}`, true);
        return;
    }

    await afterVoteSave({ isNewVote: true, insertedVoteId: insertedVote?.id, song: targetSong, votePayload });
    } finally {
        isVoteSaveInFlight = false;
    }
});

function hasVoteChanged(existingVote, votePayload) {
    if (!existingVote) return true;
    return existingVote.decision !== votePayload.decision
        || Number(existingVote.rating) !== Number(votePayload.rating)
        || String(existingVote.reason || "").trim() !== String(votePayload.reason || "").trim();
}

async function saveExistingVote(voteIds, votePayload) {
    const [primaryVoteId, ...duplicateVoteIds] = voteIds;
    const updateResult = await supabaseClient
        .from("votes")
        .update(votePayload)
        .eq("id", primaryVoteId)
        .select("id")
        .single();

    if (!updateResult.error) {
        if (duplicateVoteIds.length > 0) {
            const { error: deleteError } = await supabaseClient.from("votes").delete().in("id", duplicateVoteIds);
            if (deleteError) return { error: deleteError };
        }

        return { voteId: updateResult.data?.id || primaryVoteId };
    }

    const { error: deleteError } = await supabaseClient.from("votes").delete().in("id", voteIds);
    if (deleteError) return { error: updateResult.error };

    const { data: insertedVote, error: insertError } = await supabaseClient
        .from("votes")
        .insert(votePayload)
        .select("id")
        .single();

    if (insertError) return { error: insertError };
    return { voteId: insertedVote?.id };
}

async function afterVoteSave({ isNewVote, isChanged = true, insertedVoteId, song, votePayload }) {
    if (insertedVoteId && (isNewVote || isChanged) && !isSongAddedBySelectedProfile(song)) {
        sendReactionNotification({
            voteId: insertedVoteId,
            songId: votePayload.songId,
            voterName: votePayload.voter,
            voterMemberId: votePayload.member_id,
            decision: votePayload.decision,
            notificationKind: isNewVote ? "new" : "update",
            notificationEventId: isNewVote ? "" : String(Date.now()),
        });
    }

    await reloadAllData();
    voteForm.reset();
    decisionValue.value = "";
    setRating(0);
    for (const button of decisionButtons) {
        button.classList.remove("active");
    }

    if (activeSongDetailId && songDetailModal && !songDetailModal.hidden) {
        inlineVoteSongId = votePayload.songId;
        renderSongDetailModalContent(activeSongDetailId, activeSongDetailAllowsVote);
    } else {
        inlineVoteSongId = null;
        restoreVoteCardHome();
    }

    setStatus(isNewVote ? "투표가 저장되었습니다." : isChanged ? "기존 투표가 수정되었습니다." : "변경된 내용이 없습니다.");
}

async function sendReactionNotification(payload) {
    try {
        const response = await fetch("/api/send-reaction-notification", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload),
        });

        if (!response.ok) {
            const data = await response.json().catch(() => ({}));
            console.warn("reaction notification failed:", data.error || response.status);
        }
    } catch (error) {
        console.warn("reaction notification failed:", error);
    }
}

mutigoeulForm.addEventListener("submit", async (event) => {
    event.preventDefault();

    const songId = mutigoeulSongId.value;
    if (!songId || !supabaseClient) return;

    const password = window.prompt("무티고을 이동 비밀번호를 입력하세요");

    if (password !== "shinju") {
        setStatus("무티고을 이동 실패: 비밀번호가 올바르지 않습니다.", true);
        return;
    }

    const { error } = await supabaseClient.from("mutigoeul_songs").insert({
        songId,
    });

    if (error) {
        setStatus(`무티고을 추가 실패: ${error.message}`, true);
        return;
    }

    mutigoeulForm.reset();
    closeOverlayPanels();
    await reloadAllData();
    setStatus("노래가 무티고을 플레이리스트로 이동되었습니다.");
});

async function bootstrap() {
    setStatus("설정 정보를 불러오는 중...");

    try {
        const response = await fetchWithTimeout("/api/config", 8000);
        if (!response.ok) {
            throw new Error(`/api/config 응답 오류 (${response.status})`);
        }

        const config = await response.json();
        if (!config.supabaseUrl || !config.supabaseAnonKey) {
            throw new Error("SUPABASE_URL 또는 SUPABASE_ANON_KEY가 설정되지 않았습니다.");
        }

        if (!window.supabase || typeof window.supabase.createClient !== "function") {
            throw new Error("Supabase SDK 로드 실패 (CDN 스크립트 확인 필요)");
        }

        supabaseClient = window.supabase.createClient(config.supabaseUrl, config.supabaseAnonKey);
        setStatus("Supabase 연결 중...");
        await reloadAllData();
        setStatus("Supabase 연결 완료");
    } catch (error) {
        setStatus(`초기화 실패: ${error.message}`, true);
    }
}

async function fetchWithTimeout(url, timeoutMs) {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

    try {
        return await fetch(url, {
            cache: "no-store",
            signal: controller.signal,
        });
    } catch (error) {
        if (error.name === "AbortError") {
            throw new Error(`요청 시간 초과 (${timeoutMs}ms): ${url}`);
        }
        throw error;
    } finally {
        clearTimeout(timeoutId);
    }
}

async function reloadAllData() {
    if (!supabaseClient) return;

    const [songsResult, votesResult, membersResult, mutigoeulResult] = await Promise.all([
        supabaseClient.from("songs").select("id,title,artist,adder,adder_member_id,createdAt,coverImageUrl").order("createdAt", { ascending: true }),
        supabaseClient.from("votes").select("id,songId,voter,member_id,decision,rating,reason,createdAt").order("createdAt", { ascending: false }),
        supabaseClient.from("members").select("id,name,createdAt").order("name", { ascending: true }),
        supabaseClient.from("mutigoeul_songs").select("id,songId,createdAt").order("createdAt", { ascending: true }),
    ]);

    if (songsResult.error || votesResult.error || membersResult.error || mutigoeulResult.error) {
        const message = songsResult.error?.message || votesResult.error?.message || membersResult.error?.message || mutigoeulResult.error?.message;
        setStatus(`데이터 조회 실패: ${message}`, true);
        return;
    }

    state.songs = songsResult.data ?? [];
    state.votes = votesResult.data ?? [];
    state.memberRecords = membersResult.data ?? [];
    state.members = state.memberRecords.map((member) => member.name);
    state.mutigoeulSongs = mutigoeulResult.data ?? [];
    state.voteStatsBySongId = buildVoteStatsBySongId(state.votes);
    refreshSelectedProfileFromMembers();
    renderAll();
}

function buildVoteStatsBySongId(votes) {
    const statsBySongId = new Map();
    for (const vote of votes) {
        const songId = vote.songId;
        if (!songId) continue;

        let stats = statsBySongId.get(songId);
        if (!stats) {
            stats = {
                votes: [],
                promotedCount: 0,
                releasedCount: 0,
                heldCount: 0,
            };
            statsBySongId.set(songId, stats);
        }

        stats.votes.push(vote);
        if (vote.decision === "승격") stats.promotedCount += 1;
        else if (vote.decision === "방출") stats.releasedCount += 1;
        else if (vote.decision === "보류") stats.heldCount += 1;
    }

    return statsBySongId;
}

function getVoteStats(songId) {
    return state.voteStatsBySongId.get(songId) ?? {
        votes: [],
        promotedCount: 0,
        releasedCount: 0,
        heldCount: 0,
    };
}

async function ensureMember(name) {
    if (!supabaseClient || !name) return false;
    if (state.members.includes(name)) return false;

    const { error } = await supabaseClient.from("members").insert({ name });
    if (error) {
        setStatus(`평가자 추가 실패: ${error.message}`, true);
        return false;
    }

    return true;
}

function setStatus(message, isError = false) {
    if (!statusMessage) return;
    statusMessage.textContent = message;
    statusMessage.style.color = isError ? "#fca5a5" : "";
}

function renderAll() {
    renderProfileGate();
    renderDashboard();
    renderFilterTabs();
    renderSongs();
    renderMutigoeulSongs();
    renderVoteSongOptions();
    renderDeleteSongOptions();
    renderMutigoeulSongOptions();
    renderMembers();
}

function renderFilterTabs() {
    for (const tab of filterTabs) {
        tab.classList.toggle("active", tab.dataset.filter === activeSongFilter);
    }
}

function hasSelectedProfile() {
    return Boolean(selectedProfile.id && selectedProfile.name);
}

function setSelectedProfile(member) {
    selectedProfile.id = member?.id || "";
    selectedProfile.name = member?.name || "";
    localStorage.setItem("selectedMemberId", selectedProfile.id);
    localStorage.setItem("selectedMemberName", selectedProfile.name);
    syncExistingPushSubscriptionToProfile();
}

function clearSelectedProfile() {
    selectedProfile.id = "";
    selectedProfile.name = "";
    localStorage.removeItem("selectedMemberId");
    localStorage.removeItem("selectedMemberName");
    activeSongFilter = "all";
    restoreVoteCardHome();
}

function refreshSelectedProfileFromMembers() {
    if (!selectedProfile.name && selectedProfile.id) {
        const byId = state.memberRecords.find((member) => member.id === selectedProfile.id);
        if (byId) selectedProfile.name = byId.name;
    }

    if (!selectedProfile.name) return;

    const match = state.memberRecords.find((member) => member.id === selectedProfile.id || member.name === selectedProfile.name);
    if (!match) {
        clearSelectedProfile();
        return;
    }

    setSelectedProfile(match);
}

function renderProfileGate() {
    const ready = hasSelectedProfile();
    document.body.classList.toggle("needs-profile", !ready);
    document.body.classList.toggle("profile-ready", ready);

    if (profileSelectScreen) profileSelectScreen.hidden = ready;
    if (profileDashboard) profileDashboard.hidden = !ready;
    if (addSongCard && !addSongCard.classList.contains("is-open")) addSongCard.hidden = true;
    if (currentProfileName) currentProfileName.textContent = selectedProfile.name || "-";

    if (!profileCardList) return;
    profileCardList.innerHTML = "";

    if (state.memberRecords.length === 0) {
        profileCardList.innerHTML = "<p class='muted'>아직 등록된 평가자가 없습니다. 먼저 평가자를 추가해주세요.</p>";
        return;
    }

    for (const member of state.memberRecords) {
        const button = document.createElement("button");
        button.type = "button";
        button.className = "profile-card";
        button.textContent = member.name;
        button.addEventListener("click", () => {
            setSelectedProfile(member);
            renderAll();
        });
        profileCardList.appendChild(button);
    }
}

function getSelectedProfileVotes() {
    if (!selectedProfile.name) return [];
    return state.votes.filter(isVoteBySelectedProfile);
}

function getSelectedProfileVote(songId) {
    if (!selectedProfile.name) return null;
    return state.votes.find((vote) => vote.songId === songId && isVoteBySelectedProfile(vote)) || null;
}

function isVoteBySelectedProfile(vote) {
    if (!selectedProfile.name) return false;
    if (selectedProfile.id && vote.member_id) {
        return vote.member_id === selectedProfile.id;
    }
    return vote.voter === selectedProfile.name;
}

function isSongAddedBySelectedProfile(song) {
    if (!selectedProfile.name) return false;
    if (selectedProfile.id && song.adder_member_id) {
        return song.adder_member_id === selectedProfile.id;
    }
    return song.adder === selectedProfile.name;
}

function getDashboardCounts() {
    const onochuSongs = getOnochuSongs();
    const pendingSongs = onochuSongs.filter((song) => !getSelectedProfileVote(song.id));
    const mySongs = onochuSongs.filter(isSongAddedBySelectedProfile);
    const votedSongs = onochuSongs.filter((song) => Boolean(getSelectedProfileVote(song.id)));

    return {
        pending: pendingSongs.length,
        mySongs: mySongs.length,
        voted: votedSongs.length,
    };
}

function renderDashboard() {
    if (!hasSelectedProfile()) return;
    const counts = getDashboardCounts();
    if (showPendingSongsBtn) {
        showPendingSongsBtn.textContent = `평가하지 않은 곡 ${counts.pending}`;
    }
    if (showVotedSongsBtn) {
        showVotedSongsBtn.textContent = `평가한 곡 ${counts.voted}`;
    }
    updateNotificationUi();
}

function setActiveSongFilter(filter) {
    activeSongFilter = filter;
    for (const tab of filterTabs) {
        tab.classList.toggle("active", tab.dataset.filter === activeSongFilter);
    }
    renderSongs();
}

function toggleProfileSettingsMenu() {
    if (!profileSettingsMenu || !openProfileSettingsBtn) return;
    const isOpen = !profileSettingsMenu.hidden;
    profileSettingsMenu.hidden = isOpen;
    openProfileSettingsBtn.setAttribute("aria-expanded", String(!isOpen));
}

function closeProfileSettingsMenu() {
    if (!profileSettingsMenu || !openProfileSettingsBtn) return;
    profileSettingsMenu.hidden = true;
    openProfileSettingsBtn.setAttribute("aria-expanded", "false");
}

function openOverlayPanel(panel) {
    if (!panel) return;
    closeProfileSettingsMenu();
    closeOverlayPanels();
    if (modalScrim) modalScrim.hidden = false;
    lockBodyScroll();
    panel.hidden = false;
    panel.classList.add("is-open");
}

function closeOverlayPanels() {
    if (modalScrim) modalScrim.hidden = true;
    unlockBodyScroll();
    inlineVoteSongId = null;
    activeSongDetailId = "";
    activeSongDetailAllowsVote = false;
    restoreVoteCardHome();
    for (const panel of [addSongCard, songDetailModal, ruleInfoModal, memberManageCard, mutigoeulAddModal, notificationSettingsModal]) {
        if (!panel) continue;
        panel.classList.remove("is-open");
        panel.hidden = true;
    }
    if (songDetailContent) songDetailContent.innerHTML = "";
}

function lockBodyScroll() {
    if (document.body.classList.contains("modal-open")) return;
    lockedBodyScrollY = window.scrollY || document.documentElement.scrollTop || 0;
    document.body.classList.add("modal-open");
    document.body.style.position = "fixed";
    document.body.style.top = `-${lockedBodyScrollY}px`;
    document.body.style.left = "0";
    document.body.style.right = "0";
    document.body.style.width = "100%";
}

function unlockBodyScroll() {
    if (!document.body.classList.contains("modal-open")) return;
    document.body.classList.remove("modal-open");
    document.body.style.position = "";
    document.body.style.top = "";
    document.body.style.left = "";
    document.body.style.right = "";
    document.body.style.width = "";
    window.scrollTo(0, lockedBodyScrollY);
    lockedBodyScrollY = 0;
}

function supportsPushNotifications() {
    return "serviceWorker" in navigator && "PushManager" in window && "Notification" in window;
}

function setNotificationUi({ status, hint, enabled, blocked = false }) {
    if (notificationStatusText) notificationStatusText.textContent = status;
    if (notificationHint) notificationHint.textContent = hint;
    if (enableNotificationsBtn) enableNotificationsBtn.hidden = enabled || blocked;
    if (disableNotificationsBtn) disableNotificationsBtn.hidden = !enabled;
    if (sendTestNotificationBtn) sendTestNotificationBtn.hidden = !enabled;
}

async function updateNotificationUi() {
    if (!notificationStatusText) return;

    if (!hasSelectedProfile()) {
        setNotificationUi({
            status: "알림 상태 확인 중",
            hint: "프로필을 선택하면 알림을 켤 수 있어요.",
            enabled: false,
        });
        return;
    }

    if (!supportsPushNotifications()) {
        setNotificationUi({
            status: "알림 미지원",
            hint: "iPhone은 홈 화면에 추가한 PWA에서만 알림을 받을 수 있어요.",
            enabled: false,
            blocked: true,
        });
        return;
    }

    if (Notification.permission === "denied") {
        setNotificationUi({
            status: "알림 차단됨",
            hint: "브라우저 또는 기기 설정에서 알림을 허용해주세요.",
            enabled: false,
            blocked: true,
        });
        return;
    }

    try {
        const registration = await navigator.serviceWorker.getRegistration("/");
        const subscription = registration ? await registration.pushManager.getSubscription() : null;
        if (subscription) {
            setNotificationUi({
                status: "알림 켜짐",
                hint: "평가 리마인드, 오노추 추가 리마인드, 내가 올린 곡의 새 평가 알림을 받을 수 있어요.",
                enabled: true,
            });
            return;
        }
    } catch {
        // 상태 확인 실패는 켜기 버튼으로 복구할 수 있게 둡니다.
    }

    setNotificationUi({
        status: "알림 꺼짐",
        hint: "평가 리마인드, 오노추 추가 리마인드, 내가 올린 곡의 새 평가 알림을 받을 수 있어요.",
        enabled: false,
    });
}

function urlBase64ToUint8Array(base64String) {
    const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
    const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
    const rawData = window.atob(base64);
    const outputArray = new Uint8Array(rawData.length);

    for (let i = 0; i < rawData.length; i += 1) {
        outputArray[i] = rawData.charCodeAt(i);
    }

    return outputArray;
}

async function getServiceWorkerRegistration() {
    const existingRegistration = await navigator.serviceWorker.getRegistration("/");
    return existingRegistration || navigator.serviceWorker.register("/service-worker.js");
}

async function saveSubscription(subscription) {
    const response = await fetch("/api/save-subscription", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
            memberId: selectedProfile.id,
            subscription,
            userAgent: navigator.userAgent,
        }),
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(data.error || "구독 저장 실패");
}

async function enableNotifications() {
    if (!selectedProfile.id) {
        window.alert("먼저 프로필을 선택해주세요.");
        return;
    }

    if (!supportsPushNotifications()) {
        window.alert("이 브라우저는 푸시 알림을 지원하지 않아요. iPhone은 홈 화면에 추가한 앱에서 시도해주세요.");
        return;
    }

    try {
        const permission = await Notification.requestPermission();
        if (permission !== "granted") {
            await updateNotificationUi();
            return;
        }

        const publicKeyResponse = await fetch("/api/vapid-public-key", { cache: "no-store" });
        const { publicKey, error } = await publicKeyResponse.json();
        if (!publicKeyResponse.ok || !publicKey) {
            setNotificationUi({
                status: "알림 설정 필요",
                hint: error || "서버에 VAPID_PUBLIC_KEY가 아직 설정되지 않았어요.",
                enabled: false,
            });
            return;
        }

        const registration = await getServiceWorkerRegistration();
        let subscription = await registration.pushManager.getSubscription();
        if (!subscription) {
            subscription = await registration.pushManager.subscribe({
                userVisibleOnly: true,
                applicationServerKey: urlBase64ToUint8Array(publicKey),
            });
        }

        await saveSubscription(subscription);
        await updateNotificationUi();
        window.alert("알림이 켜졌어요.");
    } catch (error) {
        setNotificationUi({
            status: "알림 설정 실패",
            hint: error.message,
            enabled: false,
        });
    }
}

async function disableNotifications() {
    try {
        const registration = await navigator.serviceWorker.ready;
        const subscription = await registration.pushManager.getSubscription();
        if (subscription) {
            await fetch("/api/remove-subscription", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ endpoint: subscription.endpoint }),
            });
            await subscription.unsubscribe();
        }

        await updateNotificationUi();
    } catch (error) {
        window.alert(`알림 끄기 실패: ${error.message}`);
    }
}

async function sendTestNotification() {
    if (!selectedProfile.id) return;

    try {
        const response = await fetch("/api/send-test-notification", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ memberId: selectedProfile.id }),
        });
        const data = await response.json().catch(() => ({}));
        if (!response.ok) throw new Error(data.error || "테스트 알림 전송 실패");
        window.alert(`테스트 알림을 보냈어요. (${data.count || 0}개 기기)`);
    } catch (error) {
        window.alert(`테스트 알림 실패: ${error.message}`);
    }
}

async function syncExistingPushSubscriptionToProfile() {
    if (!selectedProfile.id || !supportsPushNotifications() || Notification.permission !== "granted") return;

    try {
        const registration = await navigator.serviceWorker.getRegistration("/");
        const subscription = registration ? await registration.pushManager.getSubscription() : null;
        if (subscription) await saveSubscription(subscription);
        await updateNotificationUi();
    } catch {
        // 프로필 변경 중 구독 동기화 실패는 사용자가 다시 알림 받기를 누르면 복구됩니다.
    }
}

function getMutigoeulSongIdSet() {
    return new Set(state.mutigoeulSongs.map((item) => item.songId));
}

function getOnochuSongs() {
    const mutigoeulSongIdSet = getMutigoeulSongIdSet();
    return state.songs.filter((song) => !mutigoeulSongIdSet.has(song.id));
}

function isPromotionTarget(promotedCount, releasedCount) {
    return promotedCount >= releasedCount + 3;
}

function hasElapsedOneWeek(createdAt, nowMs = Date.now()) {
    const createdMs = new Date(createdAt).getTime();
    if (Number.isNaN(createdMs)) return false;
    const oneWeekMs = 7 * 24 * 60 * 60 * 1000;
    return nowMs - createdMs >= oneWeekMs;
}

function isReleaseTarget(song, promotedCount, releasedCount, nowMs = Date.now()) {
    const promotionTarget = isPromotionTarget(promotedCount, releasedCount);
    if (promotionTarget) return false;
    return hasElapsedOneWeek(song.createdAt, nowMs);
}

function isMutigoeulReady(song, promotedCount, releasedCount, nowMs = Date.now()) {
    return hasElapsedOneWeek(song.createdAt, nowMs) && isPromotionTarget(promotedCount, releasedCount);
}

function getDaysUntilDecision(song, nowMs = Date.now()) {
    const createdMs = new Date(song.createdAt).getTime();
    if (Number.isNaN(createdMs)) return 0;
    const oneWeekMs = 7 * 24 * 60 * 60 * 1000;
    return Math.max(0, Math.ceil((createdMs + oneWeekMs - nowMs) / (24 * 60 * 60 * 1000)));
}

function getSongStatus(song, promotedCount, releasedCount, nowMs = Date.now()) {
    if (isMutigoeulReady(song, promotedCount, releasedCount, nowMs)) {
        return { label: "무티고을 가능", className: "ready", hint: "무티고을로 이동할 수 있어요" };
    }
    if (isPromotionTarget(promotedCount, releasedCount)) {
        return { label: "승격 후보", className: "promote", hint: "무티고을까지 승격 조건을 채웠어요" };
    }
    if (isReleaseTarget(song, promotedCount, releasedCount, nowMs)) {
        return { label: "방출 예정", className: "release", hint: "7일이 지났지만 승격 조건이 부족해요" };
    }

    const daysLeft = getDaysUntilDecision(song, nowMs);
    return {
        label: "평가 중",
        className: "pending",
        hint: daysLeft > 0 ? `7일 판정까지 ${daysLeft}일 남음` : "아직 판정 조건이 확정되지 않았어요",
    };
}

function getAverageRating(votes) {
    if (!votes.length) return 0;
    const total = votes.reduce((sum, vote) => sum + Number(vote.rating || 0), 0);
    return total / votes.length;
}

function getFilteredOnochuSongs() {
    const onochuSongs = getOnochuSongs();
    if (!hasSelectedProfile()) return onochuSongs;

    if (activeSongFilter === "my-pending") {
        return onochuSongs.filter((song) => !getSelectedProfileVote(song.id));
    }

    if (activeSongFilter === "my-voted") {
        return onochuSongs.filter((song) => Boolean(getSelectedProfileVote(song.id)));
    }

    if (activeSongFilter === "my-added") {
        return onochuSongs.filter(isSongAddedBySelectedProfile);
    }

    return onochuSongs;
}

function formatShortDate(value) {
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return "";

    const year = String(date.getFullYear()).slice(-2);
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");
    return `${year}.${month}.${day}`;
}

function getSongCoverKey(title, artist) {
    return `${String(title ?? "").trim().toLowerCase()}|${String(artist ?? "").trim().toLowerCase()}`;
}

function normalizeCoverImageUrl(url, size = 300) {
    const value = typeof url === "string" ? url.trim() : "";
    if (!value) return null;

    return value
        .replace("{w}", String(size))
        .replace("{h}", String(size))
        .replace("{f}", "jpg")
        .replace(/\/\d+x\d+(bb|cc)?\.(jpg|jpeg|png|webp)$/i, `/${size}x${size}bb.jpg`);
}

function getSongCoverImageUrl(song) {
    return normalizeCoverImageUrl(song?.coverImageUrl);
}

function buildCoverMarkup(song, className = "", loading = "lazy", fetchPriority = "") {
    const safeTitle = escapeHtml(song.title);
    const coverImageUrl = getSongCoverImageUrl(song);
    const classNames = ["song-cover-image", className].filter(Boolean).join(" ");
    const priorityAttr = fetchPriority ? ` fetchpriority="${fetchPriority}"` : "";
    const placeholder = `<div class="${classNames} song-cover-placeholder" aria-hidden="true"${coverImageUrl ? " hidden" : ""}>♪</div>`;

    if (!coverImageUrl) return placeholder;

    return `
        <img class="${classNames}" src="${escapeHtml(coverImageUrl)}" alt="${safeTitle} 앨범 커버" loading="${loading}"${priorityAttr} width="300" height="300" onerror="this.hidden=true; this.nextElementSibling.hidden=false;" />
        ${placeholder}
    `;
}

function buildSongCellContent(song, titleClassName = "", includeCoverImage = true, loading = "lazy") {
    const safeTitle = escapeHtml(song.title);
    const classAttr = titleClassName ? ` class="${titleClassName}"` : "";

    if (!includeCoverImage) {
        return `<span${classAttr}>${safeTitle}</span>`;
    }

    return `
        <div class="song-cell-content">
            ${buildCoverMarkup(song, "", loading)}
            <span${classAttr}>${safeTitle}</span>
        </div>
    `;
}

function buildDecisionStatusMarkup(promotedCount, releasedCount, heldCount) {
    return `
        <div class="status-actions">
            <div class="decision-status">
                <span class="decision-pill promote">승격 ${promotedCount}</span>
                <span class="decision-pill release">방출 ${releasedCount}</span>
                <span class="decision-pill hold">보류 ${heldCount}</span>
            </div>
        </div>
    `;
}

function restoreVoteCardHome() {
    if (!voteRegisterCard || !voteFormHome) return;
    voteRegisterCard.classList.remove("inline-vote-card");
    voteRegisterCard.hidden = true;
    if (voteRegisterCard.parentElement !== voteFormHome) {
        voteFormHome.appendChild(voteRegisterCard);
    }
}

function mountVoteCardInline(mountTarget, songId) {
    if (!voteRegisterCard || !mountTarget) return;
    mountTarget.appendChild(voteRegisterCard);
    voteRegisterCard.hidden = false;
    voteRegisterCard.classList.add("inline-vote-card");
    voteSongId.value = songId;
    populateVoteFormForSong(songId);
}

function populateVoteFormForSong(songId) {
    if (selectedProfile.name) {
        voterName.value = selectedProfile.name;
    }

    const existingVote = getSelectedProfileVote(songId);
    const reasonInput = document.getElementById("reason");
    decisionValue.value = existingVote?.decision || "";
    if (reasonInput) reasonInput.value = existingVote?.reason || "";
    setRating(Number(existingVote?.rating || 0));

    for (const button of decisionButtons) {
        button.classList.toggle("active", Boolean(existingVote) && button.dataset.value === existingVote.decision);
    }
}

function isMobileView() {
    return window.matchMedia("(max-width: 760px)").matches;
}

function wireSongRowActions(row, songId, options = {}) {
    const { enableInlineVote = true } = options;
    row.addEventListener("click", () => {
        openSongDetailModal(songId, { enableInlineVote });
    });
}

function renderSongs() {
    songTableBody.innerHTML = "";
    const onochuSongs = getFilteredOnochuSongs();
    const nowMs = Date.now();
    const mobileView = isMobileView();

    if (onochuSongs.length === 0) {
        const emptyMessage = activeSongFilter === "my-pending"
            ? "내가 아직 평가하지 않은 노래가 없습니다."
            : activeSongFilter === "my-voted"
                ? "내가 평가한 노래가 없습니다."
            : activeSongFilter === "my-added"
                ? "내가 추가한 노래가 없습니다."
                : "아직 추가된 노래가 없습니다.";
        songTableBody.innerHTML = `<tr><td colspan='5' class='muted'>${emptyMessage}</td></tr>`;
        return;
    }

    for (const [songIndex, song] of onochuSongs.entries()) {
        const { promotedCount, releasedCount, heldCount } = getVoteStats(song.id);
        const isTarget = isPromotionTarget(promotedCount, releasedCount);
        const isMutigoeulCandidate = isMutigoeulReady(song, promotedCount, releasedCount, nowMs);
        const isRelease = isReleaseTarget(song, promotedCount, releasedCount, nowMs);

        const row = document.createElement("tr");
        row.className = `song-row${isTarget ? " promotion-target" : ""}${isMutigoeulCandidate ? " mutigoeul-ready" : ""}${isRelease ? " release-target" : ""}`;
        if (mobileView) {
            row.classList.add("mobile-collapsible");
            const loading = songIndex < 2 ? "eager" : "lazy";
            const fetchPriority = songIndex < 2 ? "high" : "";
            row.innerHTML = `
                <td class="mobile-line mobile-main-cell">
                    <div class="mobile-song-layout">
                        ${buildCoverMarkup(song, "mobile-song-cover", loading, fetchPriority)}
                        <div class="mobile-song-meta">
                            <div class="mobile-top-row">
                                <div class="mobile-summary-head">
                                    <div class="decision-status">
                                        <span class="decision-pill promote">승격 ${promotedCount}</span>
                                        <span class="decision-pill release">방출 ${releasedCount}</span>
                                        <span class="decision-pill hold">보류 ${heldCount}</span>
                                    </div>
                                    <span class="mobile-date">${formatShortDate(song.createdAt)}</span>
                                </div>
                            </div>
                            ${buildSongCellContent(song, "mobile-title", false)}
                            <div class="mobile-artist">${escapeHtml(song.artist)}</div>
                            <div class="mobile-adder">${escapeHtml(song.adder)}</div>
                        </div>
                    </div>
                </td>
            `;

        } else {
            row.innerHTML = `
                <td data-label="날짜">${formatShortDate(song.createdAt)}</td>
                <td data-label="노래">${buildSongCellContent(song, "", true, songIndex < 2 ? "eager" : "lazy")}</td>
                <td data-label="아티스트">${escapeHtml(song.artist)}</td>
                <td data-label="추가자">${escapeHtml(song.adder)}</td>
                <td data-label="현황">${buildDecisionStatusMarkup(promotedCount, releasedCount, heldCount)}</td>
            `;
        }

        wireSongRowActions(row, song.id, { enableInlineVote: true });

        songTableBody.appendChild(row);
    }
}

function renderMutigoeulSongs() {
    mutigoeulTableBody.innerHTML = "";
    const mobileView = isMobileView();

    if (state.mutigoeulSongs.length === 0) {
        mutigoeulTableBody.innerHTML = "<tr><td colspan='5' class='muted'>아직 무티고을로 이동된 노래가 없습니다.</td></tr>";
        return;
    }

    const songsById = new Map(state.songs.map((song) => [song.id, song]));

    for (const [songIndex, mutigoeulSong] of state.mutigoeulSongs.entries()) {
        const song = songsById.get(mutigoeulSong.songId);
        if (!song) continue;
        const { promotedCount, releasedCount, heldCount } = getVoteStats(song.id);

        const row = document.createElement("tr");
        row.className = "song-row";
        if (mobileView) {
            row.classList.add("mobile-collapsible");
            const loading = songIndex < 2 ? "eager" : "lazy";
            const fetchPriority = songIndex < 2 ? "high" : "";
            row.innerHTML = `
                <td class="mobile-line mobile-main-cell">
                    <div class="mobile-song-layout">
                        ${buildCoverMarkup(song, "mobile-song-cover", loading, fetchPriority)}
                        <div class="mobile-song-meta">
                            <div class="mobile-top-row">
                                <div class="mobile-summary-head">
                                    <div class="decision-status">
                                        <span class="decision-pill promote">승격 ${promotedCount}</span>
                                        <span class="decision-pill release">방출 ${releasedCount}</span>
                                        <span class="decision-pill hold">보류 ${heldCount}</span>
                                    </div>
                                    <span class="mobile-date">${formatShortDate(song.createdAt)}</span>
                                </div>
                            </div>
                            ${buildSongCellContent(song, "mobile-title", false)}
                            <div class="mobile-artist">${escapeHtml(song.artist)}</div>
                            <div class="mobile-adder">${escapeHtml(song.adder)}</div>
                        </div>
                    </div>
                </td>
            `;

        } else {
            row.innerHTML = `
                <td data-label="날짜">${formatShortDate(song.createdAt)}</td>
                <td data-label="노래">${buildSongCellContent(song, "", true, songIndex < 2 ? "eager" : "lazy")}</td>
                <td data-label="아티스트">${escapeHtml(song.artist)}</td>
                <td data-label="추가자">${escapeHtml(song.adder)}</td>
                <td data-label="현황">${buildDecisionStatusMarkup(promotedCount, releasedCount, heldCount)}</td>
            `;
        }

        wireSongRowActions(row, song.id, { enableInlineVote: false });

        mutigoeulTableBody.appendChild(row);
    }
}

function openSongDetailModal(songId, options = {}) {
    const { enableInlineVote = true } = options;
    if (!songDetailModal || !songDetailContent) return;

    openOverlayPanel(songDetailModal);
    activeSongDetailId = songId;
    activeSongDetailAllowsVote = enableInlineVote;
    inlineVoteSongId = null;
    renderSongDetailModalContent(songId, enableInlineVote);
}

function renderSongDetailModalContent(songId, enableInlineVote = true) {
    if (!songDetailContent) return;

    const song = state.songs.find((item) => item.id === songId);
    if (!song) {
        songDetailContent.innerHTML = "<p class='muted'>노래 정보를 찾지 못했습니다.</p>";
        return;
    }

    const { votes: songVotes, promotedCount, releasedCount, heldCount } = getVoteStats(song.id);
    if (songDetailTitle) {
        songDetailTitle.textContent = "노래 상세";
    }
    songDetailContent.innerHTML = `
        ${buildSongDetailSummary(song, promotedCount, releasedCount, heldCount)}
        ${buildSongVoteDetails(songVotes, { enableInlineVote, songId: song.id })}
    `;

    const evaluateButton = songDetailContent.querySelector(".inline-evaluate-btn");
    if (evaluateButton) {
        evaluateButton.addEventListener("click", (event) => {
            event.stopPropagation();
            inlineVoteSongId = inlineVoteSongId === song.id ? null : song.id;
            if (!inlineVoteSongId) restoreVoteCardHome();
            renderSongDetailModalContent(song.id, enableInlineVote);
        });
    }

    if (inlineVoteSongId === song.id) {
        const mountTarget = songDetailContent.querySelector(".inline-vote-card-mount");
        if (mountTarget) {
            mountVoteCardInline(mountTarget, song.id);
        }
    }
}

function buildSongDetailSummary(song, promotedCount, releasedCount, heldCount) {
    return `
        <article class="song-detail-summary">
            ${buildCoverMarkup(song, "song-detail-summary-cover", "eager", "high")}
            <div class="song-detail-summary-meta">
                <div class="mobile-summary-head">
                    <div class="decision-status">
                        <span class="decision-pill promote">승격 ${promotedCount}</span>
                        <span class="decision-pill release">방출 ${releasedCount}</span>
                        <span class="decision-pill hold">보류 ${heldCount}</span>
                    </div>
                    <span class="mobile-date">${formatShortDate(song.createdAt)}</span>
                </div>
                <div class="mobile-title">${escapeHtml(song.title)}</div>
                <div class="mobile-artist">${escapeHtml(song.artist)}</div>
                <div class="mobile-adder">${escapeHtml(song.adder)}</div>
            </div>
        </article>
    `;
}

function buildSongVoteDetails(songVotes, options = {}) {
    const { enableInlineVote = false, songId = "" } = options;
    const inlineVoteButtonBlock = enableInlineVote
        ? `
            <div class="vote-cta-wrap">
                <button type="button" class="inline-evaluate-btn">${inlineVoteSongId === songId ? "평가 창 닫기" : "평가하기"}</button>
                <div class="inline-vote-card-mount"></div>
            </div>
        `
        : "";

    if (songVotes.length === 0) {
        return `${inlineVoteButtonBlock}<p class='muted'>아직 이 노래에 대한 투표가 없습니다.</p>`;
    }

    const sortedVotes = [...songVotes].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

    return `
            ${inlineVoteButtonBlock}
            <div class="vote-inline-list">
                ${sortedVotes
            .map(
                (vote) => `
                                    <article class="vote-inline-item">
                                        <div>${escapeHtml(vote.voter)} · <b>${escapeHtml(vote.decision)}</b> · ${buildRatingDisplay(vote.rating)}</div>
                                        <div class="muted">${new Date(vote.createdAt).toLocaleString()}</div>
                                        <p>${escapeHtml(vote.reason)}</p>
                                    </article>
                                `,
            )
            .join("")}
            </div>
        `;
}

function renderVoteSongOptions() {
    const onochuSongs = getOnochuSongs();

    if (!inlineVoteSongId) {
        voteSongId.value = "";
        return;
    }

    if (inlineVoteSongId && onochuSongs.some((song) => song.id === inlineVoteSongId)) {
        voteSongId.value = inlineVoteSongId;
    } else {
        inlineVoteSongId = null;
        voteSongId.value = "";
    }
}

function renderDeleteSongOptions() {
    deleteSongId.innerHTML = "";
    const allSongs = state.songs;
    const onochuSongs = getOnochuSongs();
    const mutigoeulSongIdSet = getMutigoeulSongIdSet();
    const songsById = new Map(state.songs.map((song) => [song.id, song]));
    const mutigoeulSongs = state.mutigoeulSongs
        .map((item) => songsById.get(item.songId))
        .filter(Boolean);
    const orderedSongs = [...onochuSongs, ...mutigoeulSongs];

    const placeholder = document.createElement("option");
    placeholder.value = "";
    placeholder.textContent = allSongs.length === 0 ? "삭제할 노래가 없습니다" : "삭제할 노래를 선택하세요";
    deleteSongId.appendChild(placeholder);

    for (const song of orderedSongs) {
        const option = document.createElement("option");
        option.value = song.id;
        const isMutigoeul = mutigoeulSongIdSet.has(song.id);
        const playlistTag = isMutigoeul ? "무티고을" : "오노추";
        option.textContent = `[${playlistTag}] ${song.title} - ${song.artist} (${song.adder})`;
        deleteSongId.appendChild(option);
    }

    deleteSongId.disabled = allSongs.length === 0;
}

function renderMutigoeulSongOptions() {
    mutigoeulSongId.innerHTML = "";
    const onochuSongs = getOnochuSongs();
    const nowMs = Date.now();
    const promotionEligibleSongs = onochuSongs.filter((song) => {
        const { promotedCount, releasedCount } = getVoteStats(song.id);
        return isMutigoeulReady(song, promotedCount, releasedCount, nowMs);
    });

    const placeholder = document.createElement("option");
    placeholder.value = "";
    placeholder.textContent = promotionEligibleSongs.length === 0 ? "7일 + 승격 조건을 만족하는 노래가 없습니다" : "노래를 선택하세요";
    mutigoeulSongId.appendChild(placeholder);

    for (const song of promotionEligibleSongs) {
        const option = document.createElement("option");
        option.value = song.id;
        option.textContent = `${song.title} - ${song.artist} (${song.adder})`;
        mutigoeulSongId.appendChild(option);
    }

    mutigoeulSongId.disabled = promotionEligibleSongs.length === 0;
}

function renderMembers() {
    voterName.innerHTML = "";
    songAdder.innerHTML = "";

    const voterPlaceholder = document.createElement("option");
    voterPlaceholder.value = "";
    voterPlaceholder.textContent = "평가자를 선택하세요";
    voterName.appendChild(voterPlaceholder);

    const adderPlaceholder = document.createElement("option");
    adderPlaceholder.value = "";
    adderPlaceholder.textContent = "추가자를 선택하세요";
    songAdder.appendChild(adderPlaceholder);

    memberList.innerHTML = "";

    const hasMembers = state.members.length > 0;
    songAdder.disabled = !hasMembers;
    voterName.disabled = hasSelectedProfile();

    for (const member of state.members) {
        const option = document.createElement("option");
        option.value = member;
        option.textContent = member;
        voterName.appendChild(option);

        const adderOption = document.createElement("option");
        adderOption.value = member;
        adderOption.textContent = member;
        songAdder.appendChild(adderOption);

        const chip = document.createElement("span");
        chip.className = "chip";
        chip.textContent = member;
        memberList.appendChild(chip);
    }

    if (selectedProfile.name) {
        voterName.value = selectedProfile.name;
        songAdder.value = selectedProfile.name;
    }
}

function escapeHtml(value) {
    return value
        .replaceAll("&", "&amp;")
        .replaceAll("<", "&lt;")
        .replaceAll(">", "&gt;")
        .replaceAll('"', "&quot;")
        .replaceAll("'", "&#39;");
}

function setRating(score) {
    const normalized = Math.max(0, Math.min(5, Math.round(score * 2) / 2));
    ratingValue.value = String(normalized);
    if (ratingValueLabel) {
        ratingValueLabel.textContent = `${normalized.toFixed(1)}점`;
    }

    for (const starButton of ratingStars) {
        const index = Number(starButton.dataset.starIndex);
        const isFull = normalized >= index;
        const isHalf = !isFull && normalized >= index - 0.5;
        starButton.classList.toggle("full", isFull);
        starButton.classList.toggle("half", isHalf);
    }
}

function setAddRating(score) {
    const normalized = Math.max(0, Math.min(5, Math.round(score * 2) / 2));
    addRatingValue.value = String(normalized);
    if (addRatingValueLabel) {
        addRatingValueLabel.textContent = `${normalized.toFixed(1)}점`;
    }

    for (const starButton of addRatingStars) {
        const index = Number(starButton.dataset.starIndex);
        const isFull = normalized >= index;
        const isHalf = !isFull && normalized >= index - 0.5;
        starButton.classList.toggle("full", isFull);
        starButton.classList.toggle("half", isHalf);
    }
}

function buildRatingDisplay(rawRating) {
    const numericRating = Number(rawRating);
    const safeRating = Number.isNaN(numericRating) ? 0 : Math.max(0, Math.min(5, numericRating));
    const percent = (safeRating / 5) * 100;
    return `<span class="star-rating" aria-label="${safeRating.toFixed(1)}점"><span class="star-rating-empty">★★★★★</span><span class="star-rating-fill" style="width:${percent}%">★★★★★</span></span>`;
}

let lastMobileView = isMobileView();
window.addEventListener("resize", () => {
    const currentMobileView = isMobileView();
    if (currentMobileView === lastMobileView) return;
    lastMobileView = currentMobileView;
    renderSongs();
    renderMutigoeulSongs();
});

bootstrap();

if ("serviceWorker" in navigator) {
    window.addEventListener("load", () => {
        navigator.serviceWorker.register("/service-worker.js").catch(() => {
            // PWA 등록 실패는 핵심 평가 흐름을 막지 않습니다.
        });
    });
}

// --- Apple Music 연동 로직 ---
const fetchAppleMusicBtn = document.getElementById("fetchAppleMusicBtn");
const appleMusicStatus = document.getElementById("appleMusicStatus");
const fetchedSongsContainer = document.getElementById("fetchedSongsContainer");
const fetchedSongSelect = document.getElementById("fetchedSongSelect");
const ONOCHU_APPLE_MUSIC_PLAYLIST_URL = "https://music.apple.com/kr/playlist/o-n0-ch0o%24e/pl.u-Ymb09optgrM3117";
const MUTIGOEUL_APPLE_MUSIC_PLAYLIST_URL = "https://music.apple.com/kr/playlist/muti9oeul/pl.u-06oxDW6uWPKDjZe";

let fetchedSongsList = []; // 파싱해온 곡 목록 임시 저장
let selectedFetchedSong = null;

async function fetchPlaylistSongs(url) {
    const response = await fetchWithTimeout(`/api/fetch-playlist?url=${encodeURIComponent(url)}&t=${Date.now()}`, 10000);
    const data = await response.json();
    if (!response.ok) throw new Error(data.error || "알 수 없는 오류");
    return Array.isArray(data.songs) ? data.songs : [];
}

function getSelectedFetchedCoverForSubmit(title, artist) {
    if (!selectedFetchedSong) return null;
    if (getSongCoverKey(selectedFetchedSong.title, selectedFetchedSong.artist) !== getSongCoverKey(title, artist)) return null;
    return selectedFetchedSong.coverImageUrl || null;
}

async function persistFetchedCoverImageUrls(fetchedSongs) {
    if (!supabaseClient || !Array.isArray(fetchedSongs) || fetchedSongs.length === 0) return 0;

    const coverPayload = fetchedSongs
        .map((song) => ({
            title: song.title,
            artist: song.artist,
            coverImageUrl: normalizeCoverImageUrl(song.coverImageUrl),
        }))
        .filter((song) => song.title && song.artist && song.coverImageUrl);

    if (coverPayload.length === 0) return 0;

    const response = await fetch("/api/update-song-covers", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ songs: coverPayload }),
    });
    const data = await response.json().catch(() => ({}));

    if (!response.ok) {
        throw new Error(data.error || "커버 저장 실패");
    }

    return Number(data.updated || 0);
}

// 상태 메시지 띄워주는 함수
function showFetchStatus(message, isError = false, customColor = "") {
    appleMusicStatus.style.display = "block";
    appleMusicStatus.textContent = message;
    if (isError) appleMusicStatus.style.color = "#fca5a5";
    else if (customColor) appleMusicStatus.style.color = customColor;
    else appleMusicStatus.style.color = "var(--muted)";
}

// [불러오기] 버튼 클릭 이벤트
if (fetchAppleMusicBtn) {
    fetchAppleMusicBtn.addEventListener("click", async () => {
        showFetchStatus("Apple Music에서 곡 정보를 가져오는 중...", false);
        fetchedSongsContainer.style.display = "none";
        fetchedSongSelect.innerHTML = '<option value="">곡을 선택하면 아래 폼에 자동 입력됩니다</option>';
        selectedFetchedSong = null;

        try {
            const [onochuSongs, mutigoeulSongs] = await Promise.all([
                fetchPlaylistSongs(ONOCHU_APPLE_MUSIC_PLAYLIST_URL),
                fetchPlaylistSongs(MUTIGOEUL_APPLE_MUSIC_PLAYLIST_URL),
            ]);

            if (onochuSongs.length === 0) throw new Error("오노추 플레이리스트 곡을 찾지 못했습니다.");

            const updatedCoverCount = await persistFetchedCoverImageUrls([...onochuSongs, ...mutigoeulSongs]);

            // 이미 DB에 있는 곡 필터링 (중복 방지)
            const existingSongs = new Set(state.songs.map(s => getSongCoverKey(s.title, s.artist)));
            fetchedSongsList = onochuSongs
                .filter(s => !existingSongs.has(getSongCoverKey(s.title, s.artist)))
                .map((song) => ({
                    title: song.title,
                    artist: song.artist,
                    coverImageUrl: normalizeCoverImageUrl(song.coverImageUrl),
                }));

            if (updatedCoverCount > 0) {
                await reloadAllData();
            } else {
                renderSongs();
                renderMutigoeulSongs();
            }

            if (fetchedSongsList.length === 0) {
                showFetchStatus(`추가되지 않은 0곡을 불러왔습니다.${updatedCoverCount > 0 ? ` 커버 ${updatedCoverCount}개를 저장했습니다.` : ""}`, false, "#86efac");
                return;
            }

            // 드롭다운에 곡 목록 채우기
            for (const [index, song] of fetchedSongsList.entries()) {
                const option = document.createElement("option");
                option.value = index;
                option.textContent = `${song.title} - ${song.artist}`;
                fetchedSongSelect.appendChild(option);
            }

            fetchedSongsContainer.style.display = "block";
            showFetchStatus(`추가되지 않은 ${fetchedSongsList.length}곡을 불러왔습니다.${updatedCoverCount > 0 ? ` 커버 ${updatedCoverCount}개를 저장했습니다.` : ""}`, false, "#86efac");

        } catch (error) {
            showFetchStatus(`실패: ${error.message} (아래 폼에서 수동으로 입력해주세요)`, true);
        }
    });
}

if (toggleManualAddBtn && manualAddContainer) {
    toggleManualAddBtn.addEventListener("click", () => {
        if (selectedFetchedSong) {
            clearFetchedSongSelectionForManualEntry();
            manualAddContainer.style.display = "block";
            toggleManualAddBtn.textContent = "수동추가 닫기";
            songTitle?.focus();
            return;
        }

        const isHidden = manualAddContainer.style.display === "none";
        manualAddContainer.style.display = isHidden ? "block" : "none";
        toggleManualAddBtn.textContent = isHidden ? "수동추가 닫기" : "수동추가";
    });
}

function clearFetchedSongSelectionForManualEntry() {
    selectedFetchedSong = null;
    if (fetchedSongSelect) fetchedSongSelect.value = "";
    if (songTitle) songTitle.value = "";
    if (songArtist) songArtist.value = "";
}

// 드롭다운에서 곡을 선택하면 수동 입력 폼에 자동으로 글자 채워주기
if (fetchedSongSelect) {
    fetchedSongSelect.addEventListener("change", (e) => {
        const index = e.target.value;
        if (index === "") return;

        const selectedSong = fetchedSongsList[index];
        selectedFetchedSong = selectedSong;
        const songTitleInput = document.getElementById("songTitle");
        const songArtistInput = document.getElementById("songArtist");

        if (manualAddContainer && manualAddContainer.style.display === "none") {
            manualAddContainer.style.display = "block";
        }

        if (toggleManualAddBtn) {
            toggleManualAddBtn.textContent = "수동추가";
        }

        songTitleInput.value = selectedSong.title;
        songArtistInput.value = selectedSong.artist;

        // 시각적 피드백 (테두리 깜빡임)
        songTitleInput.style.transition = "box-shadow 0.3s";
        songArtistInput.style.transition = "box-shadow 0.3s";
        songTitleInput.style.boxShadow = "0 0 0 2px var(--accent)";
        songArtistInput.style.boxShadow = "0 0 0 2px var(--accent)";

        setTimeout(() => {
            songTitleInput.style.boxShadow = "none";
            songArtistInput.style.boxShadow = "none";
        }, 1200);
    });
}
