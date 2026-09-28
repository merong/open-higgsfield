"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { Alert, Button, Dialog, Field, Input, StatusBadge } from "@openhiggsfield/design";
import { api } from "@/projects/api";
import { LIBRARY_FEATURES } from "@/projects/library";
import { ADMIN_SECTIONS, JOB_STATES, type AdminDashboard, type AdminList, type AdminRows, type AdminUserRow, type AdminProjectRow, type AdminJobRow } from "@/projects/admin-types";

const formats:Record<string,string>={"card-news":"카드뉴스",reels:"숏폼 · 릴스",landing:"랜딩 페이지","product-detail":"제품 상세 페이지"};
const tones:Record<string,string>={friendly:"친근한",expert:"전문적인",witty:"재치 있는",calm:"차분한"};
const date=(value:string|number)=>new Date(Number(value)).toLocaleString("ko-KR");
const amount=(value:string|number|undefined)=>value===undefined?"—":Number(value).toLocaleString();
const ownerLink=(path:string,id:string)=>`/admin/${path}?userId=${encodeURIComponent(id)}`;
function useReport<T>(path:string){
  const [data,setData]=useState<T|null>(null),[error,setError]=useState(""),[loading,setLoading]=useState(true),[revision,setRevision]=useState(0);
  useEffect(()=>{const controller=new AbortController();setLoading(true);setError("");void api<T>(`admin/${path}`,{signal:controller.signal}).then(result=>{if(!controller.signal.aborted)setData(result);}).catch(e=>{if(!controller.signal.aborted){setError(e.message);setData(null);}}).finally(()=>{if(!controller.signal.aborted)setLoading(false);});return()=>controller.abort();},[path,revision]);
  return {data,error,loading,refresh:()=>setRevision(n=>n+1)};
}
function JobBadge({state}:{state:AdminJobRow["state"]}){return <StatusBadge tone={state==="completed"?"success":state==="failed"?"danger":"warning"}>{JOB_STATES[state]}</StatusBadge>;}
function OwnerActions({id}:{id:string}){return <div className="ws-settings-actions"><Button size="sm" href={ownerLink("projects",id)}>프로젝트</Button><Button size="sm" href={ownerLink("activity",id)}>생성 내역</Button><Button size="sm" href={ownerLink("results",id)}>에셋</Button><Button size="sm" href={ownerLink("credits",id)}>크레딧 지급·내역</Button></div>;}

export function AdminDashboardPage(){
  const {data,error,loading,refresh}=useReport<AdminDashboard>("dashboard");
  const stats=[{label:"전체 사용자",value:data?.users,unit:"명",href:"/admin/users",note:"등록 계정 · 관리자 포함"},{label:"진행 중인 프로젝트",value:data?.projects,unit:"개",href:"/admin/projects?filter=active",note:"삭제 보관된 프로젝트 제외"},{label:"전체 생성 요청",value:data?.jobs,unit:"건",href:"/admin/activity",note:`완료 ${amount(data?.completed)} · 진행 ${amount(data?.pending)}`},{label:"보관 파일",value:data?.files,unit:"개",href:"/admin/results",note:data?`${(Number(data.storage)/1024/1024).toFixed(1)} MB · 업로드 및 저장 사본`:"업로드 및 저장 사본"}];
  return <main className="ws-page ws-admin-panel"><div className="ws-page-heading"><div><span className="ws-eyebrow">WORKSPACE / OVERVIEW</span><h1>워크스페이스 한눈에</h1><p>사용자들의 작업부터 크레딧 흐름까지, 운영 현황을 확인하세요.</p></div><Button onClick={refresh} disabled={loading}>새로고침</Button></div>{error && <Alert>{error}</Alert>}
    <div className="ws-admin-metrics" aria-busy={loading}>{stats.map(s=><Link href={s.href} className="ws-card ws-admin-metric" key={s.label}><div><span>{s.label}</span><span aria-hidden>↗</span></div><strong>{amount(s.value)} <small>{s.unit}</small></strong><p>{s.note}</p></Link>)}</div>
    <div className="ws-admin-overview-grid"><section className="ws-card ws-admin-health"><div className="ws-settings-heading"><h2>생성 상태</h2><span className="ws-eyebrow">PROCESSING</span></div><p className="ws-muted">진행 중이거나 확인이 필요한 작업을 모았습니다.</p><div className="ws-admin-status-links">{[{label:"생성 중",value:data?.pending,filter:"processing",note:"접수 중 요청 포함"},{label:"접수 확인 필요",value:data?.unknown,filter:"unknown",note:"요청 상태 확인 필요"},{label:"실패 · 환불",value:data?.failed,filter:"failed",note:"실패 처리된 요청"}].map(s=><Link key={s.filter} href={`/admin/activity?filter=${s.filter}`}><span><b>{s.label}</b><small>{s.note}</small></span><strong>{amount(s.value)} <span>↗</span></strong></Link>)}</div><Button href="/admin/activity">모든 생성 내역 보기</Button></section>
    <section className="ws-card ws-admin-credit-summary"><span className="ws-eyebrow">CREDIT BALANCE</span><h2>전체 사용자 잔액</h2><strong className="ws-balance">{amount(data?.balance)} <small>◇</small></strong><dl><div><dt>누적 지급</dt><dd>{amount(data?.granted)}</dd></div><div><dt>누적 생성 예약</dt><dd>{amount(data?.held)}</dd></div><div><dt>누적 환불</dt><dd>{amount(data?.refunded)}</dd></div></dl><Button variant="primary" href="/admin/credits">크레딧 지급 및 내역 ↗</Button></section></div>
    <section className="ws-card"><div className="ws-settings-heading"><h2>최근 생성 요청</h2><Button size="sm" href="/admin/activity">전체 보기 ↗</Button></div>{loading?<p role="status" className="ws-muted">현황을 불러오는 중…</p>:data?.recent.length?<div className="ws-admin-recent">{data.recent.map(j=><Link href={ownerLink("activity",j.user_id)} key={j.id}><div><JobBadge state={j.state}/><b>{j.project_title || LIBRARY_FEATURES[j.feature as keyof typeof LIBRARY_FEATURES] || "스튜디오"}</b><small>{j.username || j.owner_name} · {j.model}</small></div><div><time>{date(j.created_at)}</time><span>{j.cost} 크레딧 ↗</span></div></Link>)}</div>:<p className="ws-muted">아직 생성 요청이 없습니다.</p>}</section>
    <div className="ws-admin-access-note"><StatusBadge tone="success">관리자 IP 보호</StatusBadge><p>허용된 접속 IP <span>{data?.allowedIps.join(" · ") || "확인 중"}</span></p><Button size="sm" href="/admin/settings">API 환경설정</Button></div>
  </main>;
}

export function AdminCollectionPage({section,initialUserId="",initialFilter=""}:{section:keyof AdminRows;initialUserId?:string;initialFilter?:string}){
  const meta=ADMIN_SECTIONS[section];
  const options=section==="users"?{admin:"관리자",member:"일반 사용자"}:section==="projects"?{active:"활성 프로젝트",archived:"삭제 보관"}:{processing:"진행 중 전체",...JOB_STATES};
  const [search,setSearch]=useState(""),[user,setUser]=useState(""),[query,setQuery]=useState({search:"",user:""}),[userId,setUserId]=useState(initialUserId),[filter,setFilter]=useState(Object.hasOwn(options,initialFilter)?initialFilter:""),[feature,setFeature]=useState(""),[page,setPage]=useState(1);
  const [selected,setSelected]=useState<AdminRows[keyof AdminRows]|null>(null);
  const params=new URLSearchParams({...query,userId,filter,feature,page:String(page)});
  const {data,error,loading,refresh}=useReport<AdminList<AdminRows[keyof AdminRows]>>(`${section}?${params}`);
  function reset(){setSearch("");setUser("");setQuery({search:"",user:""});setUserId("");setFilter("");setFeature("");setPage(1);}
  const users=section==="users"?data?.items as AdminUserRow[]:[],projects=section==="projects"?data?.items as AdminProjectRow[]:[],jobs=section==="activity"?data?.items as AdminJobRow[]:[];
  return <main className="ws-page ws-admin-panel"><div className="ws-page-heading"><div><span className="ws-eyebrow">WORKSPACE / {section.toUpperCase()}</span><h1>{meta.title}</h1><p>{meta.description}</p></div><Button onClick={refresh} disabled={loading}>새로고침</Button></div>
    <form className="ws-admin-filters" onSubmit={e=>{e.preventDefault();setQuery({search,user});setPage(1);}}><Field label={section==="users"?"사용자 검색":section==="projects"?"프로젝트 검색":"요청 검색"} htmlFor="admin-search"><Input id="admin-search" value={search} onChange={e=>setSearch(e.target.value)} maxLength={100} placeholder={section==="users"?"아이디 · 이름 · 이메일":section==="projects"?"프로젝트 이름":"모델 · 프롬프트 · 요청 ID"}/></Field>{section!=="users" && <Field label="사용자" htmlFor="admin-owner"><Input id="admin-owner" value={user} onChange={e=>setUser(e.target.value)} maxLength={100} placeholder="아이디 · 이름 · 이메일"/></Field>}
      <Field label={section==="users"?"권한":"상태"} htmlFor="admin-filter"><select id="admin-filter" className="ws-select" value={filter} onChange={e=>{setFilter(e.target.value);setPage(1);}}><option value="">전체</option>{Object.entries(options).map(([value,label])=><option value={value} key={value}>{label}</option>)}</select></Field>{section!=="users" && <Field label="기능" htmlFor="admin-feature"><select id="admin-feature" className="ws-select" value={feature} onChange={e=>{setFeature(e.target.value);setPage(1);}}><option value="">전체 기능</option>{Object.entries(section==="projects"?formats:LIBRARY_FEATURES).filter(([id])=>id!=="files").map(([value,label])=><option value={value} key={value}>{label}</option>)}</select></Field>}
      <div className="ws-settings-actions"><Button type="submit">검색</Button><Button type="button" onClick={reset}>초기화</Button></div>
    </form>
    {userId && <div className="ws-admin-filter-note"><span>선택한 사용자만 표시 중</span><Button size="sm" onClick={()=>{setUserId("");setPage(1);}}>사용자 선택 해제</Button></div>}{error && <Alert>{error}</Alert>}
    <div className="ws-settings-heading ws-admin-result-count" role="status"><span>{loading?"목록을 불러오는 중…":data?`총 ${data.total.toLocaleString()}건`:"목록을 불러오지 못했습니다"}</span><span className="ws-muted">{section==="users"?"관리자 우선 · 가입순":section==="projects"?"최근 수정순":"최신 요청순"}</span></div>
    {!loading && data?.total===0 && <section className="ws-card ws-account-empty"><h2>조건에 맞는 결과가 없습니다</h2><p className="ws-muted">검색어나 필터를 변경해 다시 확인하세요.</p><Button onClick={reset}>전체 보기</Button></section>}
    {!loading && !!data?.total && <section className="ws-card ws-admin-data-card"><div className="ws-table-scroll"><table className="ws-admin-table"><caption className="ws-sr-only">{meta.title} 목록</caption>
      {section==="users" && <><thead><tr><th>사용자</th><th>권한</th><th>잔액</th><th>작업 현황</th><th>관리</th></tr></thead><tbody>{users?.map(u=><tr key={u.id}><td><b>{u.username || u.name}</b><small>{u.name} · {u.email}</small></td><td><StatusBadge tone={u.is_admin?"warning":"neutral"}>{u.is_admin?"관리자":"사용자"}</StatusBadge></td><td>{amount(u.credits)} ◇</td><td><span>프로젝트 {u.projects} · 생성 {u.jobs}</span><small>보관 파일 {u.files}</small></td><td><Button size="sm" onClick={()=>setSelected(u)}>상세 보기</Button></td></tr>)}</tbody></>}
      {section==="projects" && <><thead><tr><th>프로젝트</th><th>사용자</th><th>구성</th><th>수정일</th><th>관리</th></tr></thead><tbody>{projects?.map(p=><tr key={p.id}><td><b className="ws-admin-title">{p.title}</b><small>{formats[p.format] || p.format} · {p.deleted_at?"삭제 보관":"활성"}</small></td><td>{p.username || p.owner_name}</td><td>{p.slots}개 · v{p.version}</td><td>{date(p.updated_at)}</td><td><Button size="sm" onClick={()=>setSelected(p)}>구성 보기</Button></td></tr>)}</tbody></>}
      {section==="activity" && <><thead><tr><th>요청 / 기능</th><th>사용자</th><th>상태</th><th>크레딧</th><th>관리</th></tr></thead><tbody>{jobs?.map(j=><tr key={j.id}><td><b className="ws-admin-title">{j.project_title || LIBRARY_FEATURES[j.feature as keyof typeof LIBRARY_FEATURES]}</b><small>{j.model} · {date(j.created_at)}</small></td><td>{j.username || j.owner_name}</td><td><JobBadge state={j.state}/></td><td>{j.cost}</td><td><Button size="sm" onClick={()=>setSelected(j)}>요청 상세</Button></td></tr>)}</tbody></>}
    </table></div></section>}
    {!loading && data && data.total>0 && <div className="ws-library-pagination"><Button disabled={data.page<=1} onClick={()=>setPage(data.page-1)}>이전</Button><span>{data.page} / {data.pages}</span><Button disabled={data.page>=data.pages} onClick={()=>setPage(data.page+1)}>다음</Button></div>}
    {section==="activity" && <p className="ws-muted ws-admin-footnote">서버에 기록된 상태를 표시합니다. 접수 확인이 필요한 요청은 요청 ID로 확인하며 자동으로 재생성하지 않습니다.</p>}
    <Dialog open={!!selected} title={section==="users"?"사용자 상세":section==="projects"?"프로젝트 구성":"생성 요청 상세"} closeLabel="닫기" onClose={()=>setSelected(null)}>{selected && <AdminDetail section={section} row={selected}/>}</Dialog>
  </main>;
}
function AdminDetail({section,row}:{section:keyof AdminRows;row:AdminRows[keyof AdminRows]}){
  if(section==="users"){
    const u=row as AdminUserRow;
    return <div className="ws-admin-detail"><StatusBadge tone={u.is_admin?"warning":"neutral"}>{u.is_admin?"관리자":"사용자"}</StatusBadge><h2>{u.name}</h2><dl className="ws-account-facts"><div><dt>아이디</dt><dd>{u.username || "이메일 로그인"}</dd></div><div><dt>이메일</dt><dd>{u.email}</dd></div><div><dt>가입일</dt><dd>{date(u.created_at)}</dd></div><div><dt>크레딧 잔액</dt><dd>{amount(u.credits)} ◇</dd></div></dl><p className="ws-muted">활성 프로젝트 {u.projects} · 생성 요청 {u.jobs} · 보관 파일 {u.files}</p><OwnerActions id={u.id}/></div>;
  }
  if(section==="projects"){
    const p=row as AdminProjectRow;
    return <div className="ws-admin-detail"><StatusBadge>{formats[p.format]} · {p.deleted_at?"삭제 보관":"활성 프로젝트"}</StatusBadge><h2>{p.title}</h2><p className="ws-muted">{p.username || p.owner_name} · 수정 {date(p.updated_at)} · v{p.version}</p><p>{p.document.brief.topic}</p><dl className="ws-account-facts"><div><dt>타깃</dt><dd>{p.document.brief.audience || "미지정"}</dd></div><div><dt>톤</dt><dd>{tones[p.document.brief.tone] || p.document.brief.tone || "미지정"}</dd></div><div><dt>브랜드</dt><dd>{p.document.brand || "미지정"}</dd></div></dl><h3>콘텐츠 구성 · {p.slots}개</h3><ol className="ws-admin-slot-list">{p.document.slots.map((slot,index)=><li key={slot.id}><span>{String(index+1).padStart(2,"0")}</span><div><strong>{slot.title || "제목 없음"}</strong><p>{slot.body || "본문 없음"}</p><small>{slot.media?"미디어 연결됨":"미디어 미연결"}{p.format==="reels"?` · ${slot.duration}초`:""}</small></div></li>)}</ol><OwnerActions id={p.owner_id}/></div>;
  }
  const j=row as AdminJobRow;
  return <div className="ws-admin-detail"><JobBadge state={j.state}/><h2>{j.project_title || "스튜디오 생성 요청"}</h2><dl className="ws-account-facts"><div><dt>사용자</dt><dd>{j.username || j.owner_name}</dd></div><div><dt>기능</dt><dd>{LIBRARY_FEATURES[j.feature as keyof typeof LIBRARY_FEATURES]}</dd></div><div><dt>모델</dt><dd>{j.model}</dd></div><div><dt>크레딧</dt><dd>{j.cost}</dd></div><div><dt>요청일</dt><dd>{date(j.created_at)}</dd></div></dl><Field label="공급자 요청 ID" htmlFor="request-id"><Input id="request-id" readOnly value={j.request_id || "아직 발급되지 않음"}/></Field><Field label="내부 요청 ID" htmlFor="job-id"><Input id="job-id" readOnly value={j.id}/></Field><h3>프롬프트</h3><p className="ws-library-prompt">{j.prompt || "입력된 프롬프트가 없습니다."}</p>{j.state==="unknown" && <Alert>접수 여부를 확인해야 합니다. 중복 생성을 방지하기 위해 자동 재시도하지 않습니다.</Alert>}<OwnerActions id={j.user_id}/></div>;
}
