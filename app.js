const state = {
    songs: [],
    votes: [],
    members: [],
};

const expandedSongIds = new Set();

let supabaseClient = null;

const songForm = document.getElementById("songForm");
const songTitle = document.getElementById("songTitle");
const songArtist = document.getElementById("songArtist");
const songAdder = document.getElementById("songAdder");

const memberForm = document.getElementById("memberForm");
const memberName = document.getElementById("memberName");

const songTableBody = document.getElementById("songTableBody");
const voteSongId = document.getElementById("voteSongId");
const voterName = document.getElementById("voterName");
const voteForm = document.getElementById("voteForm");
const decisionValue = document.getElementById("decisionValue");
const decisionButtons = document.querySelectorAll(".decision-toggle-btn");
const memberList = document.getElementById("memberList");
const statusMessage = document.getElementById("statusMessage");

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
    const adder = songAdder.value.trim();

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

    await ensureMember(adder);
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

    const [songsResult, votesResult, membersResult] = await Promise.all([
        supabaseClient.from("songs").select("id,title,artist,adder,createdAt").order("createdAt", { ascending: true }),
        supabaseClient.from("votes").select("id,songId,voter,decision,reason,createdAt").order("createdAt", { ascending: false }),
        supabaseClient.from("members").select("id,name,createdAt").order("name", { ascending: true }),
    ]);

    if (songsResult.error || votesResult.error || membersResult.error) {
        const message = songsResult.error?.message || votesResult.error?.message || membersResult.error?.message;
        setStatus(`데이터 조회 실패: ${message}`, true);
        return;
    }

    state.songs = songsResult.data ?? [];
    state.votes = votesResult.data ?? [];
    state.members = (membersResult.data ?? []).map((member) => member.name);
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
    renderVoteSongOptions();
    renderMembers();
}

function renderSongs() {
    songTableBody.innerHTML = "";

    if (state.songs.length === 0) {
        songTableBody.innerHTML = "<tr><td colspan='5' class='muted'>아직 추가된 노래가 없습니다.</td></tr>";
        return;
    }

    for (const song of state.songs) {
        const songVotes = state.votes.filter((vote) => vote.songId === song.id);
        const voteCount = songVotes.length;
        const promotedCount = songVotes.filter((vote) => vote.decision === "승격").length;
        const releasedCount = songVotes.filter((vote) => vote.decision === "방출").length;
        const isExpanded = expandedSongIds.has(song.id);

        const row = document.createElement("tr");
        row.className = "song-row";
        row.innerHTML = `
      <td data-label="노래">${escapeHtml(song.title)}</td>
      <td data-label="아티스트">${escapeHtml(song.artist)}</td>
      <td data-label="추가자">${escapeHtml(song.adder)}</td>
            <td data-label="평가 수">
                <div class="vote-count-cell">
                    <span>${voteCount}</span>
                    <button type="button" class="toggle-votes-btn">${isExpanded ? "숨기기" : "투표 보기"}</button>
                </div>
            </td>
            <td data-label="현황">
                <div class="decision-status">
                    <span class="decision-pill promote">승격 ${promotedCount}</span>
                    <span class="decision-pill release">방출 ${releasedCount}</span>
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
            detailRow.innerHTML = `<td colspan="5">${buildSongVoteDetails(songVotes)}</td>`;
            songTableBody.appendChild(detailRow);
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

    const placeholder = document.createElement("option");
    placeholder.value = "";
    placeholder.textContent = "노래를 선택하세요";
    voteSongId.appendChild(placeholder);

    for (const song of state.songs) {
        const option = document.createElement("option");
        option.value = song.id;
        option.textContent = `${song.title} - ${song.artist} (${song.adder})`;
        voteSongId.appendChild(option);
    }
}

function renderMembers() {
    voterName.innerHTML = "";

    const placeholder = document.createElement("option");
    placeholder.value = "";
    placeholder.textContent = "평가자를 선택하세요";
    voterName.appendChild(placeholder);

    memberList.innerHTML = "";

    for (const member of state.members) {
        const option = document.createElement("option");
        option.value = member;
        option.textContent = member;
        voterName.appendChild(option);

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
