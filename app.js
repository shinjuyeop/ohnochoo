const state = {
    songs: [],
    votes: [],
    members: [],
};

let supabase = null;

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
const voteHistory = document.getElementById("voteHistory");
const memberList = document.getElementById("memberList");
const statusMessage = document.getElementById("statusMessage");

songForm.addEventListener("submit", async (event) => {
    event.preventDefault();

    const title = songTitle.value.trim();
    const artist = songArtist.value.trim();
    const adder = songAdder.value.trim();

    if (!title || !artist || !adder) return;

    if (!supabase) return;

    const { error } = await supabase.from("songs").insert({
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
    const decisionInput = document.querySelector("input[name='decision']:checked");
    const reason = document.getElementById("reason").value.trim();

    if (!songId || !voter || !decisionInput || !reason) return;

    const targetSong = state.songs.find((song) => song.id === songId);
    if (!targetSong || !supabase) return;

    const { error } = await supabase.from("votes").insert({
        songId,
        voter,
        decision: decisionInput.value,
        reason,
    });

    if (error) {
        setStatus(`투표 저장 실패: ${error.message}`, true);
        return;
    }

    await reloadAllData();
    voteForm.reset();
    setStatus("투표가 저장되었습니다.");
});

async function bootstrap() {
    try {
        const response = await fetch("/api/config");
        if (!response.ok) {
            throw new Error("/api/config 응답을 받지 못했습니다.");
        }

        const config = await response.json();
        if (!config.supabaseUrl || !config.supabaseAnonKey) {
            throw new Error("SUPABASE_URL 또는 SUPABASE_ANON_KEY가 설정되지 않았습니다.");
        }

        supabase = window.supabase.createClient(config.supabaseUrl, config.supabaseAnonKey);
        await reloadAllData();
        setStatus("Supabase 연결 완료");
    } catch (error) {
        setStatus(`초기화 실패: ${error.message}`, true);
    }
}

async function reloadAllData() {
    if (!supabase) return;

    const [songsResult, votesResult, membersResult] = await Promise.all([
        supabase.from("songs").select("id,title,artist,adder,createdAt").order("createdAt", { ascending: false }),
        supabase.from("votes").select("id,songId,voter,decision,reason,createdAt").order("createdAt", { ascending: false }),
        supabase.from("members").select("id,name,createdAt").order("name", { ascending: true }),
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
    if (!supabase || !name) return false;
    if (state.members.includes(name)) return false;

    const { error } = await supabase.from("members").insert({ name });
    if (error) {
        setStatus(`평가자 추가 실패: ${error.message}`, true);
        return false;
    }

    return true;
}

function setStatus(message, isError = false) {
    statusMessage.textContent = message;
    statusMessage.style.color = isError ? "#fca5a5" : "";
}

function renderAll() {
    renderSongs();
    renderVoteSongOptions();
    renderMembers();
    renderVoteHistory();
}

function renderSongs() {
    songTableBody.innerHTML = "";

    if (state.songs.length === 0) {
        songTableBody.innerHTML = "<tr><td colspan='4' class='muted'>아직 추가된 노래가 없습니다.</td></tr>";
        return;
    }

    for (const song of state.songs) {
        const voteCount = state.votes.filter((vote) => vote.songId === song.id).length;

        const row = document.createElement("tr");
        row.innerHTML = `
      <td>${escapeHtml(song.title)}</td>
      <td>${escapeHtml(song.artist)}</td>
      <td>${escapeHtml(song.adder)}</td>
      <td>${voteCount}</td>
    `;
        songTableBody.appendChild(row);
    }
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

function renderVoteHistory() {
    voteHistory.innerHTML = "";

    if (state.votes.length === 0) {
        voteHistory.innerHTML = "<p class='muted'>아직 투표 기록이 없습니다.</p>";
        return;
    }

    const sortedVotes = [...state.votes].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

    for (const vote of sortedVotes) {
        const song = state.songs.find((item) => item.id === vote.songId);
        const songName = song ? `${song.title} - ${song.artist}` : "삭제된 노래";

        const item = document.createElement("article");
        item.className = "vote-item";
        item.innerHTML = `
      <strong>${escapeHtml(songName)}</strong>
      <div>${escapeHtml(vote.voter)} · <b>${escapeHtml(vote.decision)}</b></div>
      <div class="muted">${new Date(vote.createdAt).toLocaleString()}</div>
      <p>${escapeHtml(vote.reason)}</p>
    `;

        voteHistory.appendChild(item);
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
