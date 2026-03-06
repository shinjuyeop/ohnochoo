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

const memberForm = document.getElementById("memberForm");
const memberName = document.getElementById("memberName");
const deleteSongForm = document.getElementById("deleteSongForm");
const deleteSongId = document.getElementById("deleteSongId");
const deletePassword = document.getElementById("deletePassword");

const songTableBody = document.getElementById("songTableBody");
const voteSongId = document.getElementById("voteSongId");
const voterName = document.getElementById("voterName");
const voteForm = document.getElementById("voteForm");
const decisionValue = document.getElementById("decisionValue");
const decisionButtons = document.querySelectorAll(".decision-toggle-btn");
const memberList = document.getElementById("memberList");
const statusMessage = document.getElementById("statusMessage");
const mutigoeulForm = document.getElementById("mutigoeulForm");
const mutigoeulSongId = document.getElementById("mutigoeulSongId");
const mutigoeulTableBody = document.getElementById("mutigoeulTableBody");

for (const button of decisionButtons) {
    button.addEventListener("click", () => {
        const value = button.dataset.value;
        decisionValue.value = value;

        for (const item of decisionButtons) {
            item.classList.toggle("active", item === button);
        }
    });
}

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
    const password = deletePassword.value;

    if (!songId) return;
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
    const reason = document.getElementById("reason").value.trim();

    if (!songId || !voter || !decision || !reason) return;

    const targetSong = state.songs.find((song) => song.id === songId);
    if (!targetSong || !supabaseClient) return;

    const { error } = await supabaseClient.from("votes").insert({
        songId,
        voter,
        decision,
        reason,
    });

    if (error) {
        setStatus(`투표 저장 실패: ${error.message}`, true);
        return;
    }

    await reloadAllData();
    voteForm.reset();
    decisionValue.value = "";
    for (const button of decisionButtons) {
        button.classList.remove("active");
    }
    setStatus("투표가 저장되었습니다.");
});

mutigoeulForm.addEventListener("submit", async (event) => {
    event.preventDefault();

    const songId = mutigoeulSongId.value;
    if (!songId || !supabaseClient) return;

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
        supabaseClient.from("votes").select("id,songId,voter,decision,reason,createdAt").order("createdAt", { ascending: false }),
        supabaseClient.from("members").select("id,name,createdAt").order("name", { ascending: true }),
        supabaseClient.from("mutigoeul_songs").select("id,songId,createdAt").order("createdAt", { ascending: false }),
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

function renderSongs() {
    songTableBody.innerHTML = "";
    const onochuSongs = getOnochuSongs();

    if (onochuSongs.length === 0) {
        songTableBody.innerHTML = "<tr><td colspan='4' class='muted'>아직 추가된 노래가 없습니다.</td></tr>";
        return;
    }

    for (const song of onochuSongs) {
        const songVotes = state.votes.filter((vote) => vote.songId === song.id);
        const promotedCount = songVotes.filter((vote) => vote.decision === "승격").length;
        const releasedCount = songVotes.filter((vote) => vote.decision === "방출").length;
        const isExpanded = expandedSongIds.has(song.id);

        const row = document.createElement("tr");
        row.className = "song-row";
        row.innerHTML = `
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

        songTableBody.appendChild(row);

        if (isExpanded) {
            const detailRow = document.createElement("tr");
            detailRow.className = "vote-detail-row";
            detailRow.innerHTML = `<td colspan="4">${buildSongVoteDetails(songVotes)}</td>`;
            songTableBody.appendChild(detailRow);
        }
    }
}

function renderMutigoeulSongs() {
    mutigoeulTableBody.innerHTML = "";

    if (state.mutigoeulSongs.length === 0) {
        mutigoeulTableBody.innerHTML = "<tr><td colspan='3' class='muted'>아직 무티고을로 이동된 노래가 없습니다.</td></tr>";
        return;
    }

    const songsById = new Map(state.songs.map((song) => [song.id, song]));

    for (const mutigoeulSong of state.mutigoeulSongs) {
        const song = songsById.get(mutigoeulSong.songId);
        if (!song) continue;

        const row = document.createElement("tr");
        row.innerHTML = `
      <td data-label="노래">${escapeHtml(song.title)}</td>
      <td data-label="아티스트">${escapeHtml(song.artist)}</td>
      <td data-label="추가자">${escapeHtml(song.adder)}</td>
    `;
        mutigoeulTableBody.appendChild(row);
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
                                        <div>${escapeHtml(vote.voter)} · <b>${escapeHtml(vote.decision)}</b></div>
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
    const onochuSongs = getOnochuSongs();

    const placeholder = document.createElement("option");
    placeholder.value = "";
    placeholder.textContent = onochuSongs.length === 0 ? "삭제할 노래가 없습니다" : "삭제할 노래를 선택하세요";
    deleteSongId.appendChild(placeholder);

    for (const song of onochuSongs) {
        const option = document.createElement("option");
        option.value = song.id;
        option.textContent = `${song.title} - ${song.artist} (${song.adder})`;
        deleteSongId.appendChild(option);
    }

    deleteSongId.disabled = onochuSongs.length === 0;
}

function renderMutigoeulSongOptions() {
    mutigoeulSongId.innerHTML = "";
    const onochuSongs = getOnochuSongs();

    const placeholder = document.createElement("option");
    placeholder.value = "";
    placeholder.textContent = onochuSongs.length === 0 ? "이동할 노래가 없습니다" : "노래를 선택하세요";
    mutigoeulSongId.appendChild(placeholder);

    for (const song of onochuSongs) {
        const option = document.createElement("option");
        option.value = song.id;
        option.textContent = `${song.title} - ${song.artist} (${song.adder})`;
        mutigoeulSongId.appendChild(option);
    }

    mutigoeulSongId.disabled = onochuSongs.length === 0;
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

bootstrap();
