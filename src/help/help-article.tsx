"use client";
import { useState } from "react";
import Link from "next/link";
import { Button, Dialog, StatusBadge } from "@openhiggsfield/design";
import type { HelpGuide } from "./guides";
import { guideFor } from "./guides";
import { Workflow } from "./workflow";
import { HelpIcon } from "./help-icons";
export function HelpArticle({guide}:{guide:HelpGuide}){
  const [zoom,setZoom]=useState(false),[failed,setFailed]=useState(false);
  const image=`/help/screens/${guide.image}.png`;
  return <main className="help-article"><nav className="help-breadcrumb" aria-label="현재 위치"><Link href="/help">도움말</Link><span aria-hidden>/</span><span>{guide.group}</span></nav><header className="help-article-heading"><div className="help-article-label"><HelpIcon name={guide.icon} size={24}/><span className="ws-eyebrow">{guide.group} / GUIDE</span>{guide.admin && <StatusBadge tone="warning">관리자용</StatusBadge>}</div><h1>{guide.title}</h1><p>{guide.description}</p><Button href={guide.action.href} variant="primary">{guide.action.label} ↗</Button></header>
    <nav className="help-on-this-page" aria-label="이 문서에서">{guide.workflow && <a href="#workflow">워크플로우</a>}<a href="#screen">화면 살펴보기</a><a href="#steps">{guide.workflow?"따라 하기":"이용 방법"}</a><a href="#questions">자주 묻는 질문</a></nav>
    {guide.workflow && <section id="workflow" className="help-section"><div className="help-section-heading"><h2>한눈에 보는 워크플로우</h2><span>{guide.steps.length} STEPS</span></div><Workflow guide={guide}/></section>}
    <section id="screen" className="help-section"><div className="help-section-heading"><h2>화면 살펴보기</h2><span>이미지를 누르면 확대됩니다</span></div><figure className="help-screen"><button type="button" onClick={()=>setZoom(true)} aria-label={`${guide.title} 화면 확대`} disabled={failed}>{failed?<span className="help-image-fallback">이미지를 불러오지 못했습니다. 아래 설명을 확인해 주세요.</span>:<img src={image} alt={guide.imageAlt} width="1280" height={guide.image.startsWith("studio-")?720:900} loading="lazy" onError={()=>setFailed(true)}/>}<span className="help-zoom-label"><HelpIcon name="search" size={15}/>화면 확대</span></button><figcaption>{guide.caption}</figcaption></figure><div className="help-landmarks">{guide.landmarks.map((item,i)=><div key={item.title}><span>{String.fromCharCode(65+i)}</span><div><h3>{item.title}</h3><p>{item.description}</p></div></div>)}</div></section>
    <section id="steps" className="help-section"><h2>{guide.workflow?"순서대로 따라 하기":"이용 방법"}</h2><ol className={`help-steps ${guide.workflow?"":"help-reference-steps"}`}>{guide.steps.map((s,i)=><li key={s.title}>{guide.workflow && <span className="help-step-index">0{i+1}</span>}<div><h3>{s.title}</h3><p>{s.description}</p></div><HelpIcon name={s.icon} size={26}/></li>)}</ol><aside className="help-tips"><span><HelpIcon name="check" size={20}/>미리 알아두세요</span><ul>{guide.tips.map(tip=><li key={tip}>{tip}</li>)}</ul></aside></section>
    <section id="questions" className="help-section"><h2>자주 묻는 질문</h2><div className="help-faq">{guide.faq.map(item=><details key={item.question}><summary>{item.question}<span aria-hidden>＋</span></summary><p>{item.answer}</p></details>)}</div></section>
    <section className="help-section"><div className="help-section-heading"><h2>함께 보면 좋은 가이드</h2><Link href="/help">전체 도움말 ↗</Link></div><div className="help-related">{guide.related.map(slug=>{const g=guideFor(slug);return g?<Link href={`/help/${slug}`} key={slug}><HelpIcon name={g.icon} size={22}/><span>{g.title}</span><span aria-hidden>↗</span></Link>:null;})}</div></section><footer className="help-article-footer"><p>테스트 계정의 화면 예시입니다. 선택한 모델·프로젝트에 따라 표시 항목은 달라질 수 있습니다.</p><a href="#">맨 위로 ↑</a></footer>
    <Dialog open={zoom} title={`${guide.title} · 화면 안내`} closeLabel="닫기" onClose={()=>setZoom(false)} width={1200} className="help-image-dialog"><img src={image} alt={guide.imageAlt} width="1280" height={guide.image.startsWith("studio-")?720:900}/><p>{guide.caption}</p></Dialog>
  </main>;
}
