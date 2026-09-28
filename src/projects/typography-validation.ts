import { fontById, fontWeights, displayOnly, TYPOGRAPHY_PRESETS, typographyPreset, type Typography, type TypographyRecommendation } from "./typography";
import type { Project } from "./types";
import { object, text, ServiceError } from "@/service/errors";

export function parseTypography(input: unknown): Typography {
  const d=object(input);
  if(d.version!==1 || typeof d.confirmed!=="boolean" || !["custom",...TYPOGRAPHY_PRESETS.map(p=>p.id)].includes(String(d.preset))) throw new ServiceError(400,"글꼴 조합을 다시 선택해 주세요.");
  const role=(key:"title"|"body"|"accent")=>{const c=object(d[key]),id=text(c.font,"글꼴",60,1),font=fontById(id);
    if(!font || font.language!==(key==="accent"?"en":"ko") || key==="body"&&displayOnly(id) || typeof c.weight!=="number" || !fontWeights(id).includes(c.weight)) throw new ServiceError(400,"해당 역할과 실제 굵기를 지원하는 글꼴을 선택해 주세요.");
    return {font:id,weight:c.weight};};
  return {version:1,preset:String(d.preset),title:role("title"),body:role("body"),accent:role("accent"),confirmed:d.confirmed};
}
export function parseTypographyRecommendations(input: unknown): TypographyRecommendation[] {
  // Older persisted runs and provider fixtures have no typography field.
  if(input===undefined)return [];
  if(!Array.isArray(input)||input.length!==3)throw new ServiceError(502,"글꼴 추천 3개를 확인하지 못했어요.");
  const items=input.map(raw=>{const d=object(raw),presetId=text(d.presetId,"조합",60,1);if(!TYPOGRAPHY_PRESETS.some(p=>p.id===presetId))throw new ServiceError(502,"지원하지 않는 글꼴 조합입니다.");return {presetId,reason:text(d.reason,"추천 이유",240,2),caution:text(d.caution,"확인 사항",180)};});
  if(new Set(items.map(i=>i.presetId)).size!==3)throw new ServiceError(502,"서로 다른 글꼴 조합이 필요합니다.");
  return items;
}
export function proposeTypography(project: Project, input: unknown) {
  const recommendations=parseTypographyRecommendations(input);
  if(recommendations.length&&!project.typography?.confirmed)project.typography=typographyPreset(recommendations[0].presetId);
  return recommendations;
}
