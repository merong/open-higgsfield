import { EDITORIAL_CRITERIA, type EditorialCriterion, type EditorialIssue, type EditorialLoop } from "@/projects/editorial-review";
import { object, ServiceError, text } from "./errors";

export const editorialCriteriaSchema = {
  type: "array", items: { type: "object", additionalProperties: false, required: ["key", "status", "evidence"], properties: {
    key: { type: "string", enum: Object.keys(EDITORIAL_CRITERIA) },
    status: { type: "string", enum: ["pass", "attention", "fail"] }, evidence: { type: "string" },
  } },
};
export const editorialReviewPrompt = `독립 편집자 관점으로 현재 결과를 검수하세요. 이 자동 보정 단계는 문구만 고칩니다. 이미지 계획·프롬프트·원본·영상 길이·CTA 링크의 변경이 필요한 사항은 attention으로 남겨 사용자 확인을 받으세요. 이미지 프롬프트는 향후 사용할 구상이며 그 자체로 이미지 생성이나 과금이 실행된 것은 아닙니다. 사용자가 생성을 하지 말라고 했다는 이유만으로 승인된 이미지 구상의 존재를 오류로 판단하지 마세요. criteria에 intent(사용자가 원하는 독자 반응/조건), facts(원문·고유명사·수치·출처), narrative(첫 훅·전개·마무리·중복과 구체성), visual(장면 구상/참고 이미지와 메시지의 역할 분담), readability(문장 밀도·위계·의미 단위 분할)를 각각 정확히 한 번 기록하세요. evidence는 해당 문구/섹션/장면을 짚는 관찰 근거로 240자 이내. pass는 확인된 적합, attention은 근거 부족/사람 확인, fail은 구체적인 수정 필요입니다. fail마다 해당 ID의 issues에 수정할 문구와 방법을 명확히 적으세요. '더 매력적으로' 같은 막연한 지적, 모든 장에 반복되는 추상 문구, 정보 없는 형용사 대신 독자가 이해/판단/실천할 구체성이 있는지 보세요. 없는 정보를 만들도록 요구하지 마세요. 문맥을 잇는 표현이나 제공된 행동을 풀어 쓴 안내 자체는 새로운 사실 단정으로 간주하지 마세요. 수치·효능·제품 특성 같은 사실 추가와 사용자가 그대로 쓰라고 확정한 문구의 변경을 구분하세요. 원문으로 주어진 확정 문구는 자동 축약하지 않으며 이미지 원본·잠긴 길이는 보호합니다. 실제 화면을 보지 않았다면 모바일 픽셀/자막/재생 검증을 주장하지 마세요. editorial.reviews에 이전 검수와 보정 이력이 있으면 같은 문제가 실제 해소됐는지 비교하고, 바뀌지 않은 강점을 다시 수정하라고 요구하지 마세요. 공개 원고에 촬영 구도·피사체 배치·페이지 순서 같은 제작 지시가 섞이면 narrative 실패와 해당 항목의 error로 기록하고, 주어진 사실만으로 방문자에게 전달할 문장으로 보정하세요. 예를 들어 상품 본문의 “얼굴보다 손에 시선을 두어 담습니다”, “다음 섹션으로 이어집니다”는 제작 메모입니다. 단, 사진 찍는 방법 자체가 콘텐츠 주제인 안내문은 예외입니다. 문구 수정으로 해결할 수 없는 정보 부족이나 취향은 attention입니다. 내부 사고 과정은 반환하지 말고 사용자에게 유용한 결과와 근거만 요약하세요.`;
export const editorialCreationPrompt = "공개되는 제목·본문·화면 문구·내레이션에는 독자에게 전달할 완성 원고만 쓰세요. 촬영·배치·장면 전환·페이지 구성 같은 제작 지시는 이미지 prompt나 기획 필드에만 기록하세요. 상품 설명에 “얼굴보다 손을 중심으로 담는다” 같은 촬영 메모를 섞지 마세요. 제공 정보가 적으면 짧고 정확하게 쓰고, 분량을 채우기 위한 제작 설명이나 근거 없는 장점을 추가하지 마세요. 각 카드·섹션·컷은 서로 다른 질문 하나에 답하고, 앞 내용에서 다음 내용으로 넘어갈 이유를 만드세요. 구체적 사용자 상황/관찰/실행 방법을 우선하고 추상적 수식어나 같은 메시지의 반복으로 분량을 채우지 마세요. 주어진 정보만으로 만들 수 있는 서로 다른 접근을 비교해 목적에 맞는 흐름 하나를 선택하되 비교 사고 과정은 출력하지 마세요. 이미지 지시는 각 항목의 핵심 메시지를 시각적으로 설명하고, 같은 피사체라도 컷의 역할·거리·배경을 구분하세요.";
export const editorialRefinePrompt = "editorial.targetIds에 있는 항목만 수정합니다. editorial.reviews의 마지막 error 지적을 우선 고치고, attention을 해결하려고 사실을 만들어 내지 마세요. 검수와 관계 없는 문구/제목/이미지 프롬프트/형식은 유지하세요. 이전 보정에도 남은 오류는 같은 표현을 반복하지 말고 근거 있는 다른 해결책을 적용하세요. 확정 원문을 훼손해야 해결되는 문제는 자동 변경하지 말고 summary에 사용자 확인 필요로 남기세요. summary에는 실제 바뀐 부분과 남은 확인 사항만 적으세요.";

export function recordEditorialReview(loop: EditorialLoop, value: Record<string, unknown>, issues: EditorialIssue[]) {
  let criteria: EditorialCriterion[] = [];
  // Older saved runs and deterministic providers may not include the new rubric.
  if (value.criteria !== undefined) {
    if (!Array.isArray(value.criteria) || value.criteria.length !== 5) throw new ServiceError(502, "다섯 가지 검수 기준을 확인하지 못했습니다.");
    const seen = new Set<string>();
    criteria = value.criteria.map(raw => {
      const item = object(raw), key = String(item.key), status = String(item.status);
      if (!Object.hasOwn(EDITORIAL_CRITERIA, key) || seen.has(key) || !["pass", "attention", "fail"].includes(status)) throw new ServiceError(502, "검수 기준이 중복되거나 올바르지 않습니다.");
      seen.add(key);
      return { key: key as EditorialCriterion["key"], status: status as EditorialCriterion["status"], evidence: text(item.evidence, "검수 근거", 500, 1) };
    });
  }
  loop.reviews.push({ round: (loop.reviews.at(-1)?.round || 0) + 1, summary: text(value.summary, "검수 요약", 1200, 1), criteria, issues, at: Date.now() });
  loop.reviews = loop.reviews.slice(-6);
}
