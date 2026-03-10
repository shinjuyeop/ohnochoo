const state = {
    songs: [],
    votes: [],
    members: [],
    mutigoeulSongs: [],
};

const expandedSongIds = new Set();

let supabaseClient = null;

const songForm = document.getElementById("songForm");
const songTitle = document.getElementById("songTitle");
const songArtist = document.getElementById("songArtist");
const songAdder = document.getElementById("songAdder");
const manualAddContainer = document.getElementById("manualAddContainer");

const memberForm = document.getElementById("memberForm");
const memberName = document.getElementById("memberName");
const deleteSongForm = document.getElementById("deleteSongForm");
const deleteSongId = document.getElementById("deleteSongId");

const songTableBody = document.getElementById("songTableBody");
const voteSongId = document.getElementById("voteSongId");
const voterName = document.getElementById("voterName");
const voteForm = document.getElementById("voteForm");
const decisionValue = document.getElementById("decisionValue");
const decisionButtons = document.querySelectorAll(".decision-toggle-btn");
const ratingPicker = document.getElementById("ratingPicker");
const ratingStars = document.querySelectorAll(".rating-star");
const ratingValue = document.getElementById("ratingValue");
const ratingValueLabel = document.getElementById("ratingValueLabel");
const memberList = document.getElementById("memberList");
const statusMessage = document.getElementById("statusMessage");
const mutigoeulForm = document.getElementById("mutigoeulForm");
const mutigoeulSongId = document.getElementById("mutigoeulSongId");
const mutigoeulTableBody = document.getElementById("mutigoeulTableBody");
const toggleManualAddBtn = document.getElementById("toggleManualAddBtn");

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

setRating(0);

songForm.addEventListener("submit", async (event) => {
    event.preventDefault();

    const title = songTitle.value.trim();
    const artist = songArtist.value.trim();
    const adder = songAdder.value;

    if (!title || !artist || !adder) return;

    if (!supabaseClient) return;

    const { error } = await supabaseClient.from("songs").insert({
        title,
        artist,
        adder,
    });

    if (error) {
        setStatus(`노래 추가 실패: ${error.message}`, true);
        return;
    }

    await reloadAllData();
    songForm.reset();
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

    expandedSongIds.delete(songId);
    deleteSongForm.reset();
    await reloadAllData();
    setStatus("노래가 삭제되었습니다.");
});

voteForm.addEventListener("submit", async (event) => {
    event.preventDefault();

    const songId = voteSongId.value;
    const voter = voterName.value;
    const decision = decisionValue.value;
    const rating = Number(ratingValue.value);
    const reason = document.getElementById("reason").value.trim();

    if (!songId || !voter || !decision || !reason || Number.isNaN(rating)) return;

    const targetSong = state.songs.find((song) => song.id === songId);
    if (!targetSong || !supabaseClient) return;

    const existingVoteResult = await supabaseClient.from("votes").select("id").eq("songId", songId).eq("voter", voter);
    if (existingVoteResult.error) {
        setStatus(`투표 저장 실패: ${existingVoteResult.error.message}`, true);
        return;
    }

    const existingVoteIds = (existingVoteResult.data ?? []).map((vote) => vote.id);
    if (existingVoteIds.length > 0) {
        const { error: deleteError } = await supabaseClient.from("votes").delete().in("id", existingVoteIds);
        if (deleteError) {
            setStatus(`기존 투표 교체 실패: ${deleteError.message}`, true);
            return;
        }
    }

    const { error } = await supabaseClient.from("votes").insert({
        songId,
        voter,
        decision,
        rating,
        reason,
    });

    if (error) {
        setStatus(`투표 저장 실패: ${error.message}`, true);
        return;
    }

    await reloadAllData();
    voteForm.reset();
    decisionValue.value = "";
    setRating(0);
    for (const button of decisionButtons) {
        button.classList.remove("active");
    }
    setStatus(existingVoteIds.length > 0 ? "기존 투표가 새 내용으로 교체되었습니다." : "투표가 저장되었습니다.");
});

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
        supabaseClient.from("songs").select("id,title,artist,adder,createdAt").order("createdAt", { ascending: true }),
        supabaseClient.from("votes").select("id,songId,voter,decision,rating,reason,createdAt").order("createdAt", { ascending: false }),
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
    state.members = (membersResult.data ?? []).map((member) => member.name);
    state.mutigoeulSongs = mutigoeulResult.data ?? [];
    renderAll();
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
    renderSongs();
    renderMutigoeulSongs();
    renderVoteSongOptions();
    renderDeleteSongOptions();
    renderMutigoeulSongOptions();
    renderMembers();
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

function formatShortDate(value) {
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return "";

    const year = String(date.getFullYear()).slice(-2);
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");
    return `${year}.${month}.${day}`;
}

function isMobileView() {
    return window.matchMedia("(max-width: 760px)").matches;
}

function renderSongs() {
    songTableBody.innerHTML = "";
    const onochuSongs = getOnochuSongs();
    const nowMs = Date.now();
    const mobileView = isMobileView();

    if (onochuSongs.length === 0) {
        songTableBody.innerHTML = "<tr><td colspan='5' class='muted'>아직 추가된 노래가 없습니다.</td></tr>";
        return;
    }

    for (const song of onochuSongs) {
        const songVotes = state.votes.filter((vote) => vote.songId === song.id);
        const promotedCount = songVotes.filter((vote) => vote.decision === "승격").length;
        const releasedCount = songVotes.filter((vote) => vote.decision === "방출").length;
        const isTarget = isPromotionTarget(promotedCount, releasedCount);
        const isMutigoeulCandidate = isMutigoeulReady(song, promotedCount, releasedCount, nowMs);
        const isRelease = isReleaseTarget(song, promotedCount, releasedCount, nowMs);
        const isExpanded = expandedSongIds.has(song.id);

        const row = document.createElement("tr");
        row.className = `song-row${isTarget ? " promotion-target" : ""}${isMutigoeulCandidate ? " mutigoeul-ready" : ""}${isRelease ? " release-target" : ""}${isExpanded ? " is-expanded" : ""}`;
        if (mobileView) {
            row.classList.add("mobile-collapsible");
            row.innerHTML = `
                <td class="mobile-line mobile-top-row">
                    <div class="mobile-summary-head">
                        <div class="decision-status">
                            <span class="decision-pill promote">승격 ${promotedCount}</span>
                            <span class="decision-pill release">방출 ${releasedCount}</span>
                        </div>
                        <span class="mobile-date">${formatShortDate(song.createdAt)}</span>
                    </div>
                </td>
                <td class="mobile-line mobile-title">${escapeHtml(song.title)}</td>
                <td class="mobile-line mobile-artist">${escapeHtml(song.artist)}</td>
                <td class="mobile-line mobile-adder">${escapeHtml(song.adder)}</td>
            `;

            row.addEventListener("click", () => {
                if (expandedSongIds.has(song.id)) {
                    expandedSongIds.delete(song.id);
                } else {
                    expandedSongIds.add(song.id);
                }
                renderSongs();
            });
        } else {
            row.innerHTML = `
                <td data-label="날짜">${formatShortDate(song.createdAt)}</td>
                <td data-label="노래">${escapeHtml(song.title)}</td>
                <td data-label="아티스트">${escapeHtml(song.artist)}</td>
                <td data-label="추가자">${escapeHtml(song.adder)}</td>
                <td data-label="현황">
                    <div class="status-actions">
                        <div class="decision-status">
                            <span class="decision-pill promote">승격 ${promotedCount}</span>
                            <span class="decision-pill release">방출 ${releasedCount}</span>
                        </div>
                        <button type="button" class="toggle-votes-btn">${isExpanded ? "숨기기" : "투표 보기"}</button>
                    </div>
                </td>
            `;

            const toggleButton = row.querySelector(".toggle-votes-btn");
            toggleButton.addEventListener("click", () => {
                if (expandedSongIds.has(song.id)) {
                    expandedSongIds.delete(song.id);
                } else {
                    expandedSongIds.add(song.id);
                }
                renderSongs();
            });
        }

        songTableBody.appendChild(row);

        if (isExpanded) {
            const detailRow = document.createElement("tr");
            detailRow.className = `vote-detail-row${isTarget ? " promotion-target-detail" : ""}${isMutigoeulCandidate ? " mutigoeul-ready-detail" : ""}${isRelease ? " release-target-detail" : ""}`;
            if (mobileView) {
                detailRow.innerHTML = `<td colspan="4">${buildSongVoteDetails(songVotes)}</td>`;
            } else {
                detailRow.innerHTML = `<td colspan="5">${buildSongVoteDetails(songVotes)}</td>`;
            }
            songTableBody.appendChild(detailRow);
        }
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

    for (const mutigoeulSong of state.mutigoeulSongs) {
        const song = songsById.get(mutigoeulSong.songId);
        if (!song) continue;
        const songVotes = state.votes.filter((vote) => vote.songId === song.id);
        const promotedCount = songVotes.filter((vote) => vote.decision === "승격").length;
        const releasedCount = songVotes.filter((vote) => vote.decision === "방출").length;
        const isExpanded = expandedSongIds.has(song.id);

        const row = document.createElement("tr");
        row.className = `song-row${isExpanded ? " is-expanded" : ""}`;
        if (mobileView) {
            row.classList.add("mobile-collapsible");
            row.innerHTML = `
                <td class="mobile-line mobile-top-row">
                    <div class="mobile-summary-head">
                        <div class="decision-status">
                            <span class="decision-pill promote">승격 ${promotedCount}</span>
                            <span class="decision-pill release">방출 ${releasedCount}</span>
                        </div>
                        <span class="mobile-date">${formatShortDate(song.createdAt)}</span>
                    </div>
                </td>
                <td class="mobile-line mobile-title">${escapeHtml(song.title)}</td>
                <td class="mobile-line mobile-artist">${escapeHtml(song.artist)}</td>
                <td class="mobile-line mobile-adder">${escapeHtml(song.adder)}</td>
            `;

            row.addEventListener("click", () => {
                if (expandedSongIds.has(song.id)) {
                    expandedSongIds.delete(song.id);
                } else {
                    expandedSongIds.add(song.id);
                }
                renderMutigoeulSongs();
            });
        } else {
            row.innerHTML = `
                <td data-label="날짜">${formatShortDate(song.createdAt)}</td>
                <td data-label="노래">${escapeHtml(song.title)}</td>
                <td data-label="아티스트">${escapeHtml(song.artist)}</td>
                <td data-label="추가자">${escapeHtml(song.adder)}</td>
                <td data-label="투표">
                    <button type="button" class="toggle-votes-btn">${isExpanded ? "숨기기" : "투표 보기"}</button>
                </td>
            `;

            const toggleButton = row.querySelector(".toggle-votes-btn");
            toggleButton.addEventListener("click", () => {
                if (expandedSongIds.has(song.id)) {
                    expandedSongIds.delete(song.id);
                } else {
                    expandedSongIds.add(song.id);
                }
                renderMutigoeulSongs();
            });
        }

        mutigoeulTableBody.appendChild(row);

        if (isExpanded) {
            const detailRow = document.createElement("tr");
            detailRow.className = "vote-detail-row";
            if (mobileView) {
                detailRow.innerHTML = `<td colspan="4">${buildSongVoteDetails(songVotes)}</td>`;
            } else {
                detailRow.innerHTML = `<td colspan="5">${buildSongVoteDetails(songVotes)}</td>`;
            }
            mutigoeulTableBody.appendChild(detailRow);
        }
    }
}

function buildSongVoteDetails(songVotes) {
    if (songVotes.length === 0) {
        return "<p class='muted'>아직 이 노래에 대한 투표가 없습니다.</p>";
    }

    const sortedVotes = [...songVotes].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

    return `
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
    voteSongId.innerHTML = "";
    const onochuSongs = getOnochuSongs();

    const placeholder = document.createElement("option");
    placeholder.value = "";
    placeholder.textContent = "노래를 선택하세요";
    voteSongId.appendChild(placeholder);

    for (const song of onochuSongs) {
        const option = document.createElement("option");
        option.value = song.id;
        option.textContent = `${song.title} - ${song.artist} (${song.adder})`;
        voteSongId.appendChild(option);
    }
}

function renderDeleteSongOptions() {
    deleteSongId.innerHTML = "";
    const allSongs = state.songs;
    const mutigoeulSongIdSet = getMutigoeulSongIdSet();

    const placeholder = document.createElement("option");
    placeholder.value = "";
    placeholder.textContent = allSongs.length === 0 ? "삭제할 노래가 없습니다" : "삭제할 노래를 선택하세요";
    deleteSongId.appendChild(placeholder);

    for (const song of allSongs) {
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
        const songVotes = state.votes.filter((vote) => vote.songId === song.id);
        const promotedCount = songVotes.filter((vote) => vote.decision === "승격").length;
        const releasedCount = songVotes.filter((vote) => vote.decision === "방출").length;
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

// --- Apple Music 연동 로직 ---
const fetchAppleMusicBtn = document.getElementById("fetchAppleMusicBtn");
const appleMusicStatus = document.getElementById("appleMusicStatus");
const fetchedSongsContainer = document.getElementById("fetchedSongsContainer");
const fetchedSongSelect = document.getElementById("fetchedSongSelect");
const FIXED_APPLE_MUSIC_PLAYLIST_URL = "https://music.apple.com/kr/playlist/o-n0-ch0o%24e/pl.u-Ymb09optgrM3117";

let fetchedSongsList = []; // 파싱해온 곡 목록 임시 저장

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
        const url = FIXED_APPLE_MUSIC_PLAYLIST_URL;

        showFetchStatus("Apple Music에서 곡 정보를 가져오는 중...", false);
        fetchedSongsContainer.style.display = "none";
        fetchedSongSelect.innerHTML = '<option value="">곡을 선택하면 아래 폼에 자동 입력됩니다</option>';

        try {
            // Vercel 서버리스 API로 요청 보내기
            const response = await fetchWithTimeout(`/api/fetch-playlist?url=${encodeURIComponent(url)}`, 10000);
            const data = await response.json();

            if (!response.ok) throw new Error(data.error || "알 수 없는 오류");
            if (!data.songs || data.songs.length === 0) throw new Error("곡을 찾지 못했습니다.");

            // 이미 DB에 있는 곡 필터링 (중복 방지)
            const existingSongs = new Set(state.songs.map(s => `${s.title}|${s.artist}`));
            fetchedSongsList = data.songs.filter(s => !existingSongs.has(`${s.title}|${s.artist}`));

            if (fetchedSongsList.length === 0) {
                showFetchStatus(`불러온 ${data.songs.length}곡이 모두 이미 오노추에 추가되어 있습니다!`, false, "#86efac");
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
            showFetchStatus(`총 ${data.songs.length}곡 중 중복 제외 ${fetchedSongsList.length}곡을 불러왔습니다.`, false, "#86efac");

        } catch (error) {
            showFetchStatus(`실패: ${error.message} (아래 폼에서 수동으로 입력해주세요)`, true);
        }
    });
}

if (toggleManualAddBtn && manualAddContainer) {
    toggleManualAddBtn.addEventListener("click", () => {
        const isHidden = manualAddContainer.style.display === "none";
        manualAddContainer.style.display = isHidden ? "block" : "none";
        toggleManualAddBtn.textContent = isHidden ? "수동추가 닫기" : "수동추가";
    });
}

// 드롭다운에서 곡을 선택하면 수동 입력 폼에 자동으로 글자 채워주기
if (fetchedSongSelect) {
    fetchedSongSelect.addEventListener("change", (e) => {
        const index = e.target.value;
        if (index === "") return;

        const selectedSong = fetchedSongsList[index];
        const songTitleInput = document.getElementById("songTitle");
        const songArtistInput = document.getElementById("songArtist");

        if (manualAddContainer && manualAddContainer.style.display === "none") {
            manualAddContainer.style.display = "block";
            if (toggleManualAddBtn) {
                toggleManualAddBtn.textContent = "수동추가 닫기";
            }
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
