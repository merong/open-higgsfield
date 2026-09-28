import { zip, blobBytes } from "./export";
import { strToU8 } from "fflate";
import { reelOverlayDescription, type ReelWorkflow } from "@/projects/reel-workflow";
export interface ReelOverlay { sceneId: string; name: string; startMs: number; endMs: number; text: string; issues: string[] }
export async function createReelOverlays(r: ReelWorkflow, kind: "sample" | "full", progress: (text: string) => void) {
  await document.fonts.load('600 52px "Pretendard Variable"'); await document.fonts.ready;
  if (!document.fonts.check('600 52px "Pretendard Variable"')) throw new Error("한글 글꼴이 로드되지 않았습니다. 다시 시도해 주세요.");
  const scenes = kind === "sample" ? r.scenes.slice(0, 1) : r.scenes, files: Record<string, Uint8Array> = {}, overlays: ReelOverlay[] = [];
  for (const [index, s] of scenes.entries()) {
    progress(`${index + 1}/${scenes.length}장면 · 글꼴과 문구 배치 확인`);
    const entries = [{ text: `${s.title}\n${s.screenText}`, cue: null }, ...(r.spec.narration ? (s.voice?.cues || []).map(cue => ({ text: cue.text, cue })) : [])];
    for (const [j, entry] of entries.entries()) {
      const canvas = document.createElement("canvas"); canvas.width = 1080; canvas.height = 1920; const ctx = canvas.getContext("2d")!, issues: string[] = [];
      const lines = (copy: string, size: number, weight: number, max = 860) => {
        ctx.font = `${weight} ${size}px "Pretendard Variable"`; const out: string[] = [];
        for (const paragraph of copy.split("\n")) { let line = ""; for (const word of paragraph.split(/(?<=\s)/)) { if (ctx.measureText(line + word).width <= max) line += word; else { if (line.trim()) out.push(line.trimEnd()); line = ""; for (const ch of word) { if (ctx.measureText(line + ch).width > max) { out.push(line.trimEnd()); line = ch; } else line += ch; } } } if (line.trim()) out.push(line.trim()); }
        return out;
      };
      if (!entry.cue) {
        const title = lines(s.title, 82, 750), body = lines(s.screenText, 52, 500), y = s.textPosition === "middle" ? 700 : 1060, height = title.length * 104 + body.length * 74 + 72;
        if (y + height > 1490) issues.push("화면 문구가 자막 안전영역과 겹칩니다. 중앙 배치 또는 문구 변경을 선택해 주세요.");
        const shade = ctx.createLinearGradient(0, y - 180, 0, Math.min(1900, y + height + 240)); shade.addColorStop(0, "rgba(10,10,11,0)"); shade.addColorStop(.36, "rgba(10,10,11,.76)"); shade.addColorStop(1, "rgba(10,10,11,.86)"); ctx.fillStyle = shade; ctx.fillRect(0, y - 180, 1080, 1920 - y + 180);
        ctx.fillStyle = "#d1fe17"; ctx.fillRect(84, y - 45, 52, 6); ctx.fillStyle = "#edefef"; ctx.textBaseline = "top"; ctx.font = '750 82px "Pretendard Variable"'; title.forEach((l, n) => ctx.fillText(l, 84, y + n * 104)); ctx.font = '500 52px "Pretendard Variable"'; body.forEach((l, n) => ctx.fillText(l, 84, y + title.length * 104 + 28 + n * 74));
      } else {
        const size = s.subtitleStyle === "emphasis" ? 64 : 56, subtitle = lines(entry.text, size, 650, 828), lineHeight = size * 1.36, height = subtitle.length * lineHeight + 40, y = 1620 - height;
        if (height > 300 || y < 1410) issues.push("발화 자막이 3줄을 넘습니다. 대본을 나누거나 장면 문구를 중앙에 배치해 주세요.");
        ctx.fillStyle = "rgba(10,10,11,.88)"; ctx.beginPath(); ctx.roundRect(82, y, 898, height, 20); ctx.fill(); ctx.font = `650 ${size}px "Pretendard Variable"`; ctx.fillStyle = s.subtitleStyle === "emphasis" ? "#d1fe17" : "#edefef"; ctx.textBaseline = "top"; subtitle.forEach((l, n) => ctx.fillText(l, 116, y + 20 + n * lineHeight));
      }
      const name = `scene-${index}-${j}.png`, blob = await new Promise<Blob>((resolve, reject) => canvas.toBlob(b => b ? resolve(b) : reject(new Error("문구 이미지 생성에 실패했습니다.")), "image/png")); files[name] = await blobBytes(blob);
      overlays.push({ sceneId: s.id, name, startMs: entry.cue?.startMs || 0, endMs: entry.cue?.endMs || s.frames / 30 * 1000, text: entry.text, issues });
    }
  }
  const issues = overlays.flatMap(o => o.issues); if (issues.length) throw new Error(issues[0]);
  files["manifest.json"] = strToU8(JSON.stringify({ version: r.contentVersion, kind, font: "Pretendard Variable", scenes: scenes.map(reelOverlayDescription), overlays }));
  return zip(files);
}
