import type { Preset, Project, Slot } from "./types";

type TemplateSlide = Pick<Slot, "kind" | "title" | "body"> & Partial<Pick<Slot, "kicker" | "cta" | "composition" | "dim" | "crop">> & { image?: string; prompt?: string };
export interface CardTemplate {
  id: string;
  name: string;
  category: string;
  description: string;
  audience: string;
  preset: Preset;
  brand: string;
  artPrompt?: string;
  news?: { verifiedAt: string; sources: readonly { label: string; url: string }[] };
  slides: readonly TemplateSlide[];
}

/** Curated, editable examples. Preview and project creation share these exact slides. */
export const CARD_TEMPLATES: readonly CardTemplate[] = [
  {
    id: "daily-skincare", name: "여름의 스킨케어", category: "제품 소개", preset: "editorial", brand: "DAILY RITUAL",
    description: "제품의 첫인상부터 특징, 사용 순서까지 차분하게 소개하는 구성입니다.", audience: "새로운 제품을 살펴보는 고객",
    slides: [
      { kind: "cover", title: "여름을 가볍게\n나만의 루틴", body: "매일의 작은 순간을 위한 스킨케어", kicker: "DAILY ESSENTIALS", image: "/content/pool-editorial.jpg", composition: "split" },
      { kind: "body", title: "덜어내고,\n필요한 것만", body: "바쁜 아침에도 편안하게.\n내 피부에 맞는 제품으로\n간결한 루틴을 만들어 보세요.", image: "/content/sage-still-life.jpg", composition: "inset" },
      { kind: "list", title: "제품을 고를 때\n살펴볼 세 가지", body: "매일 사용하기 편한 제형\n피부에 맞는 성분과 사용법\n생활에 어울리는 용량과 패키지" },
      { kind: "body", title: "익숙한 일상에\n작은 여유를", body: "세안 후 피부 상태를 확인하고\n제품의 안내에 따라 사용하세요.\n새 제품은 소량부터 확인해 보세요.", image: "/content/sage-still-life.jpg", composition: "split" },
      { kind: "cta", title: "나의 루틴을\n완성할 시간", body: "브랜드의 제품 정보와 구매 안내를\n이곳에 더해 주세요.", cta: "제품 알아보기", image: "/content/pool-editorial.jpg", composition: "full", dim: 0.6 },
    ],
  },
  {
    id: "plant-guide", name: "처음 키우는 초록", category: "실용 가이드", preset: "soft", brand: "GREEN NOTES",
    description: "독자가 저장해 두고 따라 할 수 있는 체크리스트형 가이드입니다.", audience: "식물을 처음 키우는 사람",
    slides: [
      { kind: "cover", title: "식물과 함께\n사는 연습", body: "첫 반려식물을 위한 작은 가이드", kicker: "GREEN LIVING", image: "/content/thumbnails/fern-house.webp", composition: "split" },
      { kind: "body", title: "먼저,\n빛을 살펴요", body: "하루 동안 창가에 빛이 드는 시간을\n관찰해 보세요. 식물마다 좋아하는\n빛의 세기는 달라요.", image: "/content/thumbnails/greenhouse.webp", composition: "inset" },
      { kind: "list", title: "물을 주기 전\n확인할 것", body: "흙의 마른 정도 살펴보기\n잎과 줄기의 상태 관찰하기\n화분의 배수구 확인하기\n식물별 관리 방법 찾아보기" },
      { kind: "quote", title: "잘 키우는 시작은\n자주 살펴보는 것.", body: "오늘 발견한 변화를 한 줄로 기록해 보세요." },
      { kind: "cta", title: "오늘의 초록을\n기록해 보세요", body: "빛, 물, 새로 난 잎.\n작은 관찰이 나만의 가이드가 됩니다.", cta: "저장하고 다시 보기", image: "/content/thumbnails/fern-house.webp", composition: "split" },
    ],
  },
  {
    id: "maker-story", name: "손끝에서 시작된 이야기", category: "브랜드 스토리", preset: "editorial", brand: "FORM STUDIO",
    description: "만드는 사람의 철학과 과정을 사진과 짧은 문장으로 전합니다.", audience: "공방과 브랜드의 이야기가 궁금한 사람",
    slides: [
      { kind: "cover", title: "손끝에 남은\n시간의 모양", body: "일상의 그릇을 만드는 작은 공방", image: "/content/thumbnails/sculptor.webp", composition: "full", dim: 0.55 },
      { kind: "quote", title: "매일 손이 가는 물건을\n만들고 싶었습니다.", body: "FORM STUDIO · 브랜드 소개 예시" },
      { kind: "body", title: "하나의 형태가\n되기까지", body: "재료를 고르고, 모양을 잡고,\n표면을 다듬는 과정.\n작은 선택들이 하나의 물건이 됩니다.", image: "/content/thumbnails/sculptor.webp", composition: "split", crop: 70 },
      { kind: "list", title: "우리가 살피는 것", body: "손에 닿는 편안한 감촉\n일상에 자연스럽게 놓이는 형태\n오래 곁에 두고 싶은 쓰임" },
      { kind: "cta", title: "당신의 일상에\n놓일 이야기", body: "공방의 작업과 새로운 소식을\n브랜드 채널에서 만나 보세요.", cta: "공방 소식 보기", image: "/content/thumbnails/sculptor.webp", composition: "inset" },
    ],
  },
  {
    id: "night-market", name: "주말의 나이트 마켓", category: "행사 안내", preset: "impact", brand: "AFTER HOURS",
    description: "행사 분위기, 프로그램, 방문 정보를 빠르게 읽히게 정리합니다.", audience: "주말에 새로운 장소를 찾는 사람",
    slides: [
      { kind: "cover", title: "이번 주말,\n밤의 마켓", body: "취향이 모이는 작은 축제", kicker: "WEEKEND MARKET", image: "/content/thumbnails/neon-market.webp", composition: "full", dim: 0.65 },
      { kind: "list", title: "이런 시간을\n준비했어요", body: "취향을 발견하는 로컬 브랜드\n한 입씩 즐기는 푸드 부스\n분위기를 채우는 라이브 음악" },
      { kind: "metric", title: "해 질 무렵\n문을 열어요", kicker: "17:00", body: "운영 시간 예시 · 17:00–21:00\n실제 행사 일정에 맞춰 수정하세요." },
      { kind: "body", title: "방문 전에\n확인해 주세요", body: "날짜: 행사 날짜 입력\n장소: 행사장 이름과 주소 입력\n입장: 예약 또는 현장 입장 안내\n문의: 운영 채널 입력" },
      { kind: "cta", title: "주말의 약속,\n여기서 만나요", body: "함께 가고 싶은 사람에게\n이 소식을 공유해 주세요.", cta: "행사 정보 확인", image: "/content/thumbnails/neon-market.webp", composition: "full", dim: 0.65 },
    ],
  },
  {
    id: "coffee-compare", name: "취향으로 고르는 커피", category: "비교 설명", preset: "basic", brand: "COFFEE LETTER",
    description: "두 가지 선택지를 비교하고 독자가 자신에게 맞는 답을 찾도록 돕습니다.", audience: "커피 취향을 알아가는 사람",
    slides: [
      { kind: "cover", title: "오늘의 커피,\n어떻게 마실까요?", body: "필터 커피와 에스프레소 사이", kicker: "FIND YOUR TASTE", image: "/content/thumbnails/espresso.webp", composition: "split" },
      { kind: "compare", title: "추출 방식의 차이", body: "필터 커피:필터를 거쳐 천천히 내리는 방식\n에스프레소:압력을 이용해 짧게 추출하는 방식" },
      { kind: "compare", title: "오늘 끌리는 쪽은?", body: "필터 커피:향을 살피며 한 잔을 천천히\n에스프레소:농축된 한 모금 또는 우유와 함께" },
      { kind: "list", title: "내 취향을 찾는\n작은 실험", body: "같은 원두를 다른 방식으로 마셔보기\n설탕이나 우유를 넣기 전 맛보기\n좋았던 향과 느낌을 기록하기" },
      { kind: "cta", title: "정답 대신,\n나의 취향", body: "원두와 추출에 따라 맛은 달라져요.\n오늘 좋아한 한 잔을 기억해 보세요.", cta: "저장하고 골라 보기", image: "/content/thumbnails/espresso.webp", composition: "inset" },
    ],
  },
  {
    id: "github-trending", name: "GitHub 트렌딩 브리핑", category: "GitHub 트렌딩", preset: "impact", brand: "OPEN SOURCE RADAR",
    artPrompt: "Editorial sculpture of a branching git commit graph, matte black metal rods and lime glass nodes on charcoal, forks and merges, open source collaboration. Refined studio lighting, tactile materials. No text, no logos.",
    description: "주목할 저장소 두 곳과 활용 포인트를 소개하는 개발자 뉴스입니다.", audience: "새로운 오픈소스와 AI 도구를 찾는 개발자",
    news: { verifiedAt: "2026-09-20", sources: [
      { label: "GitHub Trending · Today", url: "https://github.com/trending" },
      { label: "Cloudflare · security-audit-skill", url: "https://github.com/cloudflare/security-audit-skill" },
      { label: "Cua · computer-use", url: "https://github.com/trycua/cua" },
    ] },
    slides: [
      { kind: "cover", title: "지금 주목할\n오픈소스 AI", body: "GitHub 트렌딩에서 고른 두 프로젝트\n2026.09.20 기준", kicker: "GITHUB / DAILY PICKS", image: "/content/ai-github.png", dim: 0.55 },
      { kind: "body", title: "코드 보안 점검을\n에이전트와 함께", body: "Cloudflare · security-audit-skill\n코드를 조사하고 발견 사항을 검증하는\n다단계 보안 감사 스킬입니다.\n검증 결과를 구조화된 기록으로 남깁니다." },
      { kind: "body", title: "화면을 다루는\nAI를 만들다", body: "trycua / cua\n컴퓨터 사용 에이전트를 위한\n오픈소스 드라이버와 실행 환경,\n학습·평가 도구를 제공합니다.", image: "/content/ai-github.png", composition: "inset" },
      { kind: "list", title: "도입 전\n읽어볼 세 가지", body: "README에서 목적과 실행 조건 확인\n라이선스와 최근 변경 사항 살펴보기\n작은 테스트 환경에서 동작 검증", kicker: "EDITOR'S CHECKLIST" },
      { kind: "cta", title: "별표 너머의\n쓰임을 찾으세요", body: "출처: GitHub Trending · 각 저장소\n2026.09.20 확인 · 순위는 변동됩니다.\n원문 링크는 캡션에서 확인하세요.", cta: "저장소 살펴보기", image: "/content/ai-github.png", dim: 0.65 },
    ],
  },
  {
    id: "openai-gpt-update", name: "OpenAI GPT 업데이트", category: "OpenAI · GPT", preset: "soft", brand: "MODEL NOTES",
    artPrompt: "Editorial still life of interlocking translucent glass rings around an opal light core, layered ivory documents on a pale mint plinth. Reasoning and knowledge work. Architectural calm, soft daylight. No text, no logos.",
    description: "GPT의 새 기술과 ChatGPT의 변화를 핵심 기능과 활용 관점으로 정리합니다.", audience: "GPT의 새로운 기능을 업무에 활용하려는 사람",
    news: { verifiedAt: "2026-09-20", sources: [
      { label: "OpenAI · ChatGPT Release Notes (9/3, 9/8)", url: "https://help.openai.com/en/articles/6825453-chatgpt-release-notes" },
    ] },
    slides: [
      { kind: "cover", title: "GPT의 다음 장,\n일을 완성하는 AI", body: "GPT-6 Astra와 이미지 도구의 변화\n2026.09.20 기준", kicker: "OPENAI / UPDATE", image: "/content/ai-openai.png", composition: "split" },
      { kind: "body", title: "복잡한 작업을\n이어 가는 추론", body: "9월 3일 발표된 GPT-6 Astra.\n코딩, 연구, 컴퓨터 사용과\n여러 단계의 작업 능력을 개선했습니다.\n발표 당시 제한된 조직부터 제공됩니다." },
      { kind: "list", title: "어떤 작업에\n활용할 수 있나요?", body: "주어진 양식에 맞는 문서 작성\n스프레드시트와 발표 자료 제작\n진행 중 추가된 요구에 맞춰 작업 조정", kicker: "GPT-6 ASTRA" },
      { kind: "body", title: "이미지도 더\n세밀하게 다듬다", body: "9월 8일 공개된 ChatGPT Images 2.5.\n디테일, 편집 정확도, 생성 속도를\n개선하고 템플릿과 스케치 기반\n제작 방식을 추가했습니다.", image: "/content/ai-openai.png", composition: "inset" },
      { kind: "cta", title: "내 작업에서\n변화를 확인하세요", body: "출처: OpenAI 릴리스 노트\n2026.09.20 확인 · 제공 범위 확인 필요\n원문 링크는 캡션에 담았습니다.", cta: "업데이트 확인하기", image: "/content/ai-openai.png", composition: "split" },
    ],
  },
  {
    id: "claude-update", name: "Claude 기능 업데이트", category: "Anthropic · Claude", preset: "editorial", brand: "CLAUDE JOURNAL",
    artPrompt: "Editorial sculpture of terracotta branching pathways with folded ivory paper planes and tiny brass joints on a sandstone desk. A metaphor for an assistant planning and executing steps. Warm afternoon light. No text, no logos.",
    description: "새 모델의 변화와 제공 범위를 구분해 설명하는 업데이트 카드뉴스입니다.", audience: "Claude를 사용하는 개발자와 지식 근로자",
    news: { verifiedAt: "2026-09-20", sources: [
      { label: "Anthropic · Claude Fable 5.1 & Mythos 5.1", url: "https://www.anthropic.com/claude-fable-and-mythos-5-1" },
    ] },
    slides: [
      { kind: "cover", title: "Claude,\n무엇이 달라졌나", body: "Fable 5.1 · Mythos 5.1 업데이트\n2026.09.20 기준", kicker: "ANTHROPIC / RELEASE NOTES", image: "/content/ai-claude.png", composition: "split" },
      { kind: "body", title: "긴 작업을\n풀어내는 능력", body: "Anthropic은 9월 Fable 5.1을 공개하며\n코딩과 지식 업무, 장시간 문제 해결\n성능의 개선을 발표했습니다.\n내 업무에서 결과를 비교해 보세요." },
      { kind: "compare", title: "두 모델의\n제공 범위", body: "Fable 5.1:일반 제공 모델. Claude API와 주요 클라우드에서 사용\nMythos 5.1:검증된 보안·생명과학 전문가 대상 접근 프로그램" },
      { kind: "list", title: "업데이트 후\n확인할 설정", body: "Claude Code 기본 추론 강도는 High\nCowork·Claude.ai 기본값은 Medium\n작업 난이도에 맞춰 결과와 비용 비교" },
      { kind: "cta", title: "내 워크플로우에\n맞춰 살펴보세요", body: "출처: Anthropic 공식 발표\n2026.09.20 확인 · 제공 조건은 원문 참고\n원문 링크는 캡션에 담았습니다.", cta: "변경 사항 확인", image: "/content/ai-claude.png", composition: "split" },
    ],
  },
  {
    id: "ai-news-briefing", name: "AI 뉴스 브리핑", category: "AI 뉴스 · 이슈", preset: "basic", brand: "AI SIGNAL",
    artPrompt: "Editorial still life of cobalt glass sound-wave fins crossing a brushed aluminum circular speaker and one clear glass orb. Voice communication, midnight blue, soft spotlight, beautiful caustics. No text, no logos.",
    description: "새로운 AI 소식을 핵심 변화, 비교, 활용 아이디어로 풀어내는 뉴스 구성입니다.", audience: "AI 업계의 새로운 흐름을 빠르게 이해하고 싶은 사람",
    news: { verifiedAt: "2026-09-20", sources: [
      { label: "Google · Gemini 3.8 Live (9/17 업데이트)", url: "https://blog.google/innovation-and-ai/models-and-research/gemini-models/gemini-3-8-live-gemini-3-8-live-extended-thinking/" },
    ] },
    slides: [
      { kind: "cover", title: "듣고, 생각하고,\n대화하는 AI", body: "Gemini 3.8 Live로 읽는 음성 AI의 변화\n2026.09.20 기준", kicker: "AI NEWS / VOICE AGENTS", image: "/content/ai-news.png", dim: 0.55 },
      { kind: "body", title: "음성 에이전트에\n추론을 더하다", body: "Google은 두 가지 새 음성 모델로\n거의 실시간에 가까운 추론과\n더 자연스러운 AI 대화를\n지원한다고 발표했습니다.", image: "/content/ai-news.png", composition: "inset" },
      { kind: "compare", title: "두 모델,\n서로 다른 초점", body: "3.8 Live:규모와 비용 효율, 유연한 대화와 시각 정보 활용\nExtended Thinking:복잡한 과제와 여러 단계의 추론" },
      { kind: "list", title: "활용 아이디어\n세 가지 장면", body: "제품을 보여 주며 사용법 묻기\n여러 단계의 업무를 음성으로 설명하기\n복잡한 문제를 대화로 나눠 풀기" },
      { kind: "cta", title: "새로운 소식,\n맥락까지 읽으세요", body: "출처: Google 공식 블로그\n2026.09.20 확인 · 원문 9.17 업데이트\n원문 링크는 캡션에서 확인하세요.", cta: "AI 소식 저장하기", image: "/content/ai-news.png", dim: 0.65 },
    ],
  },
];

export function cardTemplatePreview(template: CardTemplate): Project {
  return {
    id: `template-${template.id}`, format: "card-news", title: template.name,
    brief: { topic: template.name, audience: template.audience, tone: template.news ? "expert" : "calm", count: template.slides.length, mustInclude: template.slides.map(s => s.title.replaceAll("\n", " ")).join("\n") },
    preset: template.preset, ratio: "4:5", brand: template.brand, modelId: "soul-2",
    caption: `${template.name}\n\n${template.description}${template.news ? `\n\n확인 기준일: ${template.news.verifiedAt}\n작성 당시의 공식 자료를 정리한 예시입니다. 자동 갱신되지 않으므로 게시 전 원문과 제공 조건을 확인해 주세요.\n\n출처\n${template.news.sources.map(source => `${source.label}\n${source.url}`).join("\n\n")}` : ""}\n\n#카드뉴스${template.news ? " #AI트렌드" : ""}`,
    createdAt: 0, updatedAt: 0, version: 1,
    slots: template.slides.map((s, index) => ({
      id: `${template.id}-${index}`, kind: s.kind, title: s.title, body: s.body,
      kicker: s.kicker ?? "", cta: s.cta ?? "", href: "", duration: 4, trim: 0,
      composition: s.composition ?? "full", dim: s.dim ?? 0.5, crop: s.crop ?? 50,
      prompt: s.prompt ?? template.artPrompt ?? `${template.name}. Editorial photography, natural light, refined detail. No text, no logos.`,
      ...(s.image ? { media: { kind: "image" as const, url: s.image, name: `${template.name} 예시 이미지` } } : {}),
    })),
  };
}

export function createCardTemplateProject(templateId: string, title?: string): Project {
  const template = CARD_TEMPLATES.find(t => t.id === templateId);
  if (!template) throw new Error("카드뉴스 템플릿을 찾을 수 없습니다.");
  const preview = cardTemplatePreview(template);
  const now = Date.now();
  return { ...preview, id: crypto.randomUUID(), title: title?.trim() || template.name,
    createdAt: now, updatedAt: now,
    slots: preview.slots.map(s => ({ ...s, id: crypto.randomUUID() })),
  };
}
