import { Button, CanvasPanel, Chip, IconButton, Pill, StoryboardRow, type SlidePreset, type ThumbState } from "@/index";
import { CopyIcon, DownloadIcon, ImageIcon, RetryIcon, SparkleIcon, TrashIcon } from "@/index";

import { DECK, PHOTOS, TEMPLATES, subline } from "../data";
import { renderSlide } from "../lib/slide";

export function storyRows(states: ThumbState[], selected: number, warnAt?: number) {
  return DECK.map((s, i) => {
    const state = states[i]!;
    const failed = state === "failed";
    const pending = state === "pending";
    return (
      <StoryboardRow
        key={i}
        index={i + 1}
        thumb={{ state, src: s.photo ? PHOTOS[s.photo] : undefined, size: 56 }}
        tag={s.label}
        title={s.title}
        sub={subline(s)}
        counter={warnAt === i ? { value: 96, max: 90 } : undefined}
        prompt={!failed && !pending && s.prompt ? s.prompt : undefined}
        status={failed ? "생성 실패 · 4 크레딧 돌려드림" : pending ? "생성 중 · 0:42" : !s.prompt ? "단색 배경 · 이미지 없음" : undefined}
        statusTone={failed ? "danger" : pending ? "live" : "default"}
        statusAction={failed ? <Button size="sm" icon={<RetryIcon />}>다시 시도</Button> : undefined}
        selected={i === selected}
        /* No selection state actually changes in the showcase; the callback only
           makes the row a real, keyboard-reachable selectable control (see
           StoryboardRow's onSelect contract) rather than an inert div. */
        onSelect={() => {}}
        actions={
          i === selected ? (
            <>
              <IconButton ghost size={28} icon={<SparkleIcon />} aria-label="이 슬라이드 다시 쓰기" />
              <IconButton ghost size={28} icon={<CopyIcon />} aria-label="복제" />
              <IconButton ghost size={28} icon={<TrashIcon />} aria-label="삭제" />
            </>
          ) : undefined
        }
      />
    );
  });
}

export function canvas({
  index,
  template,
  options,
  hint,
  withImage = true,
  preset = "basic",
}: {
  index: number;
  template: (typeof TEMPLATES)[number];
  options: [string, string][];
  hint: string;
  withImage?: boolean;
  preset?: SlidePreset;
}) {
  return (
    <CanvasPanel
      mode={{ items: [{ id: "slide", label: "슬라이드" }, { id: "phone", label: "휴대폰" }], value: "slide", onChange: () => {}, "aria-label": "보기" }}
      index={index}
      total={DECK.length}
      onPrev={() => {}}
      onNext={() => {}}
      prevLabel="이전 슬라이드"
      nextLabel="다음 슬라이드"
      stage={renderSlide(DECK[index - 1]!, index, preset, "4:5", withImage)}
      templates={{
        label: "템플릿",
        chips: TEMPLATES.map((t) => (
          <Chip key={t} pressed={t === template}>
            {t}
          </Chip>
        )),
      }}
      options={{ label: "옵션", pills: options.map(([l, v]) => <Pill key={l} label={l} value={v} />) }}
      actions={
        <>
          <Button icon={<RetryIcon />}>다시 생성 · 4 크레딧</Button>
          <Button icon={<ImageIcon size={14} />}>에셋에서 고르기</Button>
          <Button icon={<DownloadIcon />}>PNG</Button>
        </>
      }
      hint={hint}
    />
  );
}
