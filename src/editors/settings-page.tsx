"use client";
import { useEffect, useState, type FormEvent } from "react";
import { Alert, Button, Field, Input, StatusBadge } from "@openhiggsfield/design";
import { api } from "@/projects/api";
import { OpenAiSettings } from "./openai-settings";

type Settings = { configured: boolean; source: "managed" | "operator" | "none"; updatedAt: number | null };
type Check = { state: string; message: string };
export function SettingsPage() {
  const [settings,setSettings] = useState<Settings | null>(null);
  const [key,setKey] = useState("");
  const [busy,setBusy] = useState("");
  const [error,setError] = useState("");
  const [notice,setNotice] = useState("");
  const [check,setCheck] = useState<Check | null>(null);
  useEffect(()=>{ void api<Settings>("settings/higgsfield").then(setSettings).catch(e=>setError(e.message)); },[]);
  async function save(event: FormEvent) {
    event.preventDefault(); setBusy("save"); setError(""); setNotice(""); setCheck(null);
    try {
      const result = await api<Settings>("settings/higgsfield",{method:"PUT",body:JSON.stringify({apiKey:key})});
      setSettings(result); setKey(""); setNotice("API 키를 저장했습니다. 연결 점검으로 응답을 확인해 주세요.");
    } catch(e) { setError((e as Error).message); } finally { setBusy(""); }
  }
  async function inspect() {
    setBusy("check"); setError(""); setNotice(""); setCheck(null);
    try { setCheck(await api<Check>("settings/higgsfield/check",{method:"POST"})); }
    catch(e) { setError((e as Error).message); } finally { setBusy(""); }
  }
  async function remove() {
    setBusy("remove"); setError(""); setNotice(""); setCheck(null);
    try {
      setSettings(await api<Settings>("settings/higgsfield",{method:"DELETE"})); setKey(""); setNotice("등록한 키를 삭제했습니다.");
    } catch(e) { setError((e as Error).message); } finally { setBusy(""); }
  }
  return <main className="ws-page">
    <div className="ws-page-heading"><div><span className="ws-eyebrow">WORKSPACE SETTINGS</span><h1>환경설정</h1><p>생성 서비스를 연결하고 제작 환경을 준비하세요.</p></div><Button href="/admin/credits">크레딧 관리</Button></div>
    <div className="ws-settings-grid">
      <OpenAiSettings />
      <section className="ws-card ws-form">
        <div className="ws-settings-heading"><h2>Higgsfield API</h2><StatusBadge tone={settings?.source !== "none" && settings ? "success" : "neutral"}>{!settings ? "불러오는 중" : settings.source === "managed" ? "공용 키 등록됨" : settings.source === "operator" ? "공용 키 사용 중" : "미등록"}</StatusBadge></div>
        <p className="ws-muted">관리자가 등록한 키는 모든 사용자의 이미지·영상 생성에 사용합니다. 서버에 암호화해 보관하며, 저장 후 키 값은 다시 표시하지 않습니다.</p>
        <form className="ws-form" onSubmit={save}>
          <Field label="API 키" htmlFor="higgsfield-key" hint="API Key ID와 Secret을 콜론(:)으로 연결해 입력하세요.">
            <Input id="higgsfield-key" type="password" value={key} onChange={e=>setKey(e.target.value)} placeholder="key_id:secret" autoComplete="off" spellCheck={false} maxLength={2048} required disabled={!!busy}/>
          </Field>
          <div className="ws-settings-actions"><Button variant="primary" type="submit" loading={busy === "save"} disabled={!!busy || !key.trim() || !settings}>{settings?.configured ? "키 교체" : "키 저장"}</Button><Button type="button" onClick={inspect} loading={busy === "check"} disabled={!!busy || !settings || settings.source === "none"}>연결 점검</Button>{settings?.configured && <Button type="button" variant="danger" onClick={remove} disabled={!!busy}>등록 키 삭제</Button>}</div>
        </form>
        {settings?.updatedAt && <p className="ws-muted">최근 저장 · {new Date(settings.updatedAt).toLocaleString("ko-KR")}</p>}
        {error && <Alert>{error}</Alert>}{notice && <p role="status">{notice}</p>}
        {check && <div role="status" className="ws-settings-result"><StatusBadge tone={check.state === "verified" ? "success" : check.state === "error" ? "danger" : "warning"}>{check.state === "verified" ? "인증 확인" : check.state === "error" ? "점검 필요" : "서버 응답 확인"}</StatusBadge><p>{check.message}</p></div>}
        <p className="ws-muted">연결 점검은 상태 조회만 수행하며 생성을 시작하지 않습니다. 키를 교체·삭제해도 이미 접수한 요청은 기존 키로 상태 조회를 마칩니다.</p>
        <a className="ws-settings-docs" href="https://cloud.higgsfield.ai/" target="_blank" rel="noreferrer">Higgsfield에서 API 키 발급 ↗</a>
      </section>
      <aside className="ws-card ws-form"><span className="ws-eyebrow">READY TO CREATE</span><h2>기능별 확인</h2><p className="ws-muted">키 저장 후 아래 기능에서 생성 결과를 확인하세요. 생성 시 앱 크레딧과 해당 Higgsfield API 계정의 잔액이 사용됩니다.</p>
        <Button href="/">스튜디오 · 이미지 / 영상</Button><Button href="/projects/new?format=card-news">카드뉴스 · 슬라이드 이미지</Button><Button href="/projects/new?format=reels">숏폼 · 릴스 영상</Button><Button href="/projects/new?format=landing">랜딩 페이지 · 섹션 이미지</Button><Button href="/projects/new?format=product-detail">제품 상세 · 상품 이미지</Button>
        <p className="ws-muted">업로드·편집·내보내기는 API 키 없이 사용할 수 있습니다. 카드뉴스 자동 작성에는 OpenAI 연결이 필요합니다.</p>
      </aside>
    </div>
  </main>;
}
