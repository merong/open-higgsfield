import { Tag } from "@/index";

import { DECK } from "../data";
import { renderSlide } from "../lib/slide";
import { Screen } from "./shell";

const SPECS: [number, string, string][] = [
  [0, "제목 28자 · 부제 24자 · 꼬리표 12자(선택)", "위치 · 제목 크기 · 어둡게 40%"],
  [1, "제목 24자 · 본문 90자", "위치 · 어둡게 55%"],
  [2, "제목 20자 · 항목 3~5개, 항목당 24자", "번호 표시 · 어둡게 75%"],
  [3, "인용문 60자 · 출처 20자(선택)", "위치 · 어둡게 60%"],
  [7, "제목 24자 · 부제 30자(선택)", "위치 · 기본은 단색 배경"],
];

export function Templates() {
  return (
    <Screen width={1440} height={520}>
      <div className="sc-page" style={{ width: "100%", padding: "28px 32px" }}>
        <div className="sc-page-head" style={{ alignItems: "baseline" }}>
          <h1 className="sc-page-title" style={{ fontSize: 20 }}>템플릿 5종</h1>
          <span className="sc-muted">한 덱의 다섯 장 · 기본 고딕 스타일 · 1080×1350을 256px로 줄여 실제 글꼴로 조판</span>
        </div>
        <div className="sc-cols">
          {SPECS.map(([i, limits, opts]) => (
            <div key={i} className="sc-col">
              {renderSlide(DECK[i]!, i + 1, "basic")}
              <div className="sc-cell"><span style={{ fontSize: 14, fontWeight: 620 }}>{DECK[i]!.label}</span><Tag tone="muted">{DECK[i]!.kind}</Tag></div>
              <span className="sc-muted" style={{ color: "var(--tx2)" }}>{limits}</span>
              <span className="sc-muted">옵션: {opts}</span>
            </div>
          ))}
        </div>
      </div>
    </Screen>
  );
}
