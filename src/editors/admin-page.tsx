"use client";
import { useEffect, useRef, useState, type FormEvent } from "react";
import { Alert, Button, Field, Input, StatusBadge } from "@openhiggsfield/design";
import { DEFAULT_CREDITS } from "@/projects/credit-policy";
import { api } from "@/projects/api";
import { useSession } from "@/shell/workspace-shell";
type AdminUser = {id:string;username:string|null;email:string;name:string;credits:number;is_admin:boolean};
type Entry = {id:string;user_id:string;username:string|null;email:string;amount:number;kind:string;description:string;created_at:number;actor_username:string|null;actor_email:string|null};
type Overview = {users:AdminUser[];entries:Entry[];hasNext:boolean;summary:{users:number;balance:string;granted:string;reserved:string;refunded:string};allowedIps:string[]};
const labels: Record<string,string> = {signup:"가입 초기 지급",adjustment:"잔액 조정",grant:"관리자 지급",demo:"데모 초기 지급",hold:"생성 예약",confirm:"생성 완료",refund:"실패 환불"};
export function AdminPage({initialUserId=""}:{initialUserId?:string}) {
  const session=useSession();
  const [kind,setKind]=useState("");
  const [data,setData]=useState<Overview|null>(null),[search,setSearch]=useState(""),[query,setQuery]=useState("");
  const [filter,setFilter]=useState(initialUserId),[page,setPage]=useState(1),[target,setTarget]=useState(initialUserId),[amount,setAmount]=useState(String(DEFAULT_CREDITS)),[reason,setReason]=useState("");
  const [error,setError]=useState(""),[notice,setNotice]=useState(""),[busy,setBusy]=useState(false),[revision,setRevision]=useState(0),[loading,setLoading]=useState(true);
  const requestKey=useRef("");
  useEffect(()=>{
    let active=true;setLoading(true);setError("");
    void api<Overview>(`admin/overview?${new URLSearchParams({search:query,userId:filter,kind,page:String(page)})}`).then(result=>{if(active)setData(result);}).catch(e=>{if(active)setError(e.message);}).finally(()=>{if(active)setLoading(false);});
    return ()=>{active=false;};
  },[query,filter,kind,page,revision]);
  async function grant(event:FormEvent) {
    event.preventDefault();setBusy(true);setError("");setNotice("");requestKey.current ||= crypto.randomUUID();
    try {
      const result=await api<{duplicate:boolean}>("admin/grants",{method:"POST",body:JSON.stringify({userId:target,amount:Number(amount),reason,key:requestKey.current})});
      setNotice(result.duplicate ? "이미 처리된 지급 요청입니다. 중복 지급하지 않았습니다." : `${Number(amount).toLocaleString()}크레딧을 지급했습니다.`);
      requestKey.current="";setReason("");setRevision(n=>n+1);void session.refresh();
    } catch(e) {setError((e as Error).message);} finally {setBusy(false);}
  }
  return <main className="ws-page">
    <div className="ws-page-heading"><div><span className="ws-eyebrow">WORKSPACE ADMIN</span><h1>크레딧 관리</h1><p>잔액과 사용 흐름을 확인하고 필요한 크레딧을 지급하세요.</p></div><div className="ws-settings-actions"><Button href="/admin/results" variant="primary">전체 생성 결과</Button><Button href="/admin/users">사용자 관리</Button></div></div>
    {error && <Alert>{error}</Alert>}{notice && <p role="status">{notice}</p>}
    <div className="ws-admin-stats">{[["사용자",data?.summary.users],["전체 잔액",data?.summary.balance],["누적 지급",data?.summary.granted],["생성 예약",data?.summary.reserved],["환불",data?.summary.refunded]].map(([label,value])=><section className="ws-card" key={String(label)}><span className="ws-muted">{label}</span><strong>{value === undefined ? "—" : Number(value).toLocaleString()}</strong></section>)}</div>
    <div className="ws-settings-grid ws-admin-grant-grid">
      <section className="ws-card ws-form"><h2>지급 대상 찾기</h2><form className="ws-settings-actions" onSubmit={e=>{e.preventDefault();setQuery(search);setTarget("");requestKey.current="";}}><Input aria-label="사용자 검색" value={search} onChange={e=>setSearch(e.target.value)} placeholder="아이디, 이름 또는 이메일"/><Button type="submit" disabled={loading}>검색</Button></form>
        <div className="ws-table-scroll"><table className="ws-admin-table"><thead><tr><th>사용자</th><th>권한</th><th>잔액</th><th>관리</th></tr></thead><tbody>{data?.users.map(u=><tr key={u.id}><td><b>{u.username || u.name}</b><small>{u.email}</small></td><td><StatusBadge tone={u.is_admin?"warning":"neutral"}>{u.is_admin?"관리자":"사용자"}</StatusBadge></td><td>{u.credits.toLocaleString()}</td><td><Button size="sm" disabled={busy} onClick={()=>{setTarget(u.id);requestKey.current="";setFilter(u.id);setPage(1);}}>선택</Button> <Button size="sm" href={`/admin/results?userId=${encodeURIComponent(u.id)}`}>결과 보기</Button></td></tr>)}</tbody></table></div>
        {!loading && !data?.users.length && <p>검색 결과가 없습니다.</p>}<p className="ws-muted">검색 결과는 최대 100명까지 표시합니다.</p>
      </section>
      <form className="ws-card ws-form" onSubmit={grant}><h2>크레딧 지급</h2>
        <Field label="지급 대상" htmlFor="grant-target"><select id="grant-target" className="ws-select" value={target} disabled={busy} onChange={e=>{setTarget(e.target.value);setFilter(e.target.value);setPage(1);requestKey.current="";}} required><option value="">사용자를 선택하세요</option>{data?.users.map(u=><option key={u.id} value={u.id}>{u.username || u.name} · {u.credits} 크레딧</option>)}</select></Field>
        <Field label="지급 크레딧" htmlFor="admin-amount"><Input id="admin-amount" type="number" min={1} max={1000000} step={1} required value={amount} disabled={busy} onChange={e=>{setAmount(e.target.value);requestKey.current="";}}/></Field>
        <Field label="지급 사유" htmlFor="admin-reason"><Input id="admin-reason" maxLength={200} required value={reason} disabled={busy} onChange={e=>{setReason(e.target.value);requestKey.current="";}} placeholder="예: 콘텐츠 제작 테스트 지원"/></Field>
        <Button variant="primary" type="submit" loading={busy} disabled={busy || loading || !target || !reason.trim()}>크레딧 지급</Button><p className="ws-muted">지급 대상, 금액, 사유와 처리한 관리자를 이력에 기록합니다.</p>
      </form>
    </div>
    <section className="ws-card ws-admin-ledger"><div className="ws-settings-heading"><h2>크레딧 사용·지급 내역</h2><Button size="sm" onClick={()=>{setFilter("");setPage(1);}}>전체 사용자</Button></div><p className="ws-muted">{filter ? (data?.users.find(u=>u.id===filter)?.username || data?.users.find(u=>u.id===filter)?.name || "선택한 사용자") : "전체 사용자"} · 최신순 · {page} 페이지</p><Field label="내역 유형" htmlFor="ledger-kind"><select id="ledger-kind" className="ws-select" value={kind} onChange={e=>{setKind(e.target.value);setPage(1);}}><option value="">전체 유형</option>{Object.entries(labels).map(([value,label])=><option key={value} value={value}>{label}</option>)}</select></Field>
      <div className="ws-table-scroll"><table className="ws-admin-table"><thead><tr><th>일시</th><th>사용자</th><th>유형</th><th>증감</th><th>사유</th><th>처리자</th></tr></thead><tbody>{data?.entries.map(e=><tr key={e.id}><td>{new Date(Number(e.created_at)).toLocaleString("ko-KR")}</td><td>{e.username || e.email}</td><td>{labels[e.kind] || e.kind}</td><td>{e.amount>0?"+":""}{e.amount.toLocaleString()}</td><td>{e.description}</td><td>{e.actor_username || e.actor_email || "시스템"}</td></tr>)}</tbody></table></div>{!loading && !data?.entries.length && <p>기록된 내역이 없습니다.</p>}
      <div className="ws-settings-actions"><Button disabled={loading || page===1} onClick={()=>setPage(n=>n-1)}>이전</Button><Button disabled={loading || !data?.hasNext} onClick={()=>setPage(n=>n+1)}>다음</Button></div>
    </section>
    <p className="ws-muted">관리자 접속 허용 IP: {data?.allowedIps.join(", ") || "확인 중"}</p>
  </main>;
}
