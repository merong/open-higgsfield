import { useState } from "react";
import {
  ActionStrip,
  AssetCard,
  Button,
  CanvasPanel,
  Chip,
  Dialog,
  Field,
  IconButton,
  Input,
  InspectorSection,
  Progress,
  StatusBadge,
  StoryboardRow,
  StyleCard,
  Textarea,
  SLIDE_PRESETS,
  type SlideComposition,
  type SlidePreset,
  type ThumbState,
} from "@/index";
import {
  CheckIcon,
  CloseIcon,
  CopyIcon,
  ImageIcon,
  PlusIcon,
  SparkleIcon,
  TrashIcon,
} from "@/index";
import { DECK, PHOTOS, subline, type DeckSlide } from "../data";
import { renderSlide } from "../lib/slide";
import { EditorShell } from "./shell";

const PRESET_NAMES = {
  basic: "시그니처",
  editorial: "에디토리얼",
  impact: "임팩트",
  soft: "소프트",
};
type Stage = "outline" | "generating" | "style" | "export";
function EditorWorkbench({ stage }: { stage: Stage }) {
  const [deck, setDeck] = useState<DeckSlide[]>(DECK.map((s) => ({ ...s })));
  const [selected, setSelected] = useState(stage === "export" ? 7 : 0);
  const [preset, setPreset] = useState<SlidePreset>("editorial");
  const [composition, setComposition] = useState<SlideComposition>("split");
  const [mode, setMode] = useState("slide");
  const [note, setNote] = useState("");
  const [styleOpen, setStyleOpen] = useState(stage === "style");
  const [exportOpen, setExportOpen] = useState(stage === "export");
  const [assetsOpen, setAssetsOpen] = useState(false);
  const [caption, setCaption] = useState(
    "여름의 빛과 피부를 위한 작은 가이드. 나에게 맞는 루틴을 여덟 장에 담았습니다. #sunnyjournal #skincare",
  );
  const slide = deck[selected]!;
  const states = deck.map(
    (s, i): ThumbState =>
      s.kind === "cta"
        ? "flat"
        : stage === "outline"
          ? "empty"
          : stage === "generating" && i === 3
            ? "pending"
            : stage === "generating" && i === 4
              ? "failed"
              : "image",
  );
  function update(patch: Partial<DeckSlide>) {
    setDeck((old) =>
      old.map((s, i) => (i === selected ? { ...s, ...patch } : s)),
    );
  }
  function remove(i: number) {
    if (deck.length <= 1) return;
    setDeck((old) => old.filter((_, j) => i !== j));
    setSelected((n) =>
      Math.max(0, Math.min(n > i ? n - 1 : n, deck.length - 2)),
    );
  }
  function duplicate(i: number) {
    setDeck((old) => [
      ...old.slice(0, i + 1),
      { ...old[i]! },
      ...old.slice(i + 1),
    ]);
    setSelected(i + 1);
  }
  const picture = renderSlide(
    slide,
    selected + 1,
    preset,
    "4:5",
    stage !== "outline",
    {
      composition:
        slide.kind === "cover" || slide.kind === "body" ? composition : "full",
      page: `${selected + 1} / ${deck.length}`,
    },
  );
  const generationNote = () =>
    setNote(
      "디자인 미리보기입니다. 실제 이미지 생성과 크레딧 차감은 서비스 연동 후 사용할 수 있습니다.",
    );
  return (
    <EditorShell
      total={deck.length}
      onStyle={() => setStyleOpen((v) => !v)}
      onExport={() => setExportOpen(true)}
      styleOpen={styleOpen}
      exportPrimary={stage === "style" || stage === "export"}
      rows={
        <>
          {deck.map((s, i) => (
            <StoryboardRow
              key={i}
              index={i + 1}
              thumb={{
                state: states[i]!,
                src: s.photo ? PHOTOS[s.photo] : undefined,
                size: 44,
              }}
              tag={s.label}
              title={s.title}
              sub={subline(s)}
              selected={i === selected}
              onSelect={() => setSelected(i)}
              status={
                states[i] === "pending"
                  ? "생성 중 · 예시 상태"
                  : states[i] === "failed"
                    ? "생성 실패 · 다시 시도 가능"
                    : undefined
              }
              statusTone={states[i] === "failed" ? "danger" : "default"}
              statusAction={
                states[i] === "failed" ? (
                  <Button size="sm" onClick={generationNote}>
                    다시 시도
                  </Button>
                ) : undefined
              }
              actions={
                i === selected ? (
                  <>
                    <IconButton
                      ghost
                      size={28}
                      icon={<CopyIcon />}
                      aria-label="슬라이드 복제"
                      onClick={() => duplicate(i)}
                    />
                    <IconButton
                      ghost
                      size={28}
                      icon={<TrashIcon />}
                      aria-label="슬라이드 삭제"
                      disabled={deck.length <= 1}
                      onClick={() => remove(i)}
                    />
                  </>
                ) : undefined
              }
            />
          ))}
        </>
      }
      strip={
        <>
          <div className="sc-editor-progress">
            <Progress
              value={
                stage === "outline"
                  ? 0
                  : stage === "generating"
                    ? 3
                    : deck.length
              }
              max={deck.length}
              label="이미지 준비"
              detail={
                stage === "generating"
                  ? `3 / ${deck.length}장`
                  : `${stage === "outline" ? 0 : deck.length} / ${deck.length}장`
              }
            />
          </div>
          <ActionStrip
            status={
              <StatusBadge tone={stage === "generating" ? "live" : "neutral"}>
                {stage === "generating"
                  ? "생성 중 · 미리보기"
                  : "편집 내용은 이 화면에서 유지됩니다"}
              </StatusBadge>
            }
            actions={
              <>
                <Button
                  icon={<PlusIcon />}
                  onClick={() => {
                    setDeck((old) => [
                      ...old,
                      {
                        ...DECK[1]!,
                        title: "새로운 이야기",
                        body: "전하고 싶은 내용을 입력하세요.",
                      },
                    ]);
                    setSelected(deck.length);
                  }}
                >
                  슬라이드 추가
                </Button>
                <Button
                  variant="primary"
                  icon={<SparkleIcon />}
                  onClick={generationNote}
                >
                  이미지 생성
                </Button>
              </>
            }
          />
          {note && (
            <p role="status" className="sc-workbench-note">
              {note}
            </p>
          )}
        </>
      }
      panel={
        <CanvasPanel
          mode={{
            items: [
              { id: "slide", label: "슬라이드" },
              { id: "phone", label: "휴대폰" },
            ],
            value: mode,
            onChange: setMode,
            "aria-label": "보기",
          }}
          index={selected + 1}
          total={deck.length}
          onPrev={() => setSelected((i) => Math.max(0, i - 1))}
          onNext={() => setSelected((i) => Math.min(deck.length - 1, i + 1))}
          prevLabel="이전 슬라이드"
          nextLabel="다음 슬라이드"
          stage={
            mode === "phone" ? (
              <div className="sc-preview-phone">
                {picture}
                <p>
                  sunny.skin.lab
                  <br />
                  {slide.title}
                </p>
              </div>
            ) : (
              picture
            )
          }
          templates={{
            label: "스타일",
            chips: SLIDE_PRESETS.map((p) => (
              <Chip key={p} pressed={p === preset} onClick={() => setPreset(p)}>
                {PRESET_NAMES[p]}
              </Chip>
            )),
          }}
          actions={
            <>
              <Button icon={<ImageIcon />} onClick={() => setAssetsOpen(true)}>
                배경 선택
              </Button>
              <Button onClick={() => setExportOpen(true)}>내보내기</Button>
            </>
          }
          inspector={
            <>
              <InspectorSection title="구도와 배치">
                <div className="sc-property-row">
                  <select
                    className="ohf-input"
                    aria-label="사진 구도"
                    value={composition}
                    onChange={(e) =>
                      setComposition(e.target.value as SlideComposition)
                    }
                  >
                    <option value="full">전체 사진</option>
                    <option value="split">분리형</option>
                    <option value="inset">여백형</option>
                  </select>
                  <select
                    className="ohf-input"
                    aria-label="글자 위치"
                    value={slide.position}
                    onChange={(e) =>
                      update({
                        position: e.target.value as DeckSlide["position"],
                      })
                    }
                    disabled={Boolean(slide.photo) && composition !== "full"}
                  >
                    <option value="start">위</option>
                    <option value="mid">가운데</option>
                    <option value="end">아래</option>
                  </select>
                </div>
              </InspectorSection>
              <InspectorSection title="문구 편집">
                <Field
                  label="제목"
                  htmlFor="edit-title"
                  counter={{ value: slide.title.length, max: 90 }}
                >
                  <Input
                    id="edit-title"
                    value={slide.title}
                    onChange={(e) => update({ title: e.target.value })}
                  />
                </Field>
                <Field label="부제 또는 본문" htmlFor="edit-body">
                  <Textarea
                    id="edit-body"
                    rows={3}
                    value={slide.body ?? slide.sub ?? ""}
                    onChange={(e) =>
                      update(
                        slide.kind === "body"
                          ? { body: e.target.value }
                          : { sub: e.target.value },
                      )
                    }
                  />
                </Field>
              </InspectorSection>
            </>
          }
          hint="목록에서 슬라이드를 선택하고 문구와 스타일을 바꿔 보세요."
        />
      }
      overlay={
        <>
          {styleOpen && (
            <div className="sc-overlay-pop">
              <div className="sc-card">
                <div className="sc-cell">
                  <h2 className="sc-h2">덱 스타일</h2>
                  <span className="sc-spacer" />
                  <IconButton
                    ghost
                    icon={<CloseIcon />}
                    aria-label="스타일 닫기"
                    onClick={() => setStyleOpen(false)}
                  />
                </div>
                <p className="sc-muted">
                  선택한 스타일을 모든 슬라이드에 적용합니다.
                </p>
                <div className="sc-style-grid">
                  {SLIDE_PRESETS.map((p) => (
                    <StyleCard
                      key={p}
                      name={PRESET_NAMES[p]}
                      description={p}
                      pressed={p === preset}
                      onClick={() => setPreset(p)}
                      preview={renderSlide(DECK[0]!, 1, p, "4:5", true, {
                        showFooter: false,
                      })}
                    />
                  ))}
                </div>
                <Button
                  onClick={() => setStyleOpen(false)}
                  icon={<CheckIcon />}
                >
                  적용 완료
                </Button>
              </div>
            </div>
          )}
          <Dialog
            open={assetsOpen}
            title="배경 이미지"
            closeLabel="배경 선택 닫기"
            onClose={() => setAssetsOpen(false)}
            width={520}
          >
            <p className="sc-muted">
              이 쇼케이스를 위해 생성한 두 장의 오리지널 사진입니다.
            </p>
            <div className="sc-pattern-assets">
              {(["sand", "bottle"] as const).map((k) => (
                <AssetCard
                  key={k}
                  src={PHOTOS[k]}
                  title={k === "sand" ? "여름의 빛" : "세이지 스튜디오"}
                  meta="AI 생성 · 4:5"
                  selected={slide.photo === k}
                  onClick={() => {
                    update({ photo: k });
                    setAssetsOpen(false);
                  }}
                />
              ))}
            </div>
          </Dialog>
          <Dialog
            open={exportOpen}
            title="이야기를 꺼내 놓을 시간"
            closeLabel="내보내기 닫기"
            onClose={() => setExportOpen(false)}
            width={560}
          >
            <StatusBadge tone="info">
              디자인 미리보기 · {deck.length}장
            </StatusBadge>
            <Field label="캡션" htmlFor="export-caption">
              <Textarea
                id="export-caption"
                value={caption}
                onChange={(e) => setCaption(e.target.value)}
                rows={4}
              />
            </Field>
            <div className="sc-cell">
              <Button
                icon={<CopyIcon />}
                onClick={async () => {
                  try {
                    await navigator.clipboard.writeText(caption);
                    setNote("캡션을 복사했습니다.");
                  } catch {
                    setNote(
                      "클립보드에 접근하지 못했습니다. 캡션을 직접 선택해 복사하세요.",
                    );
                  }
                }}
              >
                캡션 복사
              </Button>
              <Button
                variant="primary"
                onClick={() => {
                  const url = URL.createObjectURL(
                    new Blob(
                      [
                        JSON.stringify(
                          { preset, composition, deck, caption },
                          null,
                          2,
                        ),
                      ],
                      { type: "application/json" },
                    ),
                  );
                  const a = document.createElement("a");
                  a.href = url;
                  a.download = "storyboard.json";
                  a.click();
                  setTimeout(() => URL.revokeObjectURL(url), 1000);
                }}
              >
                구성안 JSON 저장
              </Button>
            </div>
            <p className="sc-muted">
              PNG·ZIP 내보내기는 실제 렌더러 연동 단계에서 제공됩니다.
            </p>
            {note && (
              <p role="status" className="sc-muted">
                {note}
              </p>
            )}
          </Dialog>
        </>
      }
    />
  );
}
export function EditorOutline() {
  return <EditorWorkbench stage="outline" />;
}
export function EditorGenerating() {
  return <EditorWorkbench stage="generating" />;
}
export function EditorStyle() {
  return <EditorWorkbench stage="style" />;
}
export function EditorExport() {
  return <EditorWorkbench stage="export" />;
}
