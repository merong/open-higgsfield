import { useState } from "react";

import {
  Button,
  Chip,
  Field,
  FormatCard,
  Input,
  Stepper,
  Textarea,
} from "@/index";
import {
  ChevronLeftIcon,
  FilmIcon,
  LayersIcon,
  LayoutIcon,
  SparkleIcon,
} from "@/index";

import { TOPIC } from "../data";
import { AppBar, Screen } from "./shell";

const TONES = ["친근하게", "전문가", "위트 있게", "차분하게"];
const RATIOS: [string, string][] = [
  ["4:5", "피드 4:5"],
  ["3:4", "피드 3:4"],
  ["1:1", "정사각 1:1"],
  ["9:16", "스토리 9:16"],
];

export function NewProject() {
  const [pages, setPages] = useState(8);
  const [tone, setTone] = useState("친근하게");
  const [ratio, setRatio] = useState("4:5");
  return (
    <Screen width={1440} height={900}>
      <AppBar />
      <main className="sc-page" style={{ width: 720, gap: 22 }}>
        <a className="sc-back" href="#screens/projects">
          <ChevronLeftIcon />
          프로젝트
        </a>
        <div>
          <h1 className="sc-page-title">새 프로젝트</h1>
          <p className="sc-page-lead">
            주제 한 줄이면 됩니다. 나머지는 기본값이 있고, 편집기에서 언제든
            바꿀 수 있습니다.
          </p>
        </div>
        <section className="sc-stack">
          <span className="sc-label">포맷</span>
          <div className="sc-row-3">
            <FormatCard
              icon={<LayersIcon size={18} />}
              name="카드뉴스"
              description="인스타그램·쓰레드 캐러셀. 구성안 → 이미지 → PNG 묶음"
              pressed
            />
            <FormatCard
              icon={<FilmIcon size={18} />}
              name="릴스"
              description="장면 스토리보드에서 세로 영상으로"
              soon="준비 중"
            />
            <FormatCard
              icon={<LayoutIcon size={18} />}
              name="랜딩 페이지"
              description="링크 인 바이오와 캠페인 페이지"
              soon="준비 중"
            />
          </div>
        </section>
        <section className="sc-card">
          <Field
            label="주제"
            htmlFor="np-topic"
            required="필수"
            counter={{ value: TOPIC.length, max: 120 }}
          >
            <Textarea
              id="np-topic"
              defaultValue={TOPIC}
              rows={2}
              style={{ fontSize: 15 }}
            />
          </Field>
          <div className="sc-row-2">
            <Field label="대상 독자" htmlFor="np-aud">
              <Input id="np-aud" defaultValue="20대 직장인" />
            </Field>
            <Field label="장수">
              <Stepper
                value={pages}
                min={4}
                max={10}
                onChange={setPages}
                suffix="장"
                decrementLabel="한 장 줄이기"
                incrementLabel="한 장 늘리기"
              />
            </Field>
          </div>
          <Field label="톤">
            <div className="sc-toolbar" style={{ marginBottom: 0 }}>
              {TONES.map((t) => (
                <Chip key={t} pressed={t === tone} onClick={() => setTone(t)}>
                  {t}
                </Chip>
              ))}
            </div>
          </Field>
          <Field
            label="채널 규격"
            hint="1080×1350 · 프로필 그리드에서는 가운데가 잘려 보입니다"
          >
            <div className="sc-toolbar" style={{ marginBottom: 0 }}>
              {RATIOS.map(([r, label]) => (
                <Chip
                  key={r}
                  ratio={r}
                  pressed={r === ratio}
                  onClick={() => setRatio(r)}
                >
                  {label}
                </Chip>
              ))}
            </div>
          </Field>
          <Field label="꼭 넣을 내용" htmlFor="np-must" optional="선택">
            <Textarea
              id="np-must"
              defaultValue="2시간마다 덧바르기, PA 등급 설명"
              rows={2}
            />
          </Field>
        </section>
        <div className="sc-cell" style={{ gap: 12 }}>
          <span className="sc-muted">
            구성안 1 크레딧 · 이미지 크레딧은 구성안을 확인한 뒤에 씁니다
          </span>
          <span className="sc-spacer" />
          <Button
            variant="primary"
            size="lg"
            icon={<SparkleIcon />}
            href="#screens/editor-outline"
          >
            구성안 미리보기
          </Button>
        </div>
      </main>
    </Screen>
  );
}
