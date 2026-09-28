import { useState } from "react";
import {
  Button,
  Chip,
  EmptyState,
  Pagination,
  ProjectCard,
  SearchField,
  Thumb,
  LayersIcon,
  PlusIcon,
  SearchIcon,
} from "@/index";
import { DECK, PHOTOS, PROJECTS } from "../data";
import { renderSlide } from "../lib/slide";
import { AppBar, Screen } from "./shell";

export function Projects() {
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState("all");
  const [page, setPage] = useState(1);
  const filtered = PROJECTS.filter(
    (p) =>
      p.title.toLowerCase().includes(query.toLowerCase()) &&
      (filter === "all" || p.tone === filter),
  );
  const total = Math.ceil(filtered.length / 4);
  return (
    <Screen width={1440} height={900}>
      <AppBar />
      <main className="sc-page sc-project-page">
        <div className="sc-page-head">
          <div>
            <span className="sc-eyebrow">YOUR CREATIVE WORKSPACE</span>
            <h1 className="sc-page-title">아이디어가 작품이 되는 곳.</h1>
            <p className="sc-page-lead">
              진행 중인 이야기를 이어가거나, 새로운 주제로 시작하세요.
            </p>
          </div>
          <span className="sc-spacer" />
          <Button
            href="#screens/new"
            variant="primary"
            size="lg"
            icon={<PlusIcon />}
          >
            새 프로젝트
          </Button>
        </div>
        <div className="sc-project-toolbar">
          <SearchField
            value={query}
            onValueChange={(v) => {
              setQuery(v);
              setPage(1);
            }}
            label="프로젝트 검색"
            placeholder="프로젝트 이름으로 검색"
            clearLabel="검색 지우기"
          />
          <div className="sc-toolbar" style={{ margin: 0 }}>
            {[
              ["all", "전체"],
              ["live", "생성 중"],
              ["draft", "구성안"],
              ["done", "완성"],
            ].map(([id, label]) => (
              <Chip
                key={id}
                pressed={filter === id}
                onClick={() => {
                  setFilter(id!);
                  setPage(1);
                }}
              >
                {label}
              </Chip>
            ))}
          </div>
        </div>
        <div className="sc-cell">
          <LayersIcon />
          <h2 className="sc-h2" style={{ margin: 0 }}>
            내 프로젝트
          </h2>
          <span className="sc-muted">{filtered.length}개</span>
          <span className="sc-spacer" />
          <span className="sc-muted">최근 수정 순</span>
        </div>
        {filtered.length ? (
          <div className="sc-cards">
            {filtered.slice((page - 1) * 4, page * 4).map((p) => {
              const i = PROJECTS.indexOf(p);
              return (
                <ProjectCard
                  key={p.title}
                  href={
                    p.tone === "draft"
                      ? "#screens/editor-outline"
                      : "#screens/editor-generating"
                  }
                  title={p.title}
                  meta={p.meta}
                  status={p.status}
                  statusTone={p.tone}
                  cover={renderSlide(
                    {
                      ...DECK[0]!,
                      title: p.title,
                      kicker: "SUNNY JOURNAL",
                      sub: undefined,
                      photo: p.deck[0]?.photo ?? "bottle",
                    },
                    1,
                    (["basic", "editorial", "soft", "impact"] as const)[i % 4]!,
                    "4:5",
                    true,
                    { showFooter: false, edition: undefined },
                  )}
                  deck={p.deck.slice(0, 3).map((d, j) => (
                    <Thumb
                      key={j}
                      size={38}
                      state={d.state}
                      src={d.photo ? PHOTOS[d.photo] : undefined}
                    />
                  ))}
                />
              );
            })}
          </div>
        ) : (
          <EmptyState
            icon={<SearchIcon size={22} />}
            title="일치하는 프로젝트가 없습니다"
            description="다른 검색어를 입력하거나 필터를 초기화해 보세요."
            action={
              <Button
                onClick={() => {
                  setQuery("");
                  setFilter("all");
                }}
              >
                필터 초기화
              </Button>
            }
          />
        )}
        {total > 1 && (
          <Pagination
            page={page}
            total={total}
            onPageChange={setPage}
            label="프로젝트 페이지"
            previousLabel="이전 페이지"
            nextLabel="다음 페이지"
          />
        )}
      </main>
    </Screen>
  );
}
