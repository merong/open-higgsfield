import { useState } from "react";
import { Avatar, HeartIcon, IconButton, Pagination } from "@/index";
import { DECK } from "../data";
import { renderSlide } from "../lib/slide";
import { Screen } from "./shell";
export function Phone() {
  const [page, setPage] = useState(1);
  const [liked, setLiked] = useState(false);
  return (
    <Screen width={390} height={844}>
      <div className="sc-phone-head">
        <Avatar initials="S" size={32} />
        <div>
          <strong>sunny.skin.lab</strong>
          <p className="sc-muted">Sunny Journal · 여름의 기록</p>
        </div>
      </div>
      <div style={{ position: "relative" }}>
        {renderSlide(DECK[page - 1]!, page, "editorial", "4:5", true, {
          style: { borderRadius: 0 },
        })}
        <span className="sc-badge">
          {page}/{DECK.length}
        </span>
      </div>
      <div className="sc-phone-actions">
        <IconButton
          ghost
          icon={<HeartIcon size={22} filled={liked} />}
          aria-label={liked ? "좋아요 취소" : "좋아요"}
          aria-pressed={liked}
          onClick={() => setLiked((v) => !v)}
        />
        <div className="sc-dots">
          {DECK.map((_, i) => (
            <button
              key={i}
              aria-label={`${i + 1}번 슬라이드`}
              aria-current={page === i + 1}
              onClick={() => setPage(i + 1)}
            />
          ))}
        </div>
      </div>
      <div className="sc-phone-caption">
        <strong>좋아요 {liked ? "1,285" : "1,284"}개</strong>
        <p>
          <b>sunny.skin.lab</b> 여름의 빛을 즐기는 작은 습관. 나에게 맞는 피부
          루틴을 찾아보세요.
        </p>
        <span className="sc-muted">콘텐츠·반응 수는 미리보기 예시입니다.</span>
      </div>
      <div className="sc-phone-foot">
        <span className="sc-muted">피드 미리보기</span>
        <Pagination
          page={page}
          total={DECK.length}
          onPageChange={setPage}
          label="피드 슬라이드"
          previousLabel="이전 사진"
          nextLabel="다음 사진"
        />
      </div>
    </Screen>
  );
}
