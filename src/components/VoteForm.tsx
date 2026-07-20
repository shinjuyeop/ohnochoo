import { useEffect } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { Check, LoaderCircle } from "lucide-react";
import { z } from "zod";
import { StarRating } from "./ui/StarRating";
import { useClubMutations } from "../hooks/useClubMutations";
import { useProfile } from "../features/profile/ProfileContext";
import { useToast } from "./ui/Toast";
import { errorMessage } from "../lib/utils";
import type { Decision, Song, Vote } from "../types";

const voteSchema = z.object({
  decision: z.enum(["승격", "방출", "보류"], { message: "평가를 선택해 주세요." }),
  rating: z.number().min(0).max(5),
  reason: z.string().trim().min(1, "평가 이유를 적어주세요."),
});
type FormValue = z.infer<typeof voteSchema>;

export function VoteForm({ song, votes, existingVote, onSaved }: { song: Song; votes: Vote[]; existingVote: Vote | null; onSaved?: () => void }) {
  const { profile } = useProfile();
  const { saveVote } = useClubMutations();
  const toast = useToast();
  const { register, handleSubmit, setValue, watch, reset, formState: { errors } } = useForm<FormValue>({
    resolver: zodResolver(voteSchema),
    defaultValues: { decision: existingVote?.decision, rating: Number(existingVote?.rating || 0), reason: existingVote?.reason || "" },
  });
  const decision = watch("decision");
  const rating = watch("rating");
  useEffect(() => {
    reset({ decision: existingVote?.decision, rating: Number(existingVote?.rating || 0), reason: existingVote?.reason || "" });
  }, [existingVote, reset, song.id]);

  const submit = async (value: FormValue) => {
    if (!profile) return;
    try {
      const result = await saveVote.mutateAsync({ song, votes, profile, ...value });
      toast(result.changed ? (result.isNew ? "평가를 저장했어요." : "평가를 수정했어요.") : "변경된 내용이 없어요.", result.changed ? "success" : "info");
      if (result.changed) onSaved?.();
    } catch (error) { toast(`평가 저장 실패: ${errorMessage(error)}`, "error"); }
  };

  return (
    <form className="vote-form" onSubmit={handleSubmit(submit)}>
      <div className="decision-control" role="group" aria-label="평가 선택">
        {(["승격", "보류", "방출"] as Decision[]).map((item) => <button key={item} type="button" className={decision === item ? `active decision-${item}` : ""} onClick={() => setValue("decision", item, { shouldDirty: true, shouldValidate: true })}>{decision === item ? <Check size={15} /> : null}{item}</button>)}
      </div>
      {errors.decision ? <p className="field-error">{errors.decision.message}</p> : null}
      <div className="vote-rating"><span>별점</span><StarRating value={rating} onChange={(value) => setValue("rating", value, { shouldDirty: true })} /></div>
      <label className="field-label"><span>평가 이유</span><textarea {...register("reason")} rows={3} placeholder="왜 그렇게 생각했는지 남겨주세요." />{errors.reason ? <em>{errors.reason.message}</em> : null}</label>
      <button className="primary-button" disabled={saveVote.isPending}>{saveVote.isPending ? <><LoaderCircle className="spin" /> 저장 중...</> : existingVote ? "평가 수정하기" : "평가 저장하기"}</button>
    </form>
  );
}
