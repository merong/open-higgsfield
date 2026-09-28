"use client";
import { useState, type ReactNode } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { Alert, Button, StatusBadge } from "@openhiggsfield/design";
import { api } from "@/projects/api";
import { useSession } from "./workspace-shell";
import type { User } from "@/service/auth";

const groups=[
  {label:"워크스페이스",items:[{path:"/admin",label:"대시보드",icon:"▦"},{path:"/admin/users",label:"사용자 관리",icon:"◎"}]},
  {label:"콘텐츠 관리",items:[{path:"/admin/projects",label:"프로젝트 관리",icon:"▤"},{path:"/admin/activity",label:"생성 내역",icon:"◷"},{path:"/admin/results",label:"전체 에셋",icon:"▧"}]},
  {label:"운영 관리",items:[{path:"/admin/credits",label:"크레딧 관리",icon:"◇"},{path:"/admin/settings",label:"API 환경설정",icon:"⚙"}]},
];
export function AdminShell({user,children}:{user:User;children:ReactNode}) {
  const path=usePathname(),router=useRouter(),session=useSession();
  const [busy,setBusy]=useState(false),[error,setError]=useState("");
  async function logout(){setBusy(true);setError("");try{await api("auth/logout",{method:"POST"});await session.refresh();router.push("/login");router.refresh();}catch(e){setError((e as Error).message);}finally{setBusy(false);}}
  return <div className="ws-account-layout ws-admin-layout"><aside className="ws-account-sidebar" aria-label="관리자 사이드바">
    <div className="ws-account-identity"><span className="ws-account-avatar" aria-hidden>O</span><div><span className="ws-eyebrow">WORKSPACE ADMIN</span><strong>{user.name}</strong><small>{user.username || user.email}</small></div></div>
    <nav aria-label="관리자 메뉴">{groups.map(group=><section key={group.label}><p className="ws-account-nav-label">{group.label}</p>{group.items.map(item=><Link key={item.path} href={item.path} aria-current={path===item.path?"page":undefined}><span className="ws-account-nav-icon" aria-hidden>{item.icon}</span><span>{item.label}</span></Link>)}</section>)}</nav>
    <div className="ws-account-sidebar-bottom"><div className="ws-account-credit"><StatusBadge tone="success">로컬 접속 보호</StatusBadge><span>허용된 IP의 관리자만<br/>운영 기능을 사용할 수 있습니다.</span></div><Link href="/account" className="ws-account-admin-link">내 마이페이지 ↗</Link><Link className="ws-account-admin-link" href="/help/admin">관리자 도움말 ↗</Link><Button size="sm" onClick={logout} loading={busy} disabled={busy}>로그아웃</Button>{error && <Alert>{error}</Alert>}</div>
  </aside><div className="ws-account-content" key={path}>{children}</div></div>;
}
