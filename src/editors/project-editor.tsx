"use client";
import { FormatSelector } from "./format-selector";
import { TypographyPanel } from "./typography-panel";
import { ProductInfoFields } from "./product-info-fields";
import { emptyProduct } from "@/projects/product-detail";
import { isPageFormat } from "@/projects/product-detail";
import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Alert,
  Button,
  Dialog,
  Field,
  Input,
  Textarea,
  Segment,
  InspectorSection,
  StatusBadge,
  Progress,
  Pagination,
  TimelineClip,
} from "@openhiggsfield/design";
import type {
  FormatId,
  Job,
  Project,
  Slot,
  Preset,
  Ratio,
  Composition,
} from "@/projects/types";
import { DIMENSIONS, PRESETS, formatFor, newSlot } from "@/projects/formats";
import { projectModels, planeFor } from "@/projects/plane";
import { api } from "@/projects/api";
import { watchRequest, POLL_DEADLINE_MS } from "@/generation/poll";
import { videoCreditBlocked, VIDEO_CREDIT_MESSAGE } from "@/projects/credit-policy";
import { useSession } from "@/shell/workspace-shell";
import { imagePlan, imagePlaceholder } from "@/projects/landing-images";
import { LandingImageBoard, ImagePlanFields } from "./landing-image-board";
import { LandingPreview } from "./landing-preview";
import {
  download,
  exportCards,
  exportLanding,
  filename,
  subtitles,
} from "@/render/export";
import { exportReels } from "@/render/reels";
import { ProjectSlide } from "./project-slide";
import { AssetLibrary } from "./asset-library";
import { useProject } from "./use-project";

export function ProjectEditor({ initial }: { initial: Project }) {
  const {
      project,
      edit,
      flush,
      replace,
      status,
      error: saveError,
    } = useProject(initial),
    session = useSession(),
    router = useRouter();
  const [switchingFormat, setSwitchingFormat] = useState(false);
  const [imagesOpen, setImagesOpen] = useState(false);
  async function openImages() { try { await flush(); setImagesOpen(true); } catch (e) { setError((e as Error).message); } }
  const [selected, setSelected] = useState(project.slots[0].id),
    [mode, setMode] = useState("canvas"),
    [assets, setAssets] = useState(false),
    [exportOpen, setExportOpen] = useState(false),
    [deleteOpen, setDeleteOpen] = useState(false),
    [error, setError] = useState(""),
    [notice, setNotice] = useState(""),
    [jobs, setJobs] = useState<Job[]>([]),
    [generation, setGeneration] = useState<{
      slots: Slot[];
      cost: number;
    } | null>(null),
    [busy, setBusy] = useState(false),
    [exportProgress, setExportProgress] = useState<number | null>(null),
    [playing, setPlaying] = useState(false);
  const [prepared, setPrepared] = useState<{
    url: string;
    name: string;
  } | null>(null);
  useEffect(
    () => () => {
      if (prepared) URL.revokeObjectURL(prepared.url);
    },
    [prepared],
  );
  const renderRoot = useRef<HTMLDivElement>(null),
    abort = useRef<AbortController | null>(null),
    watched = useRef(new Set<string>()),
    alive = useRef(true),
    projectRef = useRef(project),
    videoRef = useRef<HTMLVideoElement>(null),
    audioInput = useRef<HTMLInputElement>(null),
    musicRef = useRef<HTMLAudioElement>(null);
  projectRef.current = project;
  const index = Math.max(
      0,
      project.slots.findIndex((s) => s.id === selected),
    ),
    slot = project.slots[index],
    entry = formatFor(project.format),
    isReel = project.format === "reels",
    isLanding = isPageFormat(project.format);
  const videoBlocked = videoCreditBlocked(isReel ? "video" : "image", session.user?.credits ?? 0);
  const pending = jobs.filter((j) =>
    ["submitting", "pending", "unknown"].includes(j.state),
  );
  const currentJob = jobs.find((j) => j.slot_id === slot.id),
    totalDuration = project.slots.reduce((sum, s) => sum + s.duration, 0);
  async function selectFormat(next: FormatId) {
    if (next === project.format || busy || switchingFormat || exportProgress !== null) return;
    setSwitchingFormat(true);
    try {
      await flush();
      router.push(`/projects/new?format=${next}`);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setSwitchingFormat(false);
    }
  }
  function change(patch: Partial<Slot>) {
    edit((p) => ({
      ...p,
      slots: p.slots.map((s) => (s.id === slot.id ? { ...s, ...patch } : s)),
    }));
  }
  function changeSlot(id: string, patch: Partial<Slot>) {
    edit((p) => ({
      ...p,
      slots: p.slots.map((s) => (s.id === id ? { ...s, ...patch } : s)),
    }));
  }
  function refreshJobs() {
    return api<Job[]>(`jobs?projectId=${project.id}`).then((rows) => {
      if (alive.current) setJobs(rows);
      return rows;
    });
  }
  useEffect(() => {
    alive.current = true;
    void refreshJobs().catch((e) => setError(e.message));
    return () => {
      alive.current = false;
      abort.current?.abort();
    };
  }, []);
  async function adoptResult(job: Job, result: NonNullable<Job["result"]>) {
    if (!alive.current || !job.slot_id) return;
    const latest = projectRef.current.slots.find((s) => s.id === job.slot_id);
    if (!latest || latest.appliedJobId === job.id) return;
    const url = result.video?.url || result.images?.[0]?.url;
    if (!url) return;
    let saved = url;
    try {
      const response = await fetch(url);
      if (!response.ok) throw new Error();
      const blob = await response.blob();
      const form = new FormData();
      form.append(
        "file",
        new File([blob], result.video ? "generated.mp4" : "generated.png", {
          type: blob.type || (result.video ? "video/mp4" : "image/png"),
        }),
      );
      saved = (
        await api<{ url: string }>("assets", { method: "POST", body: form })
      ).url;
    } catch {
      if (alive.current)
        setNotice(
          "생성 파일을 서버로 복사하지 못했습니다. 현재는 원본 링크를 사용합니다. 파일을 업로드하면 안전하게 보관할 수 있습니다.",
        );
    }
    if (alive.current)
      changeSlot(job.slot_id, {
        media: { url: saved, kind: result.video ? "video" : "image" },
        appliedJobId: job.id,
      });
  }
  useEffect(() => {
    for (const job of jobs) {
      if (
        job.review_required || !job.slot_id ||
        jobs.find((j) => j.slot_id === job.slot_id)?.id !== job.id
      )
        continue;
      if (
        job.state === "completed" &&
        job.result &&
        !watched.current.has(job.id)
      ) {
        watched.current.add(job.id);
        void adoptResult(job, job.result).catch((e) => setError(e.message));
        continue;
      }
      if (
        job.state !== "pending" ||
        !job.request_id ||
        watched.current.has(job.id)
      )
        continue;
      watched.current.add(job.id);
      watchRequest(job.request_id, {
        deadline: Number(job.created_at) + POLL_DEADLINE_MS,
      })
        .then(async (result) => {
          if (!alive.current) return;
          if (result.status === "completed")
            await adoptResult(job, { ...result, error: undefined });
          else setError("생성하지 못했습니다. 예약 크레딧은 환불되었습니다.");
          await refreshJobs();
          await session.refresh();
        })
        .catch((e) => {
          if (alive.current) {
            setError(
              `${e.message} 재확인 버튼으로 상태를 다시 확인할 수 있습니다.`,
            );
            watched.current.delete(job.id);
          }
        });
    }
  }, [jobs]);
  useEffect(() => {
    if (!playing) return;
    const timer = setTimeout(() => {
      if (index + 1 >= project.slots.length) {
        setPlaying(false);
        return;
      }
      setSelected(project.slots[index + 1].id);
    }, slot.duration * 1000);
    return () => clearTimeout(timer);
  }, [playing, selected, slot.duration]);
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;
    video.currentTime = slot.trim;
    if (playing) void video.play().catch(() => setPlaying(false));
    else video.pause();
  }, [playing, selected, slot.media?.url]);
  useEffect(() => {
    const music = musicRef.current;
    if (!music) return;
    if (playing) {
      const offset = project.slots
        .slice(0, index)
        .reduce((sum, scene) => sum + scene.duration, 0);
      if (Number.isFinite(music.duration) && music.duration > 0)
        music.currentTime = offset % music.duration;
      void music.play().catch(() => setPlaying(false));
    } else music.pause();
    return () => music.pause();
  }, [playing, selected, project.audio?.url]);
  function reorder(direction: number) {
    const next = index + direction;
    if (next < 0 || next >= project.slots.length) return;
    edit((p) => {
      const slots = [...p.slots];
      [slots[index], slots[next]] = [slots[next], slots[index]];
      return { ...p, slots };
    });
  }
  function add(duplicate = false) {
    if (project.slots.length >= entry.max) return;
    const next = duplicate
      ? { ...slot, id: crypto.randomUUID() }
      : newSlot(isLanding ? "story" : "body");
    edit((p) => ({
      ...p,
      slots: [
        ...p.slots.slice(0, index + 1),
        next,
        ...p.slots.slice(index + 1),
      ],
    }));
    setSelected(next.id);
  }
  async function prepareGeneration(slots: Slot[]) {
    if (videoBlocked) { setError(VIDEO_CREDIT_MESSAGE); return; }
    setError("");
    setBusy(true);
    try {
      await flush();
      const costs = await Promise.all(
        slots.map((s) =>
          api<{ credits: number }>("quote", {
            method: "POST",
            body: JSON.stringify(planeFor(project, s)),
          }),
        ),
      );
      setGeneration({
        slots,
        cost: costs.reduce((sum, c) => sum + c.credits, 0),
      });
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  async function generate() {
    if (!generation) return;
    if (videoBlocked) { setError(VIDEO_CREDIT_MESSAGE); return; }
    setBusy(true);
    setError("");
    try {
      for (const s of generation.slots) {
        const job = await api<Job>("jobs", {
          method: "POST",
          body: JSON.stringify({
            plane: planeFor(projectRef.current, s),
            key: crypto.randomUUID(),
            projectId: project.id,
            slotId: s.id,
          }),
        });
        setJobs((prev) => [job, ...prev]);
        if (job.state === "unknown")
          throw new Error(
            "접수 확인이 필요합니다. 계정 페이지에서 요청 ID를 확인해 주세요.",
          );
      }
      setGeneration(null);
    } catch (e) {
      setError((e as Error).message);
      setGeneration(null);
    } finally {
      setBusy(false);
      await session.refresh();
    }
  }
  async function exportFile(single = false) {
    setError("");
    setNotice("");
    setPrepared(null);
    abort.current = new AbortController();
    setExportProgress(0);
    try {
      await flush();
      const nodes = Array.from(
        renderRoot.current?.children ?? [],
      ) as HTMLElement[];
      const result = isLanding
        ? await exportLanding(project, setExportProgress, abort.current.signal)
        : isReel
          ? await exportReels(
              nodes,
              project,
              setExportProgress,
              abort.current.signal,
            )
          : await exportCards(
              single ? [nodes[index]] : nodes,
              project,
              setExportProgress,
              abort.current.signal,
              single,
            );
      let fileUrl = URL.createObjectURL(result.blob);
      try {
        const data = new FormData();
        data.append(
          "file",
          new File([result.blob], result.name, {
            type: result.blob.type.split(";")[0],
          }),
        );
        const saved = await api<{ url: string }>("exports", {
          method: "POST",
          body: data,
        });
        URL.revokeObjectURL(fileUrl);
        fileUrl = saved.url;
      } catch {
        /* The prepared local download remains usable if archive storage is full. */
      }
      setPrepared({ url: fileUrl, name: result.name });
      setNotice("파일이 준비되었습니다. 아래 저장 버튼을 눌러 받으세요.");
    } catch (e) {
      setError(
        (e as Error).name === "AbortError"
          ? "내보내기를 취소했습니다."
          : (e as Error).message,
      );
    } finally {
      setExportProgress(null);
    }
  }
  async function uploadAudio(file: File) {
    setBusy(true);
    try {
      const data = new FormData();
      data.append("file", file);
      const asset = await api<{ url: string; name: string }>("assets", {
        method: "POST",
        body: data,
      });
      edit((p) => ({ ...p, audio: { url: asset.url, name: asset.name } }));
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  const exportJson = () =>
    download(
      new Blob([JSON.stringify(project, null, 2)], {
        type: "application/json",
      }),
      `${filename(project.title)}.json`,
    );
  const canvas = (
    <div
      className={`ws-preview ${isReel ? "ws-preview-reel" : ""} ${mode === "phone" ? "ws-phone" : ""}`}
    >
      {isReel && slot.media?.kind === "video" && (
        <video
          ref={videoRef}
          src={slot.media.url}
          style={{
            filter: `brightness(${1 - slot.dim})`,
            objectPosition: `center ${slot.crop}%`,
          }}
          playsInline
          muted
          onLoadedMetadata={(e) => {
            e.currentTarget.currentTime = slot.trim;
          }}
        />
      )}
      <ProjectSlide
        project={project}
        slot={
          isReel && slot.media?.kind === "video"
            ? { ...slot, media: undefined }
            : slot
        }
        index={index}
        overlay={isReel && slot.media?.kind === "video"}
      />
    </div>
  );
  return (
    <main className="ws-editor">
      <header className="ws-editor-head">
        <Button
          variant="ghost"
          onClick={async () => {
            try {
              await flush();
              router.push("/projects");
            } catch (e) {
              setError((e as Error).message);
            }
          }}
        >
          ← 프로젝트
        </Button>
        <div className="ws-editor-title">
          <Input
            aria-label="프로젝트 이름"
            value={project.title}
            maxLength={120}
            onChange={(e) => edit((p) => ({ ...p, title: e.target.value }))}
          />
          <span>
            <StatusBadge>{entry.label}</StatusBadge>
            <small role="status">{status}</small>
          </span>
        </div>
        <a href={`/help/${project.format}`} target="_blank" rel="noreferrer" className="ws-editor-guide" aria-label="사용 가이드 (새 탭)">사용 가이드 ↗</a>
        {isLanding && <Button onClick={() => void openImages()}>이미지 제작 · {project.slots.filter(s => imagePlan(s).enabled).length}장</Button>}
        <Button onClick={() => setExportOpen(true)} variant="primary">
          내보내기 ↗
        </Button>
      </header>
      <FormatSelector value={project.format} onChange={selectFormat}
        disabled={busy || switchingFormat || exportProgress !== null}
        hint={switchingFormat ? "현재 프로젝트를 저장하고 이동하고 있어요." : "다른 제작 기능을 선택하면 현재 프로젝트를 저장하고 새 프로젝트로 이동해요."} />
      {(error || saveError) && (
        <Alert
          action={
            <Button
              size="sm"
              onClick={() => {
                setError("");
                void flush().catch(() => {});
                void refreshJobs();
              }}
            >
              다시 확인
            </Button>
          }
        >
          {error || saveError}
          {saveError && (
            <Button size="sm" onClick={exportJson}>
              현재 작업 JSON 보관
            </Button>
          )}
        </Alert>
      )}
      {notice && (
        <p className="ws-notice" role="status">
          {notice}
        </p>
      )}
      <div className="ws-editor-grid">
        <section className="ws-storyboard">
          <div className="ws-brief">
            <span className="ws-eyebrow">
              {isLanding
                ? "PAGE STRUCTURE"
                : isReel
                  ? "SCENE BOARD"
                  : "STORYBOARD"}
            </span>
            <h1>{project.brief.topic}</h1>
            <p>
              {project.slots.length} {entry.noun}
              {isReel ? ` · ${totalDuration}초` : ""} ·{" "}
              {project.brief.audience || "나만의 콘텐츠"}
            </p>
          </div>
          <div
            className="ws-slot-list"
            role="list"
            aria-label={`${entry.noun} 목록`}
          >
            {project.slots.map((s, i) => (
              <div
                key={s.id}
                role="listitem"
                className="ws-slot"
                data-selected={s.id === slot.id}
              >
                <button
                  className="ws-slot-select"
                  onClick={() => {
                    setSelected(s.id);
                    setPlaying(false);
                  }}
                  aria-pressed={s.id === slot.id}
                  aria-label={`${i + 1}번 ${entry.noun}: ${s.title}`}
                >
                  <span className="ws-slot-number">
                    {String(i + 1).padStart(2, "0")}
                  </span>
                  <span className="ws-slot-thumb">
                    {s.media?.kind === "image" && (!isLanding || imagePlan(s).enabled) ? (
                      <img src={s.media.url} alt="" />
                    ) : (
                      <span>{isLanding && imagePlan(s).enabled ? <img src={imagePlaceholder(imagePlan(s))} alt={s.prompt || imagePlan(s).description} /> : isReel ? "▷" : "▤"}</span>
                    )}
                  </span>
                  <span>
                    <small>
                      {entry.kinds.find((k) => k.id === s.kind)?.label}
                    </small>
                    <strong>{s.title || "제목 없음"}</strong>
                    <p>{s.body}</p>
                  </span>
                  <span className="ws-slot-state">
                    {pending.some((j) => j.slot_id === s.id)
                      ? "●"
                      : s.media && (!isLanding || imagePlan(s).enabled)
                        ? "✓"
                        : ""}
                  </span>
                </button>
              </div>
            ))}
          </div>
          <div className="ws-slot-actions">
            <Button
              size="sm"
              onClick={() => add()}
              disabled={project.slots.length >= entry.max}
            >
              ＋ {entry.noun} 추가
            </Button>
            <Button
              size="sm"
              onClick={() => add(true)}
              disabled={project.slots.length >= entry.max}
            >
              복제
            </Button>
            <Button
              size="sm"
              aria-label="위로 이동"
              onClick={() => reorder(-1)}
              disabled={index === 0}
            >
              ↑
            </Button>
            <Button
              size="sm"
              aria-label="아래로 이동"
              onClick={() => reorder(1)}
              disabled={index === project.slots.length - 1}
            >
              ↓
            </Button>
            <Button
              size="sm"
              variant="ghost"
              onClick={() => setDeleteOpen(true)}
              disabled={
                project.slots.length <= 1 ||
                pending.some((j) => j.slot_id === slot.id)
              }
            >
              삭제
            </Button>
          </div>
          <div className="ws-content-form">
            <Field label="템플릿" htmlFor="slot-kind">
              <select
                id="slot-kind"
                value={slot.kind}
                onChange={(e) => change({ kind: e.target.value })}
              >
                {entry.kinds.map((k) => (
                  <option key={k.id} value={k.id}>
                    {k.label}
                  </option>
                ))}
              </select>
            </Field>
            <Field
              label={slot.kind === "quote" ? "인용 문구" : "제목"}
              htmlFor="slot-title"
              counter={{ value: slot.title.length, max: 90 }}
            >
              <Textarea
                id="slot-title"
                rows={2}
                value={slot.title}
                maxLength={90}
                onChange={(e) => change({ title: e.target.value })}
              />
            </Field>
            {project.format === "product-detail" && ["specs", "usage", "shipping"].includes(slot.kind) ? <ProductInfoFields value={project.product || emptyProduct()} onChange={product => edit(p => ({ ...p, product }))} fields={slot.kind === "specs" ? ["specs", "options"] : slot.kind === "usage" ? ["usage"] : ["shipping", "returns"]} /> : <Field
              label={
                ["faq", "specs"].includes(slot.kind)
                  ? (slot.kind === "specs" ? "항목 | 값 (한 줄씩)" : "질문 | 답변 (한 줄씩)")
                  : slot.kind === "list"
                    ? "목록 (한 줄씩, 최대 5개)"
                    : slot.kind === "compare"
                      ? "비교 항목 (제목:설명, 두 줄)"
                      : "본문"
              }
              htmlFor="slot-body"
              counter={{ value: slot.body.length, max: isLanding ? 2000 : 360 }}
            >
              <Textarea
                id="slot-body"
                rows={5}
                value={slot.body}
                maxLength={isLanding ? 2000 : 360}
                onChange={(e) => change({ body: e.target.value })}
              />
            </Field>}
            <div className="ws-pair">
              <Field
                label={slot.kind === "metric" ? "강조 숫자" : "머리말"}
                htmlFor="slot-kicker"
              >
                <Input
                  id="slot-kicker"
                  value={slot.kicker}
                  maxLength={60}
                  onChange={(e) => change({ kicker: e.target.value })}
                />
              </Field>
              <Field label="브랜드 / 계정" htmlFor="brand">
                <Input
                  id="brand"
                  value={project.brand}
                  maxLength={60}
                  onChange={(e) =>
                    edit((p) => ({ ...p, brand: e.target.value }))
                  }
                />
              </Field>
            </div>
            {(slot.kind === "cta" || isLanding) && (
              <div className="ws-pair">
                <Field label="버튼 문구" htmlFor="cta">
                  <Input
                    id="cta"
                    value={slot.cta}
                    maxLength={50}
                    onChange={(e) => change({ cta: e.target.value })}
                  />
                </Field>
                {isLanding && (
                  <Field label="버튼 링크" htmlFor="href">
                    <Input
                      id="href"
                      value={slot.href}
                      placeholder="https:// 또는 #section-2"
                      onChange={(e) => change({ href: e.target.value })}
                    />
                  </Field>
                )}
              </div>
            )}
            <InspectorSection title="배경과 생성">
              {isLanding && <ImagePlanFields value={imagePlan(slot)} onChange={imagePlan => change({ imagePlan })} />}
              <Field label="배경 프롬프트" htmlFor="prompt">
                <Textarea
                  id="prompt"
                  value={slot.prompt}
                  rows={3}
                  maxLength={3000}
                  onChange={(e) => change({ prompt: e.target.value })}
                />
              </Field>
              {!isLanding && <>
              <Field label="생성 모델" htmlFor="model">
                <select
                  id="model"
                  value={project.modelId}
                  onChange={(e) =>
                    edit((p) => ({ ...p, modelId: e.target.value }))
                  }
                >
                  {projectModels(project).map((m) => (
                    <option key={m.id} value={m.id}>
                      {m.label}
                    </option>
                  ))}
                </select>
              </Field>
              </>}
              <div className="ws-wrap">
                <Button onClick={() => setAssets(true)}>에셋 선택</Button>
                <Button
                  disabled={!slot.media}
                  variant="ghost"
                  onClick={() =>
                    change({ media: undefined, appliedJobId: currentJob?.id })
                  }
                >
                  배경 제거
                </Button>
                {!isLanding && <>
                <Button
                  loading={busy}
                  disabled={
                    videoBlocked || !slot.prompt.trim() ||
                    pending.some((j) => j.slot_id === slot.id)
                  }
                  onClick={() => isLanding ? void openImages() : void prepareGeneration([slot])}
                >
                  {isReel ? "영상 생성" : "이미지 생성"}
                </Button>
                </>}
                <Button
                  loading={busy}
                  disabled={
                    !isLanding && (videoBlocked || !project.slots.some(
                      (s) =>
                        !s.media &&
                        s.prompt &&
                        !pending.some((j) => j.slot_id === s.id),
                    )
                    )
                  }
                  onClick={() =>
                    isLanding ? void openImages() : void prepareGeneration(
                      project.slots.filter(
                        (s) =>
                          !s.media &&
                          s.prompt &&
                          !pending.some((j) => j.slot_id === s.id),
                      ),
                    )
                  }
                >
                  {isLanding ? "전체 이미지 제작 · 검수" : "남은 배경 생성"}
                </Button>
              </div>
              {videoBlocked && <p role="status" className="ws-muted">{VIDEO_CREDIT_MESSAGE} <a href="/account/credits">크레딧 확인 ↗</a></p>}
              {currentJob && (
                <p className="ws-muted">
                  {
                    {
                      submitting: "접수 중",
                      pending: "생성 중…",
                      completed: "생성 완료",
                      failed: "실패 · 크레딧 환불",
                      unknown: "접수 확인 필요",
                    }[currentJob.state]
                  }
                </p>
              )}
            </InspectorSection>
          </div>
        </section>
        <aside className="ws-canvas">
          <div className="ws-canvas-toolbar">
            <Segment
              aria-label="미리보기 모드"
              value={mode}
              onChange={setMode}
              items={
                isLanding
                  ? [
                      { id: "canvas", label: "데스크톱" },
                      { id: "phone", label: "모바일" },
                    ]
                  : [
                      { id: "canvas", label: isReel ? "플레이어" : "슬라이드" },
                      { id: "phone", label: "휴대폰" },
                    ]
              }
              plate
            />
            <Pagination
              label="선택된 장면"
              page={index + 1}
              total={project.slots.length}
              onPageChange={(p) => {
                setSelected(project.slots[p - 1].id);
                setPlaying(false);
              }}
              previousLabel="이전 장면"
              nextLabel="다음 장면"
            />
          </div>
          <div className={`ws-canvas-stage ${isLanding ? "ws-web-stage" : ""}`}>
            {isLanding ? (
              <LandingPreview project={project} mobile={mode === "phone"} />
            ) : (
              canvas
            )}
          </div>
          {isReel && (
            <>
              <div className="ws-toolbar">
                <Button onClick={() => setPlaying((v) => !v)}>
                  {playing ? "일시정지" : "▶ 전체 재생"}
                </Button>
                <span className="ws-muted">
                  총 {totalDuration}초 · {index + 1}번째 장면
                </span>
              </div>
              <div className="ws-timeline">
                {project.slots.map((s, i) => (
                  <TimelineClip
                    key={s.id}
                    label={`${i + 1}. ${s.title}`}
                    duration={`${s.duration}초`}
                    thumbnail={
                      s.media?.kind === "image" ? s.media.url : undefined
                    }
                    selected={s.id === slot.id}
                    onClick={() => {
                      setSelected(s.id);
                      setPlaying(false);
                    }}
                  />
                ))}
              </div>
            </>
          )}
          <div className="ws-inspector">
            {project.format === "product-detail" && <InspectorSection title="상품 정보 · 확정 자료"><ProductInfoFields value={project.product || emptyProduct()} onChange={product => edit(p => ({ ...p, product }))} /><p className="ws-muted">상품 정보는 원문 그대로 페이지에 표시합니다. AI 연출 이미지는 실제 외형·색상·구성품과 대조하고, 원본 사진은 에셋 선택에서 업로드하세요.</p></InspectorSection>}
            {!isReel && <InspectorSection title="글꼴과 메시지"><TypographyPanel project={project} disabled={busy} beforeRecommend={async()=>{await flush();return api<Project>(`projects/${project.id}`);}} onApply={async typography=>{edit(p=>({...p,typography}));await flush();}} /></InspectorSection>}
            <InspectorSection title="스타일과 레이아웃">
              <Field label="프로젝트 스타일">
                <Segment
                  aria-label="디자인 스타일"
                  value={project.preset}
                  onChange={(v) => edit((p) => ({ ...p, preset: v as Preset }))}
                  items={PRESETS.map((p) => ({ ...p }))}
                  plate
                />
              </Field>
              {!isLanding && !isReel && (
                <Field label="규격">
                  <Segment
                    aria-label="캔버스 규격"
                    value={project.ratio}
                    onChange={(v) => edit((p) => ({ ...p, ratio: v as Ratio }))}
                    items={entry.ratios.map((r) => ({ id: r, label: r }))}
                    plate
                  />
                </Field>
              )}
              {!isLanding && !isReel && (
                <Field label="사진 구도">
                  <Segment
                    aria-label="사진 구도"
                    value={slot.composition}
                    onChange={(v) => change({ composition: v as Composition })}
                    items={[
                      { id: "full", label: "전체 사진" },
                      { id: "split", label: "분리형" },
                      { id: "inset", label: "여백형" },
                    ]}
                    plate
                  />
                </Field>
              )}
              {!isLanding && (
                <Field label="어둡게" htmlFor="dim">
                  <input
                    id="dim"
                    type="range"
                    min={0}
                    max={0.85}
                    step={0.05}
                    value={slot.dim}
                    onChange={(e) => change({ dim: Number(e.target.value) })}
                  />
                </Field>
              )}
              <Field label="사진 세로 위치" htmlFor="crop">
                <input
                  id="crop"
                  type="range"
                  min={0}
                  max={100}
                  step={1}
                  value={slot.crop}
                  onChange={(e) => change({ crop: Number(e.target.value) })}
                />
              </Field>
            </InspectorSection>
            {isReel && (
              <InspectorSection title="영상과 사운드">
                <div className="ws-pair">
                  <Field label="장면 길이 (초)" htmlFor="duration">
                    <Input
                      id="duration"
                      type="number"
                      min={1}
                      max={15}
                      step={0.5}
                      value={slot.duration}
                      onChange={(e) =>
                        change({ duration: Number(e.target.value) })
                      }
                    />
                  </Field>
                  <Field label="영상 시작 (초)" htmlFor="trim">
                    <Input
                      id="trim"
                      type="number"
                      min={0}
                      max={3600}
                      step={0.1}
                      value={slot.trim}
                      onChange={(e) => change({ trim: Number(e.target.value) })}
                    />
                  </Field>
                </div>
                <p className="ws-muted">
                  원본 영상 소리는 제외하고 선택한 배경음을 사용합니다. 짧은
                  영상은 마지막 프레임을 유지합니다.
                </p>
                <input
                  hidden
                  ref={audioInput}
                  type="file"
                  accept="audio/mpeg,audio/mp4,audio/wav,audio/ogg"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) void uploadAudio(file);
                    e.target.value = "";
                  }}
                />
                <Button
                  onClick={() => audioInput.current?.click()}
                  loading={busy}
                >
                  배경음 업로드
                </Button>
                {project.audio && (
                  <>
                    <audio
                      ref={musicRef}
                      controls
                      loop
                      src={project.audio.url}
                    />
                    <p>{project.audio.name}</p>
                    <Button
                      size="sm"
                      onClick={() => edit((p) => ({ ...p, audio: undefined }))}
                    >
                      배경음 제거
                    </Button>
                  </>
                )}
              </InspectorSection>
            )}
            <InspectorSection title="캡션">
              <Textarea
                aria-label="게시용 캡션"
                rows={5}
                value={project.caption}
                maxLength={5000}
                onChange={(e) =>
                  edit((p) => ({ ...p, caption: e.target.value }))
                }
              />
            </InspectorSection>
          </div>
        </aside>
      </div>
      {assets && (
        <AssetLibrary
          video={isReel}
          onClose={() => setAssets(false)}
          onSelect={(media) => {
            change({ media, appliedJobId: currentJob?.id });
            setAssets(false);
          }}
        />
      )}
      <Dialog
        open={deleteOpen}
        title={`${entry.noun} 삭제`}
        closeLabel="닫기"
        onClose={() => setDeleteOpen(false)}
      >
        <p>“{slot.title}”을 삭제합니다.</p>
        <Button
          variant="danger"
          onClick={() => {
            const remaining = project.slots.filter((s) => s.id !== slot.id);
            edit((p) => ({ ...p, slots: remaining }));
            setSelected(remaining[Math.min(index, remaining.length - 1)].id);
            setDeleteOpen(false);
          }}
        >
          삭제
        </Button>
      </Dialog>
      {isLanding && <LandingImageBoard projectId={project.id} open={imagesOpen} onClose={() => setImagesOpen(false)} onApplied={saved => { replace(saved); setNotice("확인한 이미지를 페이지에 적용했어요."); }} />}
      <Dialog
        open={Boolean(generation)}
        title="생성 요청 확인"
        closeLabel="닫기"
        onClose={() => {
          if (!busy) setGeneration(null);
        }}
      >
        <p>
          {generation?.slots.length}개 {isReel ? "영상을" : "이미지를"}
          생성합니다. <strong>{generation?.cost} 크레딧</strong>을 예약하며
          실패한 요청은 환불합니다.
        </p>
        <p className="ws-muted">
          현재 잔액 {session.user?.credits ?? 0} 크레딧
        </p>
        <Button
          loading={busy}
          variant="primary"
          disabled={videoBlocked || (session.user?.credits ?? 0) < (generation?.cost ?? 0)}
          onClick={() => void generate()}
        >
          생성 시작
        </Button>
        <Button href="/account/credits">크레딧 확인</Button>
      </Dialog>
      <Dialog
        open={exportOpen}
        title="결과물 내보내기"
        closeLabel="닫기"
        onClose={() => {
          if (exportProgress === null) { setExportOpen(false); setNotice(""); }
        }}
      >
        <p>
          {isLanding
            ? "이미지와 글꼴을 포함한 반응형 웹페이지를 ZIP으로 받습니다."
            : isReel
              ? "자막이 포함된 720×1280 WebM 영상을 만듭니다. 영상 길이만큼 시간이 걸리며 이 탭을 열어 두세요."
              : `${project.slots.length}장의 ${DIMENSIONS[project.ratio].join("×")} PNG와 캡션을 ZIP으로 받습니다.`}
        </p>
        {error && <Alert>{error}</Alert>}
        {notice && <p role="status">{notice}</p>}
        {prepared && (
          <a
            className="ws-ready-download"
            href={prepared.url}
            download={prepared.name}
          >
            완성된 파일 저장 · {prepared.name}
          </a>
        )}
        {exportProgress !== null ? (
          <>
            <Progress
              value={exportProgress * 100}
              label="내보내기"
              detail={`${Math.round(exportProgress * 100)}%`}
            />
            <Button onClick={() => abort.current?.abort()}>취소</Button>
          </>
        ) : (
          <div className="ws-form">
            <Button
              variant={prepared ? "secondary" : "primary"}
              onClick={() => void exportFile()}
            >
              {isLanding
                ? "HTML ZIP 다운로드"
                : isReel
                  ? "WebM 영상 다운로드"
                  : "PNG ZIP 다운로드"}
            </Button>
            {!isLanding && !isReel && (
              <Button onClick={() => void exportFile(true)}>
                현재 슬라이드 PNG
              </Button>
            )}
            {isReel && (
              <Button
                onClick={() =>
                  download(
                    new Blob([subtitles(project)], { type: "text/plain" }),
                    `${filename(project.title)}.srt`,
                  )
                }
              >
                자막 SRT 다운로드
              </Button>
            )}
            <Button onClick={exportJson}>프로젝트 JSON 보관</Button>
            <Button
              onClick={() =>
                download(
                  new Blob([project.caption], { type: "text/plain" }),
                  "caption.txt",
                )
              }
            >
              캡션 다운로드
            </Button>
          </div>
        )}
      </Dialog>
      {!isLanding && (
        <div className="ws-export-root" ref={renderRoot} aria-hidden="true">
          {project.slots.map((s, i) => (
            <div
              key={s.id}
              style={{
                width: DIMENSIONS[project.ratio][0],
                height: DIMENSIONS[project.ratio][1],
              }}
            >
              <ProjectSlide
                project={project}
                slot={
                  isReel && s.media?.kind === "video"
                    ? { ...s, media: undefined }
                    : s
                }
                index={i}
                overlay={isReel && s.media?.kind === "video"}
              />
            </div>
          ))}
        </div>
      )}
    </main>
  );
}
