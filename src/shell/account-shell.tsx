"use client";
import { useState, type ReactNode } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { Alert, Button } from "@openhiggsfield/design";
import { useSession } from "./workspace-shell";
import { api } from "@/projects/api";
import type { User } from "@/service/auth";
const groups=[
  {label:"나의 작업",items:[{path:"/account",label:"내 라이브러리",icon:"▦"},{path:"/account/projects",label:"내 프로젝트",icon:"▤"},{path:"/account/activity",label:"생성 내역",icon:"◷"}]},
  {label:"계정 관리",items:[{path:"/account/credits",label:"크레딧",icon:"◇"},{path:"/account/profile",label:"계정 정보",icon:"◎"},{path:"/account/notifications",label:"알림 설정",icon:"◉",preview:true},{path:"/account/billing",label:"결제 및 구독",icon:"▱",preview:true}]},
];
export function AccountShell({user:initialUser,children}:{user:User;children:ReactNode}) {
  const path=usePathname(),router=useRouter(),session=useSession(),user=session.user || initialUser;
  const [error,setError]=useState(""),[busy,setBusy]=useState(false);
  async function logout(){setBusy(true);setError("");try{await api("auth/logout",{method:"POST"});await session.refresh();router.push("/login");router.refresh();}catch(e){setError((e as Error).message);}finally{setBusy(false);}}
  return <div className="ws-account-layout"><aside className="ws-account-sidebar" aria-label="마이페이지 사이드바">
    <div className="ws-account-identity"><span className="ws-account-avatar" aria-hidden>{user.name.slice(0,1)}</span><div><span className="ws-eyebrow">MY WORKSPACE</span><strong>{user.name}</strong><small>{user.username || user.email}</small></div></div>
    <nav aria-label="마이페이지 메뉴">{groups.map(group=><section key={group.label}><p className="ws-account-nav-label">{group.label}</p>{group.items.map(item=><Link key={item.path} href={item.path} aria-current={path===item.path?"page":undefined}><span className="ws-account-nav-icon" aria-hidden>{item.icon}</span><span>{item.label}</span>{"preview" in item && <small>준비 중</small>}</Link>)}</section>)}</nav>
    <div className="ws-account-sidebar-bottom"><Link href="/account/credits" className="ws-account-credit"><span>사용 가능한 크레딧</span><strong>{user.credits.toLocaleString()} <small>◇</small></strong><span>사용 내역 보기 ↗</span></Link>{user.admin && <Link className="ws-account-admin-link" href="/admin">관리자 페이지 ↗</Link>}<Link className="ws-account-admin-link" href="/help">도움말 센터 ↗</Link><Button onClick={logout} loading={busy} disabled={busy} size="sm">로그아웃</Button>{error && <Alert>{error}</Alert>}</div>
  </aside><div className="ws-account-content" key={path}>{children}</div></div>;
}
