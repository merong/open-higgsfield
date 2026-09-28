"use client";
import { isPageFormat, emptyProduct } from "@/projects/product-detail";
import { ProductInfoFields } from "./product-info-fields";
import { useEffect, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import {
  Alert,
  Button,
  Field,
  Input,
  Textarea,
  Segment,
} from "@openhiggsfield/design";
import { api } from "@/projects/api";
import { PRESETS, formatFor } from "@/projects/formats";
import { FormatSelector } from "./format-selector";
import { CardTemplateGallery } from "./card-template-gallery";
import { CardWorkflowCreator } from "./card-workflow-creator";
import { ReelWorkflowCreator } from "./reel-workflow-creator";
import { LandingWorkflowCreator } from "./landing-workflow-creator";
import { createDraft } from "@/projects/outline";
import type { FormatId, Preset, Project, Ratio } from "@/projects/types";
export function NewProject({ initialFormat, initialStart = "ai" }: { initialFormat: FormatId; initialStart?: string }) {
  const [format, setFormat] = useState(initialFormat),
    [preset, setPreset] = useState<Preset>("editorial"),
    [ratio, setRatio] = useState<Ratio>(formatFor(initialFormat).ratios[0]),
    [count, setCount] = useState(formatFor(initialFormat).defaultCount),
    [error, setError] = useState(""),
    [busy, setBusy] = useState(false);
  const [product, setProduct] = useState(emptyProduct);
  const router = useRouter(),
    entry = formatFor(format);
  const [startMode, setStartMode] = useState(initialStart === "templates" && initialFormat !== "card-news" ? "ai" : initialStart), [quickBusy,setQuickBusy] = useState(false), [hasWorkflow,setHasWorkflow] = useState(false);
  const [useAI, setUseAI] = useState(false),
    [aiReady, setAiReady] = useState(false);
  useEffect(() => {
    api<{ outlineReady: boolean }>("session")
      .then((r) => setAiReady(r.outlineReady))
      .catch(() => {});
  }, []);
  function selectStartMode(value: string) {
    if (quickBusy || busy) return;
    const url = new URL(window.location.href);
    url.searchParams.set("start", value);
    window.history.replaceState(null, "", url);
    setStartMode(value);
  }
  function selectFormat(next: FormatId) {
    if (next === format || quickBusy || busy) return;
    const nextMode = startMode === "templates" && next !== "card-news" ? "ai" : startMode;
    const url = new URL(window.location.href);
    url.searchParams.set("format", next);
    url.searchParams.set("start", nextMode);
    for (const key of ["workflow", "landingWorkflow", "reelWorkflow"]) url.searchParams.delete(key);
    window.history.replaceState(null, "", url);
    setHasWorkflow(false);
    setError("");
    setStartMode(nextMode);
    setFormat(next);
    setRatio(formatFor(next).ratios[0]);
    setCount(formatFor(next).defaultCount);
  }
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setError("");
    const form = new FormData(event.currentTarget);
    try {
      const draft = createDraft(
        format,
        {
          topic: format === "product-detail" ? product.name : String(form.get("topic") || ""),
          audience: String(form.get("audience") || ""),
          tone: String(form.get("tone")),
          count,
          mustInclude: format === "product-detail" ? [form.get("topic"), form.get("mustInclude")].filter(Boolean).join("\n").slice(0,3000) : String(form.get("mustInclude") || ""),
        },
        preset,
        ratio,
      );
      if (format === "product-detail") draft.product = product;
      const p = useAI && format !== "product-detail"
        ? await api<{ id: string }>("outline", {
            method: "POST",
            body: JSON.stringify({ draft, key: crypto.randomUUID() }),
          })
        : await api<Project>("projects", {
            method: "POST",
            body: JSON.stringify(draft),
          });
      router.push(`/projects/${p.id}`);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <main className={`ws-page ws-new${hasWorkflow && startMode === "ai" ? " ws-new--workflow" : ""}`}>
      <a className="ws-back" href="/projects">
        ← 프로젝트
      </a>
      <div className="ws-page-heading">
        <div>
          <span className="ws-eyebrow">START A NEW STORY</span>
          <h1>무엇을 만들어 볼까요?</h1>
          <p>
            {format === "card-news" ? "주제나 메모만으로 시작하세요. AI와 방향을 정하고, 카드를 보며 함께 완성해요." : format === "reels" ? "AI와 대본을 정하고, 짧은 샘플을 확인하며 함께 영상을 완성해요." : format === "product-detail" ? "상품 자료에서 구매할 이유까지. AI와 상세 페이지를 함께 만들어요." : "방문자의 첫 질문부터 다음 행동까지. AI와 페이지의 흐름을 만들어요."}
          </p>
        </div>
      </div>
      <div>
        <FormatSelector value={format} onChange={selectFormat} disabled={quickBusy || busy}
          hint={quickBusy || busy ? "진행 중인 작업을 완료하거나 중단한 뒤 다른 제작 기능을 선택할 수 있어요." : undefined} />
        {format === "card-news" && <div className="ws-template-mode"><Segment aria-label="카드뉴스 시작 방법" value={startMode} onChange={selectStartMode} items={[{id:"ai",label:"AI와 함께 제작"},{id:"templates",label:"템플릿으로 시작"},{id:"custom",label:"직접 구성하기"}]} plate /></div>}
        {format === "card-news" && <div hidden={startMode !== "ai"}><CardWorkflowCreator onWorkspaceChange={setHasWorkflow} onBusyChange={setQuickBusy} active={startMode === "ai"}/></div>}
        {format === "reels" && <div className="ws-template-mode"><Segment aria-label="숏폼 시작 방법" value={startMode === "ai" ? "ai" : "custom"} onChange={selectStartMode} items={[{ id: "ai", label: "AI와 함께 제작" }, { id: "custom", label: "직접 구성하기" }]} plate /></div>}
        {format === "reels" && <div hidden={startMode !== "ai"}><ReelWorkflowCreator onWorkspaceChange={setHasWorkflow} onBusyChange={setQuickBusy} active={startMode === "ai"} /></div>}
        {isPageFormat(format) && <div className="ws-template-mode"><Segment aria-label={`${entry.label} 시작 방법`} value={startMode === "ai" ? "ai" : "custom"} onChange={selectStartMode} items={[{ id: "ai", label: "AI와 함께 제작" }, { id: "custom", label: "직접 구성하기" }]} plate /></div>}
        {isPageFormat(format) && <div hidden={startMode !== "ai"}><LandingWorkflowCreator key={format} format={format as "landing" | "product-detail"} onWorkspaceChange={setHasWorkflow} onBusyChange={setQuickBusy} active={startMode === "ai"} /></div>}
        {startMode === "ai" ? null : format === "card-news" && startMode === "templates" ? <CardTemplateGallery /> : <form onSubmit={submit} className="ws-new-grid">
          <div className="ws-card ws-form">
            {format === "product-detail" && <ProductInfoFields value={product} onChange={setProduct} />}
            <Field
              label={format === "product-detail" ? "상품의 특징과 제작 방향" : "주제 또는 프로젝트 이름"}
              htmlFor="topic"
              required={format === "product-detail" ? undefined : "필수"}
            >
              <Input
                id="topic"
                name="topic"
                placeholder="예: 여름 피부를 위한 일상 루틴"
                required={format !== "product-detail"}
                maxLength={90}
              />
            </Field>
            <Field label="누구에게 전하나요?" htmlFor="audience">
              <Input
                id="audience"
                name="audience"
                placeholder="예: 가벼운 스킨케어를 찾는 20–30대"
                maxLength={100}
              />
            </Field>
            <Field
              label="꼭 넣을 내용"
              htmlFor="mustInclude"
              hint="줄마다 한 가지씩 적으면 구성안에 반영합니다."
            >
              <Textarea
                id="mustInclude"
                name="mustInclude"
                rows={5}
                maxLength={3000}
                placeholder="제품의 특징, 사용 방법, 브랜드의 이야기…"
              />
            </Field>
          </div>
          <div className="ws-card ws-form">
            <Field label="문장의 톤" htmlFor="tone">
              <select id="tone" name="tone" defaultValue="calm">
                <option value="calm">차분하게</option>
                <option value="friendly">친근하게</option>
                <option value="expert">전문적으로</option>
                <option value="witty">재치 있게</option>
              </select>
            </Field>
            <Field label={`${entry.noun} 수`} htmlFor="count">
              <Input
                id="count"
                type="number"
                min={2}
                max={entry.max}
                value={count}
                onChange={(e) => setCount(Number(e.target.value))}
              />
            </Field>
            {!isPageFormat(format) && (
              <Field label="출력 비율">
                <Segment
                  aria-label="출력 비율"
                  value={ratio}
                  onChange={(v) => setRatio(v as Ratio)}
                  items={entry.ratios.map((r) => ({ id: r, label: r }))}
                  plate
                />
              </Field>
            )}
            <Field label="스타일">
              <Segment
                aria-label="프로젝트 스타일"
                value={preset}
                onChange={(v) => setPreset(v as Preset)}
                items={PRESETS.map((p) => ({ ...p }))}
                plate
              />
            </Field>
            {format !== "product-detail" && <label className="ws-ai-choice">
              <input
                type="checkbox"
                checked={useAI}
                disabled={!aiReady || busy}
                onChange={(e) => setUseAI(e.target.checked)}
              />{" "}
              AI 구성안 작성 · 1 크레딧
            </label>}
            <p className="ws-muted">
              {useAI && format !== "product-detail"
                ? "입력 내용을 바탕으로 AI가 문구와 배경 프롬프트를 작성합니다."
                : "입력한 내용을 템플릿에 배치해 무료로 시작합니다."}
              {!aiReady &&
                " AI 구성안은 관리자 API 연결 후 사용할 수 있습니다."}
            </p>
            {error && <Alert>{error}</Alert>}
            <Button type="submit" variant="primary" size="lg" loading={busy}>
              {useAI && format !== "product-detail" ? "AI 구성안 만들기 · 1 크레딧" : "구성안 만들기"}
            </Button>
          </div>
        </form>}
      </div>
    </main>
  );
}
