import { useSearchParams } from "react-router-dom";

export function useSongDialog() {
  const [params, setParams] = useSearchParams();
  const openSong = (id: string) => setParams((current) => {
    const next = new URLSearchParams(current);
    next.set("song", id);
    next.delete("vote");
    next.delete("reply");
    return next;
  });
  const closeSong = () => setParams((current) => {
    const next = new URLSearchParams(current);
    for (const key of ["song", "vote", "reply"]) next.delete(key);
    return next;
  }, { replace: true });
  return { songId: params.get("song"), voteId: params.get("vote"), replyId: params.get("reply"), openSong, closeSong };
}
