import { tokens, type Token } from "@/index";

import { contrast } from "../lib/contrast";

const entries = Object.entries(tokens) as [Token, string][];
const pick = (re: RegExp) => entries.filter(([k]) => re.test(k));
const colors = entries.filter(([, v]) => /^(#|rgba?\()/.test(v));
const SAMPLE = "여름 자외선 차단제 고르는 법 · Sunscreen 0123";

export function Tokens() {
  return (
    <>
      <h1 className="sc-h1">토큰</h1>
      <p className="sc-lead">
        표면, 글자, 간격의 공통 언어. 기존 71개 토큰 위에 작업 화면을 위한 의미
        토큰을 더했습니다.
      </p>

      <section className="sc-section">
        <h2 className="sc-h2">색</h2>
        <p className="sc-note">
          글자색은 --bg 위 대비비, 표면색은 그 위에 놓인 --tx의 대비비. 반투명
          값은 비율을 적지 않는다.
        </p>
        <div className="sc-grid">
          {colors.map(([k, v]) => {
            const isText = /^(tx|accent$|accent-strong$|danger$)/.test(k);
            const ratio = isText
              ? contrast(v, tokens.bg)
              : contrast(tokens.tx, v);
            return (
              <div key={k} className="sc-swatch">
                <div className="sc-swatch-chip" style={{ background: v }} />
                <div className="sc-swatch-name">--{k}</div>
                <div className="sc-swatch-value">{v}</div>
                {ratio !== null && (
                  <div className="sc-swatch-ratio">{ratio.toFixed(2)}:1</div>
                )}
              </div>
            );
          })}
        </div>
      </section>

      <section className="sc-section">
        <h2 className="sc-h2">반지름</h2>
        <div className="sc-row">
          {pick(/^radius-/).map(([k, v]) => (
            <div key={k} className="sc-spec">
              <div
                className="sc-box"
                style={{ width: 64, height: 48, borderRadius: v }}
              />
              <span>
                {k.slice(7)} · {v}
              </span>
            </div>
          ))}
        </div>
      </section>

      <section className="sc-section">
        <h2 className="sc-h2">컨트롤 높이</h2>
        <div className="sc-row">
          {pick(/^h-/).map(([k, v]) => (
            <div key={k} className="sc-spec">
              <div
                className="sc-box"
                style={{
                  width: 96,
                  height: v,
                  borderRadius: "var(--radius-ctl)",
                }}
              />
              <span>
                {k.slice(2)} · {v}
              </span>
            </div>
          ))}
        </div>
      </section>

      <section className="sc-section">
        <h2 className="sc-h2">글자 크기</h2>
        {pick(/^fs-/).map(([k, v]) => (
          <div key={k} className="sc-cell" style={{ marginBottom: 8 }}>
            <span
              className="sc-spec"
              style={{ width: 110, alignItems: "flex-start" }}
            >
              {k.slice(3)} · {v}
            </span>
            <span style={{ fontSize: v }}>{SAMPLE}</span>
          </div>
        ))}
      </section>

      <section className="sc-section">
        <h2 className="sc-h2">굵기와 자간</h2>
        {pick(/^fw-/).map(([k, v]) => (
          <div key={k} className="sc-cell" style={{ marginBottom: 8 }}>
            <span
              className="sc-spec"
              style={{ width: 110, alignItems: "flex-start" }}
            >
              {k.slice(3)} · {v}
            </span>
            <span style={{ fontWeight: v }}>{SAMPLE}</span>
          </div>
        ))}
        {pick(/^ls-/).map(([k, v]) => (
          <div key={k} className="sc-cell" style={{ marginBottom: 8 }}>
            <span
              className="sc-spec"
              style={{ width: 110, alignItems: "flex-start" }}
            >
              {k.slice(3)} · {v}
            </span>
            <span
              style={{
                letterSpacing: v,
                textTransform: k === "ls-caps" ? "uppercase" : undefined,
              }}
            >
              {SAMPLE}
            </span>
          </div>
        ))}
      </section>

      <section className="sc-section">
        <h2 className="sc-h2">간격</h2>
        <div className="sc-row">
          {pick(/^sp-/).map(([k, v]) => (
            <div key={k} className="sc-spec">
              <div
                className="sc-box"
                style={{ width: v, height: 24, background: "var(--accent-32)" }}
              />
              <span>
                {k.slice(3)} · {v}
              </span>
            </div>
          ))}
        </div>
      </section>

      <section className="sc-section">
        <h2 className="sc-h2">그림자</h2>
        <div className="sc-row">
          {[
            ...pick(/^shadow-/),
            ["glint", tokens.glint] as [Token, string],
          ].map(([k, v]) => (
            <div key={k} className="sc-spec">
              <div
                style={{
                  width: 120,
                  height: 72,
                  borderRadius: "var(--radius-lg)",
                  background: "var(--s2)",
                  boxShadow: v,
                }}
              />
              <span>{k}</span>
            </div>
          ))}
        </div>
      </section>

      <section className="sc-section">
        <h2 className="sc-h2">모션</h2>
        <p className="sc-note">
          마우스를 올리면 각 지속 시간으로 움직인다. ease {tokens.ease} ·
          ease-slide {tokens["ease-slide"]}
        </p>
        <div className="sc-row">
          {pick(/^dur-/).map(([k, v]) => (
            <div key={k} className="sc-spec">
              <div className="sc-motion" style={{ transitionDuration: v }} />
              <span>
                {k.slice(4)} · {v}
              </span>
            </div>
          ))}
        </div>
      </section>
    </>
  );
}
