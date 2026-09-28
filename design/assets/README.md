# 생성 이미지

2026-09-19 디자인 시스템 쇼케이스용으로 내장 ImageGen 도구에서 생성했다. 실제 브랜드·제품 사진이 아닌 가상의 스킨케어 정물이다. 외부 원본 사진이나 로고는 사용하지 않았다.

| 자산              | 원본                            | 쇼케이스 배포 파일                     |
| ----------------- | ------------------------------- | -------------------------------------- |
| 수영장 에디토리얼 | `generated/pool-editorial.png`  | `../public/images/pool-editorial.jpg`  |
| 세이지 정물       | `generated/sage-still-life.png` | `../public/images/sage-still-life.jpg` |

생성 요청의 주요 시각 명세:

1. Portrait editorial skincare still life, unbranded ivory skincare tube on travertine beside an aqua swimming pool, ivory linen, refined natural sunlight, believable material detail, restrained premium photography, no text, no logos.
2. Portrait premium skincare still life, unbranded ivory cosmetic bottles on sage green tile, soft towel and a glass, warm directional sunlight and gentle shadows, realistic editorial photography, no text, no logos.

위 명세는 생성 프롬프트의 핵심 내용을 정리한 것이다. 원본은 PNG로 보관하고 macOS `sips` JPEG quality 85로 최적화했다. UI는 `showcase/data.ts`에서 Vite BASE_URL 기준의 로컬 파일을 참조한다.

생성 도구 원본 파일 ID:

- `exec-631d4e03-34bc-4cc4-af1b-2c9010bc21e5.png`
- `exec-972a29fb-1052-44b5-a409-103d0ff948c1.png`
