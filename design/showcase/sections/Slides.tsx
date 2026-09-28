import { useState } from "react";
import {
  SLIDE_PRESETS,
  CompareSlide,
  MetricSlide,
  SlideFrame,
  Segment,
  Switch,
  type SlidePreset,
  type SlideRatio,
  type SlideComposition,
} from "@/index";
import { DECK } from "../data";
import { renderSlide } from "../lib/slide";
const RATIOS: SlideRatio[] = ["4:5", "3:4", "1:1", "9:16"];
const NAMES = {
  basic: "시그니처",
  editorial: "에디토리얼",
  impact: "임팩트",
  soft: "소프트",
};
const SAMPLES = [0, 1, 2, 3, 7];
export function Slides() {
  const [ratio, setRatio] = useState<SlideRatio>("4:5");
  const [preset, setPreset] = useState<SlidePreset>("editorial");
  const [composition, setComposition] = useState<SlideComposition>("split");
  const [photo, setPhoto] = useState(true);
  const [dim, setDim] = useState("grad");
  const extra = {
    composition,
    dim: dim === "grad" ? ("grad" as const) : Number(dim) / 100,
  };
  return (
    <>
      <span className="sc-eyebrow">CONTENT DESIGN / SLIDES</span>
      <h1 className="sc-h1">한 장에도, 분명한 인상.</h1>
      <p className="sc-lead">
        사진과 문장 사이의 균형. 같은 이야기에도 다른 표정을 만드는 네 가지
        스타일.
      </p>
      <section className="sc-slide-lab">
        <div className="sc-slide-lab-preview">
          {renderSlide(DECK[0]!, 1, preset, ratio, photo, extra)}
        </div>
        <div className="sc-slide-lab-controls">
          <span className="sc-eyebrow">ART DIRECTION</span>
          <h2>
            콘텐츠에 맞는
            <br />
            여백을 선택하세요.
          </h2>
          <p>
            전체 사진의 몰입감, 분리된 본문의 가독성, 여백이 만드는 차분함. 화면
            비율과 구도를 바꿔 비교해 보세요.
          </p>
          <label className="sc-label">스타일</label>
          <Segment
            plate
            size="sm"
            items={SLIDE_PRESETS.map((p) => ({ id: p, label: NAMES[p] }))}
            value={preset}
            onChange={(v) => setPreset(v as SlidePreset)}
            aria-label="대표 슬라이드 스타일"
          />
          <label className="sc-label">구도</label>
          <Segment
            plate
            size="sm"
            items={[
              { id: "full", label: "전체 사진" },
              { id: "split", label: "분리형" },
              { id: "inset", label: "여백형" },
            ]}
            value={composition}
            onChange={(v) => setComposition(v as SlideComposition)}
            aria-label="슬라이드 구도"
          />
          <label className="sc-label">규격</label>
          <Segment
            plate
            size="sm"
            items={RATIOS.map((r) => ({ id: r, label: r }))}
            value={ratio}
            onChange={(v) => setRatio(v as SlideRatio)}
            aria-label="비율"
          />
          <div className="sc-cell">
            <Switch
              checked={photo}
              onChange={setPhoto}
              aria-label="사진 배경"
            />
            <span className="sc-muted">사진 배경</span>
          </div>
          <label className="sc-label" htmlFor="slide-dim">
            사진 밝기 조절
          </label>
          <select
            id="slide-dim"
            className="ohf-input"
            value={dim}
            onChange={(e) => setDim(e.target.value)}
            disabled={!photo || composition !== "full"}
          >
            <option value="grad">하단 그라데이션</option>
            <option value="0">원본</option>
            <option value="40">40% 어둡게</option>
            <option value="75">75% 어둡게</option>
          </select>
        </div>
      </section>
      <div className="sc-section-heading">
        <div>
          <span className="sc-eyebrow">THE TEMPLATE COLLECTION</span>
          <h2 className="sc-h2">이야기의 흐름을 만드는 다섯 장</h2>
        </div>
        <span className="sc-muted">5 templates / 4 styles</span>
      </div>
      {SAMPLES.map((i) => (
        <section key={i} className="sc-section">
          <div className="sc-template-heading">
            <h2 className="sc-h2">{DECK[i]!.label}</h2>
            <span className="sc-muted">
              {
                [
                  "첫인상을 만드는 제목",
                  "맥락을 전하는 문장",
                  "한눈에 읽히는 정보",
                  "기억에 남는 한마디",
                  "다음 행동으로의 초대",
                ][SAMPLES.indexOf(i)]
              }
            </span>
          </div>
          <div className="sc-slides">
            {SLIDE_PRESETS.map((p) => (
              <div key={p} className="sc-slide-col">
                {renderSlide(DECK[i]!, i + 1, p, ratio, photo)}
                <span>
                  {NAMES[p]} <small>{p}</small>
                </span>
              </div>
            ))}
          </div>
        </section>
      ))}
      <section className="sc-section">
        <div className="sc-template-heading">
          <h2 className="sc-h2">정보를 더 선명하게</h2>
          <span className="sc-muted">확장 템플릿 · 숫자와 비교</span>
        </div>
        <div className="sc-extensions-slides">
          <SlideFrame
            preset="basic"
            position="mid"
            edition="CREATOR NOTES"
            handle="@your.brand"
            page="01"
          >
            <MetricSlide
              value="08"
              unit="장"
              title="하나의 이야기, 여덟 개의 장면"
              detail="표지부터 마지막 행동까지. 핵심 메시지를 짧고 명료하게 나누세요."
            />
          </SlideFrame>
          <SlideFrame
            preset="editorial"
            position="mid"
            edition="THE EDITORIAL GUIDE"
            handle="@your.brand"
            page="02"
          >
            <CompareSlide
              title="어떤 방식으로 전할까요?"
              columns={[
                {
                  label: "사진 중심",
                  body: "분위기와 질감을 먼저 전하고, 짧은 제목으로 시선을 붙잡습니다.",
                },
                {
                  label: "문장 중심",
                  body: "충분한 여백 속에 핵심을 배치하고, 읽는 속도를 설계합니다.",
                },
              ]}
            />
          </SlideFrame>
        </div>
      </section>
    </>
  );
}
