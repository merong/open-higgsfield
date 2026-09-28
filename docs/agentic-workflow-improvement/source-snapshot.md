# 관찰한 소스 버전

2026-09-28 · 작업 트리 파일 해시. 미추적 파일을 포함한 설계 근거 버전이며 코드 실행 증거가 아니다.

| 파일 | SHA-256 |
| --- | --- |
| `src/service/db.ts` | `e7bacc5571f75e8a489bfa8b770467998d49c6b9cdf84c7da042176e05ee024f` |
| `src/service/projects.ts` | `cf2e4ecafd736f7fa4f69599c2923f7e342eb0490a0bea22a8b983557d715192` |
| `src/service/landing-workflow.ts` | `d1fba0ac9ccd65fafff52963e26685afd1861b6f3b1e2bdab7816a7b0972a6b5` |
| `src/service/landing-model.ts` | `d83150cff1776c75da36a512408e7b52d507cb9f1cc06edfaf0f5aeaef2c695a` |
| `src/service/card-workflow.ts` | `bab67788c9c29659f196bedbe7b0e3e4b18ef3fb850b8835d90eb38cab52ed2f` |
| `src/service/card-agent.ts` | `77303f94a8791c241905dc85a7a5f5563e4d8d103476d43a50fdb733019b92e7` |
| `src/service/card-agent-provider.ts` | `695b8e2d380df9c09e992481952ebc92b2acb523ae3c36653bfec2999ccc5809` |
| `src/service/reel-workflow.ts` | `33da82c896b9bd430c22d8261040b93859799c60d204f52a05dbc4c8c9552d57` |
| `src/service/reel-model.ts` | `cc5e5f6beaed8d73c027142557dcf86ca54478f5e4d3a59da3bcb9c55b984a5c` |
| `src/service/outline.ts` | `6c43c2333d51281ab5b44a6aa33151f33fd83528247039b3cc26f33f1ab3433a` |
| `src/service/workflow-model.ts` | `31b3b0b32cd53062f67000073547ae3b4660c72fea386e84ad5c95c19c7b69a3` |
| `src/service/generation.ts` | `fbfd4ce3e51ef010e18f3763f40045ae969e252e6ed70b9e503c49f4c4d32978` |
| `src/service/landing-images.ts` | `e23f968f4019bd291b4550614e8f2dd21a503e1c734f498cae9dda3a35454cdf` |
| `src/service/reel-media.ts` | `e2a5bc267a601ca097654c16bd07b4535b5fa870f471db7f245b75ab4dbb7a33` |
| `src/service/reel-render.ts` | `c439dc7003c2b6b7d357fe981756d4a18266fb58098f818b6c4c854e47b7b8dd` |
| `package.json` | `a7ec3df438549070b3d50ded08362fb7afce13874264a6774d6cc90b8afebe78` |

서비스 소스의 직접 projects INSERT는 projects, landing-workflow, card-workflow, reel-workflow, outline, card-agent의 6곳에서 확인했다. 라우트·seed/import가 이를 재사용하는지까지 구현 때 추적한다. 이 목록은 새 생성 경로 추가 시 갱신해야 한다.
