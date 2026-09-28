import { Patterns } from "./Patterns";
import { useState, type ReactNode } from "react";

import {
  Alert,
  Avatar,
  Button,
  Chip,
  CreditBadge,
  Dialog,
  Field,
  IconButton,
  Input,
  Kbd,
  Menu,
  MenuRow,
  OptionList,
  Pill,
  Popover,
  Segment,
  Skeleton,
  Slider,
  Spinner,
  Stepper,
  Switch,
  Tag,
  Textarea,
  Thumb,
  Tooltip,
  UndoBar,
  type ButtonSize,
  type ButtonVariant,
  type ThumbState,
} from "@/index";
import {
  ClockIcon,
  CopyIcon,
  DownloadIcon,
  FilmIcon,
  RetryIcon,
  SparkleIcon,
  TrashIcon,
} from "@/index";

import { PHOTOS } from "../data";

type State = "default" | "hover" | "active" | "disabled";
const STATES: State[] = ["default", "hover", "active", "disabled"];
/* Pins a state for the matrix: the SCSS pairs every :hover/:active with the
   same data-state attribute. */
const st = (s: State) => ({
  "data-state": s === "default" ? undefined : s,
  disabled: s === "disabled",
});

function Matrix({
  title,
  note,
  cols,
  rows,
  cell,
}: {
  title: string;
  note?: string;
  cols: readonly string[];
  rows: readonly string[];
  cell: (row: string, col: string) => ReactNode;
}) {
  return (
    <section className="sc-section">
      <h2 className="sc-h2">{title}</h2>
      {note && <p className="sc-note">{note}</p>}
      <table className="sc-matrix">
        <thead>
          <tr>
            <th />
            {cols.map((c) => (
              <th key={c}>{c}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r}>
              <td>{r}</td>
              {cols.map((c) => (
                <td key={c}>
                  <div className="sc-cell">{cell(r, c)}</div>
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </section>
  );
}

function SegmentDemo({ size, plate }: { size: "sm" | "md"; plate: boolean }) {
  const [v, setV] = useState("projects");
  return (
    <Segment
      size={size}
      plate={plate}
      items={[
        { id: "studio", label: "Studio" },
        { id: "projects", label: "Projects" },
        { id: "assets", label: "Assets" },
      ]}
      value={v}
      onChange={setV}
      aria-label="구역"
    />
  );
}

function StepperDemo({ start }: { start: number }) {
  const [v, setV] = useState(start);
  return (
    <Stepper
      value={v}
      min={4}
      max={10}
      onChange={setV}
      suffix="장"
      decrementLabel="한 장 줄이기"
      incrementLabel="한 장 늘리기"
    />
  );
}

/* The matrix adds a hover column (controller ruling): Switch now forwards
   native attributes, so the same st(...) pin used by every other control
   works here too — data-state="hover"/"active" rides the real button. */
function SwitchDemo({ on, state = "default" }: { on: boolean; state?: State }) {
  const [v, setV] = useState(on);
  return (
    <Switch
      checked={v}
      onChange={setV}
      aria-label="쪽 번호 표시"
      {...st(state)}
    />
  );
}

function SliderDemo({ start }: { start: number }) {
  const [v, setV] = useState(start);
  return (
    <div style={{ width: 200 }}>
      <Slider min={0} max={100} value={v} onChange={setV} aria-label="어둡게" />
    </div>
  );
}

function OptionsDemo() {
  const [v, setV] = useState("4:5");
  return (
    <div style={{ width: 200, height: 160, display: "flex" }}>
      <OptionList
        options={[
          { value: "auto", label: "Auto" },
          { value: "1:1", label: "1:1" },
          { value: "4:5", label: "4:5" },
          { value: "9:16", label: "9:16" },
        ]}
        value={v}
        onChange={setV}
        ratio
      />
    </div>
  );
}

export function Components() {
  return (
    <>
      <Patterns />
      <h1 className="sc-h1">컴포넌트</h1>
      <p className="sc-lead">
        변형 × 상태. hover/active/disabled는 data-state로 고정했다. 문구는 모두
        props다.
      </p>

      <Matrix
        title="Button"
        note="한 화면에 라임(primary)은 하나. busy는 생성 중, loading은 컨트롤 자신의 대기."
        cols={STATES}
        rows={[
          "primary",
          "secondary",
          "model",
          "ghost",
          "danger",
          "busy",
          "loading",
        ]}
        cell={(r, c) => {
          if (r === "busy")
            return c === "default" ? (
              <Button variant="primary" busy icon={<SparkleIcon />}>
                7장 생성 중
              </Button>
            ) : null;
          if (r === "loading")
            return c === "default" ? <Button loading>저장</Button> : null;
          return (
            <Button
              variant={r as ButtonVariant}
              icon={<SparkleIcon />}
              kbd={r === "primary" ? "⌘↵" : undefined}
              {...st(c as State)}
            >
              {r === "primary" ? "7장 생성 · 28 크레딧" : "슬라이드 추가"}
            </Button>
          );
        }}
      />
      <Matrix
        title="Button · 크기"
        cols={["sm 32", "md 36", "lg 38"]}
        rows={["secondary", "primary"]}
        cell={(r, c) => (
          <Button
            variant={r as ButtonVariant}
            size={c.slice(0, 2) as ButtonSize}
            icon={<DownloadIcon />}
          >
            내보내기
          </Button>
        )}
      />
      <Matrix
        title="IconButton"
        cols={STATES}
        rows={["plate 30", "plate 36", "ghost 28"]}
        cell={(r, c) => (
          <IconButton
            icon={<CopyIcon />}
            aria-label="복제"
            size={Number(r.split(" ")[1]) as 28 | 30 | 36}
            ghost={r.startsWith("ghost")}
            {...st(c as State)}
          />
        )}
      />
      <Matrix
        title="Chip"
        cols={STATES}
        rows={["기본", "pressed", "dot", "ratio"]}
        cell={(r, c) => (
          <Chip
            pressed={r === "pressed" ? true : r === "기본" ? undefined : false}
            dot={r === "dot"}
            ratio={r === "ratio" ? "4:5" : undefined}
            {...st(c as State)}
          >
            {r === "ratio" ? "피드 4:5" : r === "dot" ? "생성 중" : "카드뉴스"}
          </Chip>
        )}
      />
      <Matrix
        title="Pill"
        cols={STATES}
        rows={["glyph + label", "expanded"]}
        cell={(r, c) => (
          <Pill
            glyph={<FilmIcon />}
            label="장수"
            value="8"
            expanded={r === "expanded" ? true : undefined}
            {...st(c as State)}
          />
        )}
      />
      <Matrix
        title="Segment"
        note="선택 판은 실제 폭을 재서 움직인다."
        cols={["interactive"]}
        rows={["md", "sm + plate"]}
        cell={(r) => (
          <SegmentDemo size={r === "md" ? "md" : "sm"} plate={r !== "md"} />
        )}
      />
      <Matrix
        title="Tag"
        cols={["default", "accent", "muted"]}
        rows={["tone"]}
        cell={(_, c) => (
          <Tag tone={c as "default" | "accent" | "muted"}>
            {c === "accent" ? "기본값" : c === "muted" ? "준비 중" : "카드뉴스"}
          </Tag>
        )}
      />
      <Matrix
        title="Field · Input · Textarea"
        cols={["default", "focus", "invalid", "disabled"]}
        rows={["input", "textarea", "counter", "error"]}
        cell={(r, c) => {
          const state = c === "focus" ? { "data-state": "focus" } : {};
          const common = {
            invalid: c === "invalid",
            disabled: c === "disabled",
            ...state,
          };
          if (r === "textarea")
            return (
              <div style={{ width: 240 }}>
                <Field label="꼭 넣을 내용" optional="선택">
                  <Textarea
                    rows={2}
                    defaultValue="2시간마다 덧바르기"
                    {...common}
                  />
                </Field>
              </div>
            );
          if (r === "counter")
            return (
              <div style={{ width: 240 }}>
                <Field
                  label="본문"
                  counter={{ value: c === "invalid" ? 96 : 42, max: 90 }}
                >
                  <Input
                    defaultValue="흐린 날에도 발라야 하는 이유"
                    {...common}
                  />
                </Field>
              </div>
            );
          if (r === "error")
            return (
              <div style={{ width: 240 }}>
                <Field
                  label="주제"
                  required="필수"
                  error={c === "invalid" ? "주제를 입력하세요" : undefined}
                  hint="한 줄이면 됩니다"
                >
                  <Input
                    placeholder="여름철 자외선 차단제 고르는 법"
                    {...common}
                  />
                </Field>
              </div>
            );
          return (
            <div style={{ width: 240 }}>
              <Field label="대상 독자">
                <Input defaultValue="20대 직장인" {...common} />
              </Field>
            </div>
          );
        }}
      />
      <Matrix
        title="Stepper"
        cols={["min", "mid", "max"]}
        rows={["4–10"]}
        cell={(_, c) => (
          <StepperDemo start={c === "min" ? 4 : c === "max" ? 10 : 8} />
        )}
      />
      <Matrix
        title="Switch"
        note="hover/active는 실제 상태와 함께 data-state로도 고정된다(root button이 native 속성을 전달)."
        cols={["off", "on", "hover", "disabled"]}
        rows={["role=switch"]}
        cell={(_, c) => (
          <SwitchDemo
            on={c === "on" || c === "hover"}
            state={
              c === "hover"
                ? "hover"
                : c === "disabled"
                  ? "disabled"
                  : "default"
            }
          />
        )}
      />
      <Matrix
        title="Slider"
        cols={["0", "40", "100"]}
        rows={["--fill"]}
        cell={(_, c) => <SliderDemo start={Number(c)} />}
      />
      <Matrix
        title="OptionList"
        cols={["ratio"]}
        rows={["aria-pressed"]}
        cell={() => <OptionsDemo />}
      />
      <Matrix
        title="Avatar"
        cols={["28", "32", "44"]}
        rows={["initials"]}
        cell={(_, c) => (
          <Avatar initials="BK" size={Number(c) as 28 | 32 | 44} />
        )}
      />
      <Matrix
        title="CreditBadge"
        cols={["default"]}
        rows={["amount"]}
        cell={() => <CreditBadge amount={1240} unit="크레딧" />}
      />
      <Matrix
        title="Kbd · Spinner"
        cols={["default"]}
        rows={["kbd", "spinner"]}
        cell={(r) =>
          r === "kbd" ? <Kbd>⌘↵</Kbd> : <Spinner label="생성 중" />
        }
      />
      <Matrix
        title="Skeleton"
        cols={["label + clock"]}
        rows={["4:5"]}
        cell={() => (
          <div style={{ width: 160 }}>
            <Skeleton label="생성 중" clock="0:42" ratio="4:5" />
          </div>
        )}
      />
      <Matrix
        title="Thumb"
        cols={["image", "pending", "failed", "empty", "flat"]}
        rows={["56", "80"]}
        cell={(r, c) => (
          <Thumb state={c as ThumbState} src={PHOTOS.sand} size={Number(r)} />
        )}
      />
      <Matrix
        title="Popover · Menu"
        note="placement=static으로 흐름 안에 그렸다."
        cols={["setting", "list", "menu"]}
        rows={["variant"]}
        cell={(_, c) => {
          if (c === "setting")
            return (
              <Popover variant="setting" placement="static">
                <Field label="어둡게" value="40%">
                  <SliderDemo start={40} />
                </Field>
              </Popover>
            );
          if (c === "list")
            return (
              <Popover
                variant="list"
                placement="static"
                style={{ height: 220 }}
              >
                <Field label="비율">
                  <OptionsDemo />
                </Field>
              </Popover>
            );
          return (
            <Popover variant="menu" placement="static" head="정렬">
              <Menu>
                <MenuRow icon={<ClockIcon />} label="최근 수정" count={5} />
                <MenuRow icon={<SparkleIcon />} label="최근 생성" />
                <MenuRow icon={<TrashIcon />} label="휴지통" disabled />
              </Menu>
            </Popover>
          );
        }}
      />
      <Matrix
        title="Dialog"
        note="inline: 페이지를 덮지 않고 패널만 그린다."
        cols={["inline"]}
        rows={["width 420"]}
        cell={() => (
          <Dialog
            open
            inline
            title="내보내기"
            onClose={() => {}}
            closeLabel="닫기"
            width={420}
            head={<span className="sc-muted">8장 · 1080×1350</span>}
          >
            <p className="sc-muted">
              01.png ~ 08.png와 caption.txt를 ZIP으로 묶습니다.
            </p>
            <div className="sc-cell">
              <Button icon={<CopyIcon />}>캡션 복사</Button>
              <Button variant="primary" icon={<DownloadIcon />}>
                ZIP 내려받기
              </Button>
            </div>
          </Dialog>
        )}
      />
      <Matrix
        title="Alert · UndoBar"
        cols={["default"]}
        rows={["alert", "alert + action", "undo"]}
        cell={(r) => (
          <div style={{ width: 520 }}>
            {r === "alert" && (
              <Alert>생성에 실패했습니다 · 4 크레딧을 돌려드렸습니다</Alert>
            )}
            {r === "alert + action" && (
              <Alert
                action={
                  <Button size="sm" icon={<RetryIcon />}>
                    다시 시도
                  </Button>
                }
              >
                슬라이드 5 생성 실패
              </Alert>
            )}
            {r === "undo" && (
              <UndoBar
                text="슬라이드 5를 지웠습니다"
                actionLabel="되돌리기"
                onAction={() => {}}
                durationMs={6000}
              />
            )}
          </div>
        )}
      />
      <Matrix
        title="Tooltip"
        note="hover를 고정해 세 정렬을 보여 준다."
        cols={["center", "start", "end"]}
        rows={["data-tip"]}
        cell={(_, c) => (
          <div style={{ paddingTop: 36 }}>
            <Tooltip
              label="이 슬라이드 다시 쓰기"
              align={c === "center" ? undefined : (c as "start" | "end")}
              data-state="hover"
            >
              <IconButton
                icon={<SparkleIcon />}
                aria-label="이 슬라이드 다시 쓰기"
                ghost
                size={28}
              />
            </Tooltip>
          </div>
        )}
      />
    </>
  );
}
