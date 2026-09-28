import type { ReactNode } from "react";

import { Avatar, BriefBar, Button, ProjectHeader, Tag, TopBar } from "@/index";
import { CheckIcon, DownloadIcon, PaletteIcon } from "@/index";

import { TOPIC } from "../data";

export function AppBar({ active = "projects" }: { active?: string }) {
  return (
    <TopBar
      brand="OpenHiggsfield"
      brandLabel="OpenHiggsfield 홈"
      brandHref="#screens/projects"
      nav={{
        items: [
          { id: "studio", label: "Studio" },
          { id: "projects", label: "Projects" },
        ],
        value: active,
        onChange: (id) => {
          location.hash = id === "studio" ? "slides" : "screens/projects";
        },
        "aria-label": "구역",
      }}
      credits={1240}
      creditsUnit="크레딧"
      topUp={
        <Button variant="ghost" size="sm" href="#screens/account">
          충전
        </Button>
      }
      avatar={
        <a href="#screens/account" aria-label="계정 메뉴">
          <Avatar initials="BK" size={32} />
        </a>
      }
    />
  );
}

export function Screen({
  width,
  height,
  children,
}: {
  width: number;
  height: number;
  children: ReactNode;
}) {
  return (
    <div
      className={`sc-screen ${width < 500 ? "sc-screen--phone" : "sc-screen--desktop"}`}
      style={{ width: "100%", maxWidth: width, minHeight: height }}
    >
      {children}
    </div>
  );
}

export function EditorShell({
  rows,
  strip,
  panel,
  exportPrimary = false,
  styleOpen = false,
  overlay,
  onStyle,
  onExport,
  total = 8,
}: {
  rows: ReactNode;
  strip: ReactNode;
  panel: ReactNode;
  exportPrimary?: boolean;
  styleOpen?: boolean;
  overlay?: ReactNode;
  onStyle?: () => void;
  onExport?: () => void;
  total?: number;
}) {
  return (
    <Screen width={1440} height={960}>
      <AppBar />
      <ProjectHeader
        back={{ href: "#screens/projects", label: "프로젝트 목록으로" }}
        title={TOPIC}
        tags={
          <>
            <Tag>카드뉴스</Tag>
            <Tag>4:5 · 1080×1350</Tag>
          </>
        }
        status={
          <>
            <CheckIcon size={13} />
            로컬 미리보기
          </>
        }
        actions={
          <>
            <Button
              href={onStyle ? undefined : "#screens/editor-style"}
              onClick={onStyle}
              icon={<PaletteIcon />}
              aria-expanded={styleOpen}
            >
              스타일
            </Button>
            <Button
              href={onExport ? undefined : "#screens/editor-export"}
              onClick={onExport}
              variant={exportPrimary ? "primary" : "secondary"}
              icon={<DownloadIcon />}
            >
              내보내기
            </Button>
          </>
        }
      />
      <div className="sc-editor">
        <div className="sc-editor-left">
          <div className="sc-editor-brief">
            <BriefBar
              label="주제"
              topic={TOPIC}
              pills={
                <>
                  <Tag>{total}장</Tag>
                  <Tag>친근하게</Tag>
                </>
              }
              action={
                <Button href="#screens/new" variant="ghost" size="sm">
                  브리프 수정
                </Button>
              }
            />
          </div>
          <div className="sc-editor-rows">{rows}</div>
          {strip}
        </div>
        {panel}
      </div>
      {overlay}
    </Screen>
  );
}
