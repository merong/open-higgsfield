import { useState } from "react";
import { Avatar, Button, Tag, cx } from "@/index";
import { PlusIcon, WalletIcon } from "@/index";

import { LEDGER, PACKS } from "../data";
import { AppBar, Screen } from "./shell";

export function Account() {
  const [pack, setPack] = useState("크리에이터");
  return (
    <Screen width={1440} height={900}>
      <AppBar />
      <main className="sc-page" style={{ width: 1040, gap: 24 }}>
        <div className="sc-cell" style={{ gap: 14 }}>
          <Avatar initials="BK" size={44} />
          <div>
            <h1 className="sc-page-title" style={{ fontSize: 20 }}>
              계정
            </h1>
            <span className="sc-muted">
              brian@example.com · 카카오로 로그인
            </span>
          </div>
          <span className="sc-spacer" />
          <Button variant="ghost" disabled>
            로그아웃
          </Button>
        </div>
        <div className="sc-account-grid">
          <section className="sc-card" style={{ gap: 14 }}>
            <span className="sc-muted sc-cell">
              <WalletIcon size={15} />
              크레딧 잔액
            </span>
            <div className="sc-big">1,240</div>
            <span className="sc-muted">
              이미지 1장 4 크레딧 · 구성안 1 크레딧
              <br />
              실패한 생성은 자동으로 돌려드립니다
            </span>
            <Button variant="primary" size="lg" icon={<PlusIcon />} disabled>
              결제 연동 예정
            </Button>
          </section>
          <section className="sc-stack">
            <span className="sc-label">충전 패키지</span>
            <div className="sc-row-3">
              {PACKS.map((p) => (
                <button
                  key={p.name}
                  type="button"
                  className="sc-pack"
                  aria-pressed={pack === p.name}
                  onClick={() => setPack(p.name)}
                >
                  <span className="sc-cell">
                    <span className="sc-muted">{p.name}</span>
                    <span className="sc-spacer" />
                    {p.best && <Tag tone="accent">인기</Tag>}
                  </span>
                  <span className="sc-pack-credits">
                    {p.credits} <small>크레딧</small>
                  </span>
                  <span className="sc-muted">{p.price}</span>
                </button>
              ))}
            </div>
            <span className="sc-muted">
              가격과 단가는 서비스 기반 기획에서 정합니다 · 결제는 국내 PG로
              진행합니다
            </span>
          </section>
        </div>
        <section className="sc-stack">
          <div className="sc-cell">
            <span className="sc-label">사용 내역</span>
            <span className="sc-spacer" />
            <Tag>최근 30일 · 예시 내역</Tag>
          </div>
          <div className="sc-table">
            <div className="sc-table-head">
              <span>일시</span>
              <span>내용</span>
              <span>프로젝트</span>
              <span className="sc-right">크레딧</span>
            </div>
            {LEDGER.map((r, i) => (
              <div key={i} className="sc-table-row">
                <span className="sc-muted">{r.when}</span>
                <span>{r.what}</span>
                <span className="sc-muted">{r.detail}</span>
                <span
                  className={cx(
                    "sc-right sc-amount",
                    r.tone === "plus" && "sc-amount--plus",
                    r.tone === "refund" && "sc-amount--refund",
                  )}
                >
                  {r.tone === "minus" ? "−" : "+"}
                  {r.amount}
                </span>
              </div>
            ))}
          </div>
        </section>
      </main>
    </Screen>
  );
}
