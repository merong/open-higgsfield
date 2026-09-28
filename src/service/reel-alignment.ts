import { randomUUID } from "node:crypto";
import { database } from "./db";
import { ownedMedia, transcribeReelAudio, normalizedSpeech, boundedReelCues } from "./reel-media";
import { reelRow, saveReel, reelEvent, requireReelRevision } from "./reel-workflow";
import { object, ServiceError } from "./errors";
export async function realignReelVoice(userId: string, id: string, input: unknown, provider = transcribeReelAudio) {
  const data = object(input), token = randomUUID(), db = await database();
  const r = await db.transaction(async tx => {
    const { data: r } = await reelRow(tx, userId, id); requireReelRevision(r, data);
    const s = r.scenes.find(s => s.id === data.sceneId);
    if (r.status !== "ready" || !s?.voice || s.voice.cues.length) throw new ServiceError(409, "자막 정렬이 필요한 보관 음성을 선택해 주세요.");
    if (r.budget.calls >= r.budget.maxCalls) throw new ServiceError(400, "음성 정렬 재시도 한도에 도달했습니다.");
    r.budget.calls++; r.status = "running"; r.error = undefined; reelEvent(r, "보관한 음성을 정렬하고 있어요", "음성을 다시 생성하지 않고 자막만 복구합니다. 추가 앱 크레딧 없음."); await saveReel(tx, r, "자막 정렬 재시도", false, token, 75000); return r;
  });
  try {
    const s = r.scenes.find(s => s.id === data.sceneId)!, a = await ownedMedia(userId, s.voice!.assetId), aligned = await provider(a.bytes);
    aligned.cues = boundedReelCues(aligned.cues, s.voice!.durationMs);
    if (!aligned.cues.length) throw new ServiceError(502, "실제 자막 시간을 확인하지 못했습니다. 보관한 음성은 유지합니다.");
    return db.transaction(async tx => { const row = await reelRow(tx, userId, id), current = row.data; if (row.lease_token !== token) return current; const scene = current.scenes.find(s => s.id === data.sceneId)!; Object.assign(scene.voice!, aligned, { matches: normalizedSpeech(scene.narration) === normalizedSpeech(aligned.transcript), alignmentError: undefined }); scene.version++; if (scene.id === current.scenes[0].id) current.sampleApproved = false; current.status = "ready"; await saveReel(tx, current, "자막 정렬 복구", true); return current; });
  } catch (e) { return db.transaction(async tx => { const row = await reelRow(tx, userId, id), current = row.data; if (row.lease_token !== token) return current; current.status = "ready"; current.error = e instanceof ServiceError ? e.message : "자막 정렬 응답을 확인하지 못했습니다. 보관한 음성은 그대로 사용할 수 있습니다."; await saveReel(tx, current, "자막 정렬 실패"); return current; }); }
}
