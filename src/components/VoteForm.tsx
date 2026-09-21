import { useEffect, useRef, useState } from "react";
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
import { clearDraft, draftKey, readDraft, writeDraft } from "../lib/drafts";

const voteSchema = z.object({
  decision: z.enum(["승격", "방출", "보류"], { message: "평가를 선택해 주세요." }),
  rating: z.number().min(0).max(5),
  reason: z.string().trim().min(1, "평가 이유를 적어주세요."),
});
type FormValue = z.infer<typeof voteSchema>;
const draftSchema = voteSchema.extend({ decision: voteSchema.shape.decision.optional(), reason: z.string() });

export function VoteForm({ song, existingVote, onSaved }: { song: Song; existingVote: Vote | null; onSaved?: () => void }) {
  const { profile } = useProfile();
  const storageKey = draftKey(profile?.id || "", `vote:${song.id}`);
  const [restored, setRestored] = useState(() => readDraft(storageKey, draftSchema));
  const hasDraft = useRef(Boolean(restored));
  const { saveVote } = useClubMutations();
  const toast = useToast();
  const { register, handleSubmit, setValue, watch, reset, formState: { errors, isDirty } } = useForm<FormValue>({
    resolver: zodResolver(voteSchema),
    defaultValues: restored ?? { decision: existingVote?.decision, rating: Number(existingVote?.rating || 0), reason: existingVote?.reason || "" },
  });
  const decision = watch("decision");
  const rating = watch("rating");
  useEffect(() => {
    if (isDirty || hasDraft.current) return;
    reset({ decision: existingVote?.decision, rating: Number(existingVote?.rating || 0), reason: existingVote?.reason || "" });
  }, [existingVote?.decision, existingVote?.rating, existingVote?.reason, reset, isDirty]);
  useEffect(() => {
    const subscription = watch((value, { name }) => {
      if (!name) return;
      hasDraft.current = true;
      writeDraft(storageKey, value);
    });
    return () => subscription.unsubscribe();
  }, [watch, storageKey]);

  const submit = async (value: FormValue) => {
    if (!profile) return;
    try {
      const result = await saveVote.mutateAsync({ song, profile, ...value });
      reset(value);
      hasDraft.current = false;
      setRestored(null);
      clearDraft(storageKey);
      toast(result.changed ? (result.isNew ? "평가를 저장했어요." : "평가를 수정했어요.") : "변경된 내용이 없어요.", result.changed ? "success" : "info");
      if (result.changed) onSaved?.();
    } catch (error) { toast(`평가 저장 실패: ${errorMessage(error)}`, "error"); }
  };

  return (
    <form className="vote-form" onSubmit={handleSubmit(submit)}>
      <p className="draft-hint">{restored ? "작성하던 평가를 불러왔어요." : "작성 중인 평가는 이 기기에 임시 저장돼요."}</p>
      <div className="decision-control" role="group" aria-label="평가 선택">
        {(["승격", "보류", "방출"] as Decision[]).map((item) => <button key={item} type="button" aria-pressed={decision === item} className={decision === item ? `active decision-${item}` : ""} onClick={() => setValue("decision", item, { shouldDirty: true, shouldValidate: true })}>{decision === item ? <Check size={15} /> : null}{item}</button>)}
      </div>
      {errors.decision ? <p className="field-error">{errors.decision.message}</p> : null}
      <div className="vote-rating"><span>별점</span><StarRating value={rating} onChange={(value) => setValue("rating", value, { shouldDirty: true })} /></div>
      <label className="field-label"><span>평가 이유</span><textarea {...register("reason")} rows={3} placeholder="왜 그렇게 생각했는지 남겨주세요." />{errors.reason ? <em>{errors.reason.message}</em> : null}</label>
      <button className="primary-button" disabled={saveVote.isPending}>{saveVote.isPending ? <><LoaderCircle className="spin" /> 저장 중...</> : existingVote ? "평가 수정하기" : "평가 저장하기"}</button>
    </form>
  );
}
