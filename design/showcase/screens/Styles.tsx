import { SLIDE_PRESETS, SLIDE_STYLES, Tag } from "@/index";

import { DECK } from "../data";
import { renderSlide } from "../lib/slide";
import { Screen } from "./shell";

const INFO = {
  basic: ["기본 고딕", "Pretendard · 남색, 흰색, 노랑", "범용 · 기본값"],
  editorial: ["에디토리얼", "Noto Serif KR 제목 + Pretendard 본문 · 크림, 짙은 갈색, 벽돌색", "매거진, 뷰티, 라이프스타일"],
  impact: ["임팩트", "Black Han Sans 제목 + Pretendard 본문 · 검정, 흰색, 주홍", "정보성, 뉴스, 할인 공지"],
  soft: ["부드럽게", "Gowun Dodum · 세이지, 짙은 초록, 초록", "육아, 웰니스, 카페"],
} as const;

export function Styles() {
  return (
    <Screen width={1440} height={440}>
      <div className="sc-page" style={{ width: "100%", padding: "28px 32px" }}>
        <div className="sc-page-head" style={{ alignItems: "baseline" }}>
          <h1 className="sc-page-title" style={{ fontSize: 20 }}>스타일 4종</h1>
          <span className="sc-muted">글꼴 쌍 + 색 세 개(배경·글자·강조) · 왼쪽은 사진 위 표지, 오른쪽은 단색 CTA · 모두 OFL 글꼴</span>
        </div>
        <div className="sc-cols" style={{ gap: 16 }}>
          {SLIDE_PRESETS.map((p) => {
            const s = SLIDE_STYLES[p];
            return (
              <div key={p} className="sc-style-col" data-default={p === "basic"}>
                <div className="sc-style-pair">
                  {renderSlide(DECK[0]!, 1, p)}
                  {renderSlide(DECK[7]!, 8, p, "4:5", false)}
                </div>
                <div className="sc-cell">
                  <span style={{ fontSize: 14, fontWeight: 620 }}>{INFO[p][0]}</span>
                  {p === "basic" && <Tag tone="accent">기본값</Tag>}
                  <span className="sc-spacer" />
                  <span className="sc-chips">{[s.bg, s.tx, s.acc].map((c) => <i key={c} style={{ background: c }} />)}</span>
                </div>
                <span className="sc-muted" style={{ color: "var(--tx2)" }}>{INFO[p][1]}</span>
                <span className="sc-muted">{INFO[p][2]}</span>
              </div>
            );
          })}
        </div>
      </div>
    </Screen>
  );
}
