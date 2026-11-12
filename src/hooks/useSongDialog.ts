import { useLocation, useNavigate, useSearchParams } from "react-router-dom";

const BACK_LABELS: Record<string, string> = {
  "/": "홈",
  "/onochoo": "오노추",
  "/mutigoeul": "무티고을",
  "/albums": "앨범스",
  "/records": "방출",
  "/settings": "내 정보",
};

function hasSongListOrigin(state: unknown): boolean {
  return Boolean(
    state
      && typeof state === "object"
      && "fromSongList" in state
      && (state as { fromSongList?: boolean }).fromSongList,
  );
}

export function useSongDialog() {
  const [params, setParams] = useSearchParams();
  const location = useLocation();
  const navigate = useNavigate();

  const openSong = (id: string, replace = false) => {
    const currentState = location.state && typeof location.state === "object"
      ? (location.state as Record<string, unknown>)
      : {};
    const fromSongList = replace ? hasSongListOrigin(location.state) : (!params.has("song") || hasSongListOrigin(location.state));
    setParams((current) => {
      const next = new URLSearchParams(current);
      next.set("song", id);
      next.delete("vote");
      next.delete("reply");
      return next;
    }, { replace, state: { ...currentState, fromSongList } });
  };

  const closeSong = () => {
    if (hasSongListOrigin(location.state)) {
      navigate(-1);
      return;
    }
    setParams((current) => {
      const next = new URLSearchParams(current);
      for (const key of ["song", "vote", "reply"]) next.delete(key);
      return next;
    }, { replace: true });
  };

  const backLabel = BACK_LABELS[location.pathname] ?? "목록";

  return {
    songId: params.get("song"),
    voteId: params.get("vote"),
    replyId: params.get("reply"),
    backLabel,
    openSong,
    closeSong,
  };
}
