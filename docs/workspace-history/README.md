# Desktop 작업 통합 기록

2026-09-29: 기존 ChatGPT Desktop 작업의 미커밋 파일을 앱 저장소로 통합한다.

- 앱 소스·테스트·QA 문서와 결과 자산, 번들된 디자인 패키지: 기존 작업 디렉터리 내용.
- `design/`: 상위 작업 폴더의 독립 디자인 시스템 저장소에서 tracked/untracked 작업 파일을 가져왔다. 원본 저장소 HEAD는 `cee071a`였고 별도 remote는 없었다. 원래 형제 폴더와 Git 이력은 로컬에 그대로 유지한다. 이 저장소에는 현재 소스·자산·검토 자료가 포함되며 중첩 `.git`은 넣지 않는다.
- `docs/reference/open-design/`: 저장소 밖에 있던 분석·인터뷰·도입 리뷰 문서.
- `docs/superpowers/`: 저장소 밖에 있던 설계 명세·계획.
- [상위 CLAUDE 지침의 당시 원본](parent-CLAUDE-20260929.md): 과거 아키텍처 기록이며 현재 개발 지침이 아니다. 현재 구현과 다른 내용이 있다.
- [디자인 작업 세션 기록](design-session-history.zip): 상위 `.superpowers/`의 작업 지시·리뷰·중간 소스 스냅샷 1,810개 파일. 과거 자료 보관용이며 현재 빌드 입력이 아니다.

디자인 시스템은 `cd design && corepack pnpm install --frozen-lockfile` 후 `corepack pnpm test`, `corepack pnpm build`로 검증한다. 앱 루트의 `corepack pnpm design:sync`는 이제 이 저장소의 `design/dist`를 `vendor/design/dist`로 복사한다. 앱 TypeScript 검사는 독립 디자인 패키지를 제외하며 해당 패키지에서 별도 검사한다. 기존 앱 실행은 커밋된 `vendor/design/dist`를 사용하므로 디자인 빌드를 먼저 할 필요는 없다.

`.data/`, `.env` 및 로컬 비밀값, `node_modules`, `.next`, 디자인 빌드 캐시는 제외한다. Cloudflare의 실제 자격증명·LaunchAgent는 사용자 홈에 남고 저장소에는 운영 방법과 앱 설정 코드만 포함한다. 실행 중인 서버의 DB는 커밋하거나 자동 테스트에 사용하지 않는다. 브라우저 QA는 실행 중인 앱에 접속하여 별도 이름의 검증 프로젝트를 생성했다.

## 통합 시 검증

- 앱 테스트: `env -u DATABASE_URL NODE_ENV=test LOCAL_DATABASE_DIR=memory:// node --import tsx --test test/*.test.ts` — 160/160 통과.
- 앱 TypeScript: `tsc --noEmit --incremental false` 통과.
- 디자인 패키지: 테스트 101/101, 타입 검사, 빌드 통과. 새 번들은 기존 `vendor/design/dist`와 동일했다.
- 앱 프로덕션 빌드: 별도 임시 복사본에 `corepack pnpm install --frozen-lockfile --offline` 후 빌드 통과. 실행 중인 개발 서버의 `.next`나 DB를 건드리지 않았다.
- [Ego Lite 데모 계정 브라우저 검증](../qa/demo-20260929/README.md): 실제 저장·내보내기 및 화면 진입 확인. 유료 AI 생성은 별도 검증 대상이다.

가져온 과거 소스·로그·폰트 라이선스에는 기존 EOF 공백과 줄 끝 공백이 있다. `git diff --cached --check`는 이 공백을 보고하며, 기록 보존을 위해 일괄 포맷 변경은 하지 않았다. 스테이징된 텍스트 및 ZIP 내부 텍스트 2,611개 항목의 고신뢰 자격증명 패턴 검사에서 검출된 파일은 없었다.
