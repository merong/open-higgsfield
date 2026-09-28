"use client";
import { useEffect, useState } from "react";
import {
  Alert,
  Button,
  EmptyState,
  ProjectCard,
  SearchField,
  Segment,
  Pagination,
  StatusBadge,
} from "@openhiggsfield/design";
import { api } from "@/projects/api";
import type { Project } from "@/projects/types";
import { FORMATS, formatFor } from "@/projects/formats";
import { FormatSelector } from "./format-selector";
import { ProjectSlide } from "./project-slide";
export function ProjectsPage({account=false}:{account?:boolean}) {
  const [projects, setProjects] = useState<Project[]>([]),
    [loaded, setLoaded] = useState(false),
    [error, setError] = useState("");
  const [query, setQuery] = useState(""),
    [format, setFormat] = useState("all"),
    [page, setPage] = useState(1);
  useEffect(() => {
    api<Project[]>("projects")
      .then(setProjects)
      .catch((e) => setError(e.message))
      .finally(() => setLoaded(true));
  }, []);
  const filtered = projects.filter(
    (p) =>
      (format === "all" || p.format === format) &&
      p.title.toLowerCase().includes(query.toLowerCase()),
  );
  return (
    <main className="ws-page">
      <div className="ws-page-heading">
        <div>
          <span className="ws-eyebrow">CREATE / YOUR PROJECTS</span>
          <h1>{account ? "내 프로젝트" : "아이디어가 작품이 되는 곳."}</h1>
          <p>새로운 이야기를 시작하거나, 작업하던 프로젝트를 이어가세요.</p>
        </div>
        <Button href="/projects/new" variant="primary" size="lg">
          ＋ 새 프로젝트
        </Button>
      </div>
      {!account && <FormatSelector />}
      <div className="ws-template-entry"><div><strong>카드뉴스, 준비된 템플릿으로 시작하세요.</strong><p>브랜드 이야기부터 AI 트렌드까지 · 이미지와 문구가 준비된 구성</p></div><Button href="/projects/new?format=card-news&start=templates">템플릿 둘러보기 ↗</Button></div>
      <div className="ws-toolbar">
        <Segment
          aria-label="프로젝트 포맷"
          value={format}
          onChange={(v) => {
            setFormat(v);
            setPage(1);
          }}
          items={[
            { id: "all", label: "전체" },
            ...FORMATS.map((f) => ({ id: f.id, label: f.label })),
          ]}
          plate
        />
        <SearchField
          label="프로젝트 검색"
          placeholder="프로젝트 이름으로 검색"
          value={query}
          onValueChange={(v) => {
            setQuery(v);
            setPage(1);
          }}
          clearLabel="검색 지우기"
        />
      </div>
      {error && <Alert>{error}</Alert>}
      {!loaded ? (
        <p role="status">프로젝트를 불러오고 있습니다.</p>
      ) : filtered.length === 0 ? (
        <EmptyState
          title={
            query ? "검색 결과가 없어요" : "첫 번째 이야기를 만들어 보세요"
          }
          description={
            query
              ? "다른 이름으로 검색하거나 필터를 초기화해 보세요."
              : "카드뉴스부터 숏폼, 랜딩 페이지까지 같은 작업실에서 만들 수 있습니다."
          }
          action={
            query ? (
              <Button
                onClick={() => {
                  setQuery("");
                  setFormat("all");
                }}
              >
                검색 초기화
              </Button>
            ) : (
              <Button href="/projects/new">프로젝트 만들기</Button>
            )
          }
        />
      ) : (
        <>
          <div className="ws-project-grid">
            {filtered.slice((page - 1) * 6, page * 6).map((p) => (
              <ProjectCard
                key={p.id}
                href={`/projects/${p.id}`}
                cover={<ProjectSlide project={p} slot={p.slots[0]} />}
                deck={<StatusBadge>{formatFor(p.format).label}</StatusBadge>}
                title={p.title}
                meta={`${p.slots.length} ${formatFor(p.format).noun} · ${new Date(p.updatedAt).toLocaleDateString("ko-KR")}`}
                status="저장됨"
              />
            ))}
          </div>
          <Pagination
            label="프로젝트 페이지"
            page={page}
            total={Math.ceil(filtered.length / 6)}
            onPageChange={setPage}
            previousLabel="이전 페이지"
            nextLabel="다음 페이지"
          />
        </>
      )}
    </main>
  );
}
