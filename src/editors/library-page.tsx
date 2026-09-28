"use client";
import { useEffect, useRef, useState, type FormEvent } from "react";
import { Alert, Button, Dialog, Field, Input, StatusBadge } from "@openhiggsfield/design";
import { api } from "@/projects/api";
import { LIBRARY_FEATURES, type LibraryItem, type LibraryResult } from "@/projects/library";
import { useSession } from "@/shell/workspace-shell";
const KINDS = {image:"이미지",video:"영상",audio:"오디오",file:"파일"};
function Preview({item,detail=false}:{item:LibraryItem;detail?:boolean}) {
  const [failed,setFailed]=useState(false);
  if(failed) return <div className="ws-library-fallback"><span>↗</span><p>미리보기를 불러오지 못했습니다.<br/>원본 링크를 확인해 주세요.</p></div>;
  if(item.kind==="image") return <img src={item.url} alt={item.name} loading="lazy" onError={()=>setFailed(true)}/>;
  if(item.kind==="video") return <video src={item.url} controls={detail} muted={!detail} playsInline preload="metadata" onError={()=>setFailed(true)}/>;
  if(item.kind==="audio" && detail) return <audio src={item.url} controls preload="metadata" onError={()=>setFailed(true)}/>;
  return <div className="ws-library-fallback"><span>{item.kind==="audio"?"♫":"↓"}</span><p>{item.kind==="audio"?"오디오 파일":"다운로드 파일"}</p></div>;
}
export function LibraryPage({admin=false,initialUserId=""}:{admin?:boolean;initialUserId?:string}) {
  const session=useSession();
  const [feature,setFeature]=useState(""),[kind,setKind]=useState(""),[search,setSearch]=useState(""),[user,setUser]=useState(""),[owner,setOwner]=useState(initialUserId);
  const [query,setQuery]=useState({search:"",user:""}),[page,setPage]=useState(1),[revision,setRevision]=useState(0);
  const [data,setData]=useState<LibraryResult|null>(null),[loading,setLoading]=useState(true),[error,setError]=useState(""),[selected,setSelected]=useState<LibraryItem|null>(null);
  const [upload,setUpload]=useState<File|null>(null),[uploading,setUploading]=useState(false),[notice,setNotice]=useState("");
  const fileInput=useRef<HTMLInputElement>(null);
  const [uploadOpen,setUploadOpen]=useState(false);
  const [filtersOpen,setFiltersOpen]=useState(false);
  useEffect(()=>{
    const controller=new AbortController();setLoading(true);setError("");
    const params=new URLSearchParams({feature,kind,...query,userId:owner,page:String(page)});
    void api<LibraryResult>(`${admin?"admin/":""}library?${params}`,{signal:controller.signal})
      .then(result=>{if(!controller.signal.aborted)setData(result);})
      .catch(e=>{if(!controller.signal.aborted){setData(null);setError(e.message);}})
      .finally(()=>{if(!controller.signal.aborted)setLoading(false);});
    return ()=>controller.abort();
  },[admin,feature,kind,query,owner,page,revision]);
  function reset(){setFeature("");setKind("");setSearch("");setUser("");setOwner("");setQuery({search:"",user:""});setPage(1);}
  async function uploadFile(event:FormEvent){
    event.preventDefault();if(!upload || uploading)return;setError("");setNotice("");
    if(upload.size>50*1024*1024){setError("50MB 이내 파일을 선택해 주세요.");return;}
    setUploading(true);
    try{const body=new FormData();body.set("file",upload);await api("assets",{method:"POST",body});setNotice(`${upload.name} 파일을 라이브러리에 추가했습니다.`);setUpload(null);setUploadOpen(false);if(fileInput.current)fileInput.current.value="";reset();setFeature("files");setRevision(n=>n+1);}
    catch(e){setError((e as Error).message);}finally{setUploading(false);}
  }
  return <main className="ws-page">
    <div className="ws-page-heading"><div><span className="ws-eyebrow">{admin?"WORKSPACE / RESULTS":"MY PAGE / LIBRARY"}</span><h1>{admin?"전체 에셋":"내 라이브러리"}</h1><p>{admin?"사용자와 기능별로 완성된 결과물을 확인하세요.":"생성한 이미지와 영상, 직접 올린 파일을 한곳에서."}</p></div><div className="ws-settings-actions"><Button onClick={()=>setRevision(n=>n+1)} disabled={loading}>새로고침</Button>{!admin && <Button variant="primary" onClick={()=>setUploadOpen(true)}>＋ 파일 업로드</Button>}</div></div>
    {!admin && <Dialog open={uploadOpen} title="라이브러리에 파일 추가" closeLabel="닫기" onClose={()=>{if(!uploading)setUploadOpen(false);}}><form className="ws-form ws-library-upload" onSubmit={uploadFile}><div><p className="ws-muted">이미지·MP4/WebM·오디오 · 파일당 50MB, 계정당 500MB</p></div><div className="ws-library-upload-controls"><label htmlFor="library-upload" className="ws-muted">업로드할 파일</label><input ref={fileInput} id="library-upload" type="file" accept="image/jpeg,image/png,image/webp,image/gif,video/mp4,video/webm,audio/mpeg,audio/mp4,audio/wav,audio/x-wav,audio/ogg" disabled={uploading} onChange={e=>{setUpload(e.target.files?.[0] || null);setNotice("");}}/><Button type="submit" variant="primary" disabled={!upload || uploading} loading={uploading}>파일 업로드</Button></div>{error && <Alert>{error}</Alert>}</form></Dialog>}
    {<div className="ws-library-filter-toggle"><Button aria-expanded={filtersOpen} aria-controls="library-filters" onClick={()=>setFiltersOpen(v=>!v)}>필터 및 검색{feature || kind || query.search ? " · 적용 중" : ""} {filtersOpen ? "−" : "+"}</Button></div>}
    <form id="library-filters" data-open={filtersOpen} className="ws-library-filters" onSubmit={e=>{e.preventDefault();setPage(1);setQuery({search,user});}}>
      {admin && <Field label="사용자 검색" htmlFor="library-user"><Input id="library-user" placeholder="아이디 · 이름 · 이메일" value={user} onChange={e=>setUser(e.target.value)} maxLength={100}/></Field>}
      <Field label="기능" htmlFor="library-feature"><select id="library-feature" className="ws-select" value={feature} onChange={e=>{setFeature(e.target.value);setPage(1);}}><option value="">전체 기능</option>{Object.entries(LIBRARY_FEATURES).map(([value,label])=><option key={value} value={value}>{label}</option>)}</select></Field>
      <Field label="파일 형식" htmlFor="library-kind"><select id="library-kind" className="ws-select" value={kind} onChange={e=>{setKind(e.target.value);setPage(1);}}><option value="">전체 형식</option>{Object.entries(KINDS).map(([value,label])=><option key={value} value={value}>{label}</option>)}</select></Field>
      <Field label="결과 검색" htmlFor="library-search"><Input id="library-search" placeholder="프로젝트 · 파일명 · 프롬프트" value={search} onChange={e=>setSearch(e.target.value)} maxLength={100}/></Field>
      <div className="ws-settings-actions"><Button type="submit">검색</Button><Button type="button" onClick={reset}>초기화</Button></div>
    </form>
    {owner && <p className="ws-muted">관리자 목록에서 선택한 사용자의 결과만 표시합니다. <Button size="sm" onClick={()=>{setOwner("");setPage(1);}}>사용자 선택 해제</Button></p>}
    {error && <Alert>{error}</Alert>}{notice && <p role="status">{notice}</p>}
    <div className="ws-library-count" role="status">{loading?"라이브러리를 불러오는 중…":`${(data?.total || 0).toLocaleString()}개 결과 · 최신순`}</div>
    <p className="ws-muted">완료된 생성 결과와 보관 파일을 표시합니다. 보관 파일에는 업로드·내보내기·생성 결과의 저장 사본이 포함됩니다.</p>
    {!loading && data?.items.length===0 && <section className="ws-card ws-library-empty"><h2>표시할 결과가 없습니다</h2><p>필터를 변경하거나{admin?" 사용자의 생성 완료 후 다시 확인하세요.":" 파일을 업로드해 라이브러리를 채워 보세요."}</p><Button onClick={reset}>전체 보기</Button></section>}
    <div className="ws-library-grid" aria-busy={loading}>{!loading && data?.items.map(item=><article className="ws-library-card" key={item.id}>
      <button className="ws-library-cover" onClick={()=>setSelected(item)} aria-label={`${item.name} 상세 보기`}><Preview item={item}/><span className="ws-library-kind">{KINDS[item.kind]}</span></button>
      <div className="ws-library-info"><span className="ws-eyebrow">{LIBRARY_FEATURES[item.feature]}</span><h2>{item.name}</h2>{admin && <p className="ws-library-owner">{item.username || item.ownerName}</p>}<p className="ws-library-description">{item.prompt || "라이브러리에 보관한 파일"}</p><time>{new Date(item.createdAt).toLocaleString("ko-KR")}</time></div>
    </article>)}</div>
    {!loading && data && data.total>0 && <div className="ws-library-pagination"><Button disabled={data.page<=1} onClick={()=>setPage(data.page-1)}>이전</Button><span>{data.page} / {data.pages}</span><Button disabled={data.page>=data.pages} onClick={()=>setPage(data.page+1)}>다음</Button></div>}
    <Dialog open={!!selected} title="에셋 상세" closeLabel="닫기" onClose={()=>setSelected(null)}>{selected && <div className="ws-library-detail"><div className="ws-library-detail-media"><Preview key={selected.id} item={selected} detail/></div><StatusBadge>{LIBRARY_FEATURES[selected.feature]} · {KINDS[selected.kind]}</StatusBadge><h2>{selected.name}</h2>{admin && <p>사용자 · {selected.username || selected.ownerName}</p>}{selected.model && <p className="ws-muted">모델 · {selected.model}</p>}{selected.prompt && <p className="ws-library-prompt">{selected.prompt}</p>}<time className="ws-muted">{new Date(selected.createdAt).toLocaleString("ko-KR")}</time><div className="ws-settings-actions"><a className="ws-library-original" href={selected.url} target="_blank" rel="noreferrer">원본 열기 / 저장 ↗</a>{selected.projectId && !selected.projectDeleted && selected.ownerId===session.user?.id && <Button href={`/projects/${selected.projectId}`} size="sm">프로젝트 열기</Button>}</div><p className="ws-muted">공급자 원본 링크는 보관 기간이 지나면 만료될 수 있습니다.</p></div>}</Dialog>
  </main>;
}
