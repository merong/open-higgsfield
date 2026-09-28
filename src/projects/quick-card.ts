import { createDraft } from "./outline";
import { PRESETS } from "./formats";
import { object, ServiceError, text } from "@/service/errors";
import type { Preset } from "./types";

/** One brief is enough; placeholders are only sent as an internal layout scaffold. */
export function createQuickCardDraft(input: unknown) {
  const data = object(input);
  const idea = text(data.idea, "주제 또는 메모", 3000, 2);
  const count = data.count ?? 5, preset = data.preset ?? "editorial", tone = data.tone ?? "friendly";
  if (!Number.isInteger(count) || Number(count) < 3 || Number(count) > 10) throw new ServiceError(400,"카드 장수는 3~10장으로 선택해 주세요.");
  if (!PRESETS.some(p=>p.id===preset) || !["friendly","expert","witty","calm"].includes(String(tone))) throw new ServiceError(400,"스타일 또는 말투를 확인해 주세요.");
  const draft = createDraft("card-news",{topic:idea.split("\n")[0].slice(0,90),audience:text(data.audience ?? "","독자",100),tone:String(tone),count:Number(count),mustInclude:idea},preset as Preset,"4:5");
  return {...draft,slots:draft.slots.map(s=>({...s,composition:"full" as const}))};
}
