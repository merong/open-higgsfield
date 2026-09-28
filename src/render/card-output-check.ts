import { typographyFamily, typographyCoverage } from "@/projects/typography";
import type { Project } from "@/projects/types";
import type { OutputCheck } from "@/projects/card-workflow";
const compact = (s: string) => s.replace(/\s+/g, "");
/** Browser measurements are evidence, not OCR or a guarantee of factual accuracy. */
export function inspectCardOutput(nodes: HTMLElement[], project: Project): OutputCheck[] {
  return project.slots.map((slot, i) => {
    const slide = nodes[i]?.querySelector<HTMLElement>(".ohf-slide"), issues: string[] = [];
    if (!slide) return { cardId: slot.id, mobileBodyPx: 0, issues: ["카드 출력 영역이 없습니다."] };
    const rect = slide.getBoundingClientRect(), body = slide.querySelector<HTMLElement>(".ohf-slide-body")!;
    const footer = slide.querySelector<HTMLElement>(".ohf-slide-foot"), lower = footer?.getBoundingClientRect().top ?? rect.bottom;
    const visible = compact(body.innerText);
    const expected = [slot.title, ...slot.body.split(slot.kind === "compare" ? /[:\n]/ : /\n/)];
    if (expected.some(text => text.trim() && !visible.includes(compact(text)))) issues.push("제목 또는 본문 일부가 출력 요소에 없습니다.");
    const walker = document.createTreeWalker(body, NodeFilter.SHOW_TEXT); let node: Node | null;
    while ((node = walker.nextNode())) {
      if (!node.textContent?.trim()) continue;
      const range = document.createRange(); range.selectNodeContents(node);
      if (Array.from(range.getClientRects()).some(r => r.left < rect.left - 1 || r.right > rect.right + 1 || r.top < Math.max(rect.top, body.getBoundingClientRect().top) - 1 || r.bottom > lower + 1)) {
        issues.push("문구가 사진/출력 경계 또는 하단 정보 영역을 침범합니다. 설명 중심 배치와 여백을 먼저 조정하세요."); break;
      }
    }
    const textNodes = Array.from(body.querySelectorAll<HTMLElement>(".ohf-slide-sub,.ohf-slide-text,.ohf-slide-compare p,.ohf-slide-li"));
    const px = textNodes.map(el => parseFloat(getComputedStyle(el).fontSize) * 360 / rect.width);
    const mobileBodyPx = Math.round((px.length ? Math.min(...px) : 0) * 10) / 10;
    if (mobileBodyPx && mobileBodyPx < 14) issues.push(`360px 화면에서 본문이 ${mobileBodyPx}px입니다. 14px 이상을 권장합니다.`);
    for (const img of slide.querySelectorAll("img")) if (!img.complete || !img.naturalWidth) issues.push("이미지를 읽지 못했습니다.");
    if(project.typography) {
      for(const role of ["title","body","accent"] as const) {
        const value=role==="title"?slot.title:role==="body"?slot.body+slot.cta:slot.kicker, font=project.typography[role];
        if(!document.fonts.check(`${font.weight} 16px '${typographyFamily(font)}'`,value||"Aa 한글")) issues.push("선택한 글꼴 로드를 확인하지 못했습니다.");
        const missing=typographyCoverage(project.typography,role,value).missing;
        if(missing.length)issues.push(`글꼴이 지원하지 않는 문자: ${missing.slice(0,12).join(" ")}`);
      }
    } else if (!document.fonts.check("16px 'Pretendard Variable'", "한글 카드뉴스")) issues.push("한글 글꼴 로드를 확인하지 못했습니다.");
    return { cardId: slot.id, mobileBodyPx, issues: [...new Set(issues)] };
  });
}
