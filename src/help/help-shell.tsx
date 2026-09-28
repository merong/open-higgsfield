"use client";
import { useState, type ReactNode } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Button } from "@openhiggsfield/design";
import { GUIDES, HELP_GROUPS } from "./guides";
import { HelpIcon } from "./help-icons";
export function HelpShell({children}:{children:ReactNode}){
  const path=usePathname(),[open,setOpen]=useState(false);
  return <div className="help-layout"><aside className="help-sidebar"><Link href="/help" className="help-brand" onClick={()=>setOpen(false)}><span>?</span><div><strong>도움말 센터</strong><small>OpenHiggsfield Guide</small></div></Link><div className="help-mobile-toggle"><Button size="sm" aria-expanded={open} aria-controls="help-menu" onClick={()=>setOpen(v=>!v)}>{open?"목차 닫기":"기능별 목차"}</Button></div><nav id="help-menu" aria-label="도움말 목차" data-open={open}><Link href="/help" aria-current={path==="/help"?"page":undefined} onClick={()=>setOpen(false)}><HelpIcon name="library" size={17}/>도움말 홈</Link>{HELP_GROUPS.map(group=><section key={group}><h2>{group}</h2>{GUIDES.filter(g=>g.group===group).map(g=><Link key={g.slug} href={`/help/${g.slug}`} aria-current={path===`/help/${g.slug}`?"page":undefined} onClick={()=>setOpen(false)}><HelpIcon name={g.icon} size={17}/><span>{g.title}</span></Link>)}</section>)}</nav><Link className="help-return" href="/projects">워크스페이스로 돌아가기 ↗</Link></aside><div className="help-content" key={path}>{children}</div></div>;
}
