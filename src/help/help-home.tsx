"use client";
import { useState } from "react";
import Link from "next/link";
import { Button, Input } from "@openhiggsfield/design";
import { GUIDES, HELP_GROUPS } from "./guides";
import { HelpIcon } from "./help-icons";
export function HelpHome(){
  const [query,setQuery]=useState(""),[group,setGroup]=useState("");
  const term=query.trim().toLocaleLowerCase(),filtered=GUIDES.filter(g=>(!group || g.group===group) && (!term || [g.title,g.description,...g.tips,...g.landmarks.flatMap(l=>[l.title,l.description]),...g.steps.flatMap(s=>[s.title,s.description]),...g.faq.flatMap(f=>[f.question,f.answer])].join(" ").toLocaleLowerCase().includes(term)));
  return <main className="help-home"><header className="help-home-heading"><span className="ws-eyebrow">THE CREATOR’S FIELD GUIDE</span><h1>아이디어에서 완성까지,<br/><em>한 단계씩.</em></h1><p>화면으로 보고, 순서대로 따라 만드는<br className="help-desktop-break"/> OpenHiggsfield 사용 안내입니다.</p></header>
    <div className="help-search"><HelpIcon name="search" size={22}/><label className="ws-sr-only" htmlFor="help-search">도움말 검색</label><Input type="search" id="help-search" placeholder="궁금한 기능을 검색하세요. 예: 업로드, 환불, WebM" value={query} maxLength={100} onChange={e=>setQuery(e.target.value)}/>{query && <Button size="sm" variant="ghost" onClick={()=>setQuery("")}>지우기</Button>}</div>
    {!term && !group && <Link href="/help/getting-started" className="help-start-card"><div><span className="ws-eyebrow">처음이라면 여기부터</span><h2>나에게 맞는 제작 도구 찾기</h2><p>카드뉴스, 릴스, 랜딩·제품 상세 페이지.<br/>만들고 싶은 결과물부터 골라 보세요.</p><span className="help-text-link">시작 가이드 읽기 ↗</span></div><img src="/help/screens/start.png" alt="카드뉴스, 릴스, 랜딩 페이지 제작 형식 선택 화면" width="1280" height="900"/></Link>}
    <section aria-labelledby="help-list-title" className="help-guide-index"><div className="help-section-heading"><h2 id="help-list-title">기능별 사용 가이드</h2><span role="status">{filtered.length}개 안내</span></div><div className="help-category-tabs" role="group" aria-label="도움말 분류">{["",...HELP_GROUPS].map(item=><button type="button" aria-pressed={group===item} key={item} onClick={()=>setGroup(item)}>{item || "전체"}</button>)}</div>
      {filtered.length===0?<div className="help-empty"><HelpIcon name="search" size={32}/><h3>검색 결과가 없습니다</h3><p>다른 검색어를 사용하거나 분류를 초기화해 보세요.</p><Button onClick={()=>{setQuery("");setGroup("");}}>전체 도움말 보기</Button></div>:<div className="help-guide-grid">{filtered.map(g=><Link key={g.slug} href={`/help/${g.slug}`} className="help-guide-card"><div><HelpIcon name={g.icon} size={28}/><span>{g.group}{g.admin?" 전용":""}</span><b aria-hidden>↗</b></div><h3>{g.title}</h3><p>{g.description}</p><small>{g.workflow?`화면 안내 · ${g.steps.length}단계 워크플로우`:"화면 안내 · 이용 방법"}</small></Link>)}</div>}
    </section><div className="help-home-footer"><HelpIcon name="check" size={28}/><div><h2>어디서 막혔나요?</h2><p>생성·업로드·저장 오류부터 확인해 보세요.</p></div><Button href="/help/troubleshooting">문제 해결 안내</Button></div>
  </main>;
}
