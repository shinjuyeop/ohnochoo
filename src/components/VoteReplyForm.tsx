import { useState, type FormEvent } from "react";
import { LoaderCircle, MessageCircleReply, Send } from "lucide-react";
import { useProfile } from "../features/profile/ProfileContext";
import { useClubMutations } from "../hooks/useClubMutations";
import { getReplyLength, limitReplyLength, MAX_REPLY_LENGTH } from "../lib/replyRules";
import { errorMessage } from "../lib/utils";
import { useToast } from "./ui/Toast";

export function VoteReplyForm({ voteId }: { voteId: string }) {
  const [open, setOpen] = useState(false);
  const [body, setBody] = useState("");
  const { profile } = useProfile();
  const { addVoteReply } = useClubMutations();
  const toast = useToast();
  const length = getReplyLength(body);

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    if (!profile || !body.trim()) return;

    try {
      await addVoteReply.mutateAsync({ voteId, body, profile });
      setBody("");
      setOpen(false);
      toast("답글을 남겼어요.", "success");
    } catch (error) {
      toast(`답글 저장 실패: ${errorMessage(error)}`, "error");
    }
  };

  if (!open) {
    return (
      <button className="reply-toggle" type="button" onClick={() => setOpen(true)}>
        <MessageCircleReply size={14} /> 답글 쓰기
      </button>
    );
  }

  return (
    <form className="reply-form" onSubmit={submit}>
      <label htmlFor={`reply-${voteId}`} className="visually-hidden">답글 내용</label>
      <textarea
        id={`reply-${voteId}`}
        value={body}
        onChange={(event) => setBody(limitReplyLength(event.target.value))}
        rows={3}
        placeholder="평가에 대한 답글을 남겨주세요."
        autoFocus
      />
      <div className="reply-form-footer">
        <span className={length >= MAX_REPLY_LENGTH ? "limit" : ""}>{length}/{MAX_REPLY_LENGTH}</span>
        <div>
          <button type="button" onClick={() => { setBody(""); setOpen(false); }}>취소</button>
          <button type="submit" disabled={!body.trim() || addVoteReply.isPending}>
            {addVoteReply.isPending ? <LoaderCircle className="spin" size={14} /> : <Send size={14} />} 등록
          </button>
        </div>
      </div>
    </form>
  );
}
