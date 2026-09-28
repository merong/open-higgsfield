import { useState } from "react";
import {
  AssetCard,
  Button,
  EmptyState,
  InspectorSection,
  Pagination,
  Progress,
  SearchField,
  StatusBadge,
  TimelineClip,
  AssetsIcon,
  Input,
} from "@/index";
import { PHOTOS } from "../data";
export function Patterns() {
  const [query, setQuery] = useState("");
  const [page, setPage] = useState(1);
  const [asset, setAsset] = useState("sand");
  const [clip, setClip] = useState(0);
  return (
    <section className="sc-section">
      <div className="sc-section-heading">
        <div>
          <span className="sc-eyebrow">WORKSPACE PATTERNS</span>
          <h2 className="sc-h2">지금의 편집기, 다음의 작업 도구</h2>
        </div>
      </div>
      <div className="sc-pattern-grid">
        <div className="sc-pattern-card">
          <h3>검색과 탐색</h3>
          <SearchField
            value={query}
            onValueChange={setQuery}
            label="에셋 검색 예시"
            placeholder="에셋 이름으로 검색"
            clearLabel="에셋 검색 지우기"
          />
          <p className="sc-note" style={{ marginTop: 12 }}>
            {query
              ? `검색어: ${query}`
              : "검색 상태와 키보드 접근을 지원합니다."}
          </p>
          <Pagination
            page={page}
            total={5}
            onPageChange={setPage}
            label="페이지 예시"
            previousLabel="이전 결과"
            nextLabel="다음 결과"
          />
        </div>
        <div className="sc-pattern-card">
          <h3>명확한 작업 상태</h3>
          <div className="sc-toolbar">
            {(
              [
                "neutral",
                "success",
                "warning",
                "danger",
                "live",
                "info",
              ] as const
            ).map((tone, i) => (
              <StatusBadge key={tone} tone={tone}>
                {
                  [
                    "구성안",
                    "저장됨",
                    "확인 필요",
                    "실패",
                    "생성 중",
                    "미리보기",
                  ][i]
                }
              </StatusBadge>
            ))}
          </div>
          <Progress label="이미지 생성" value={3} max={8} detail="3 / 8장" />
          <div style={{ marginTop: 20 }}>
            <Progress label="에셋 처리 중" detail="대기 중" />
          </div>
        </div>
        <div className="sc-pattern-card">
          <h3>에셋 라이브러리</h3>
          <div className="sc-pattern-assets">
            {(["sand", "bottle"] as const).map((k) => (
              <AssetCard
                key={k}
                src={PHOTOS[k]}
                title={k === "sand" ? "여름의 빛" : "세이지 스튜디오"}
                meta="AI 생성 · 4:5"
                selected={asset === k}
                onClick={() => setAsset(k)}
              />
            ))}
          </div>
        </div>
        <div className="sc-pattern-card">
          <h3>편집 속성</h3>
          <InspectorSection
            title="브랜드 설정"
            description="랜딩 페이지와 콘텐츠 편집기에서 공유하는 속성 그룹입니다."
          >
            <label htmlFor="brand-name" className="sc-label">
              브랜드 이름
            </label>
            <Input id="brand-name" defaultValue="Sunny Journal" />
          </InspectorSection>
          <InspectorSection title="내보내기 설정" defaultOpen={false}>
            <p className="sc-muted">
              이 영역에 규격과 파일 형식 옵션을 구성합니다.
            </p>
          </InspectorSection>
        </div>
        <div className="sc-pattern-card">
          <h3>릴스 확장 · 장면 선택</h3>
          <p className="sc-note">
            장면 선택을 지원하는 프리미티브. 재생·트림 엔진은 추후 연동합니다.
          </p>
          <div className="sc-stack">
            {["오프닝", "디테일", "마무리"].map((label, i) => (
              <TimelineClip
                key={label}
                label={label}
                duration={`${i * 4}:00 — ${(i + 1) * 4}:00`}
                thumbnail={i === 1 ? PHOTOS.bottle : PHOTOS.sand}
                selected={clip === i}
                onClick={() => setClip(i)}
              />
            ))}
          </div>
        </div>
        <div className="sc-pattern-card">
          <EmptyState
            icon={<AssetsIcon size={24} />}
            title="아직 담긴 에셋이 없어요"
            description="생성한 이미지나 업로드한 파일을 한곳에 모아 다음 작업에 다시 사용하세요."
            action={
              <Button
                onClick={() => {
                  location.hash = "screens/projects";
                }}
              >
                프로젝트 둘러보기
              </Button>
            }
          />
        </div>
      </div>
    </section>
  );
}
