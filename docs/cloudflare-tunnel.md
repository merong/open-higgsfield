# 로컬 개발 서버 Cloudflare Tunnel 연결

2026-09-29 · 이 Mac의 현재 작업 디렉터리를 실행한다. 원격 배포 빌드가 아니다.

- 공개 주소: https://openhigsfield.oootool.com/
- 원본: http://127.0.0.1:3000 (development, 로컬 PGlite)
- 터널: `openhigsfield-local` / `fc7e620c-b8ba-4f07-90b5-57cb4917d9ed`
- DNS: 위 터널을 가리키는 CNAME을 `cloudflared tunnel route dns`로 생성.
- 설정: `~/.cloudflared/openhigsfield.yml`
- 비밀 자격증명: `~/.cloudflared/fc7e620c-b8ba-4f07-90b5-57cb4917d9ed.json` (저장소에 포함하지 않음)
- 준비 상태: `http://127.0.0.1:20318/ready` (로컬에서만 접근)

서버와 터널은 사용자 LaunchAgent로 실행한다. 로그인 시 시작하고 종료되면 다시 실행한다. Mac이 꺼지거나 잠들거나 네트워크가 끊기면 외부 연결도 사용할 수 없다. 동일 PGlite 저장소를 사용하는 별도 개발 서버를 중복 실행하지 않는다.

## 상태와 재시작

```sh
launchctl print gui/$(id -u)/com.oootool.openhigsfield.server
launchctl print gui/$(id -u)/com.oootool.openhigsfield.tunnel
curl http://127.0.0.1:20318/ready

launchctl kickstart -k gui/$(id -u)/com.oootool.openhigsfield.server
launchctl kickstart -k gui/$(id -u)/com.oootool.openhigsfield.tunnel
```

설정 파일은 `~/Library/LaunchAgents/com.oootool.openhigsfield.server.plist`와 `com.oootool.openhigsfield.tunnel.plist`. 로그는 프로젝트 `.data/logs/` 아래 같은 서비스 이름의 `.log` 파일에 기록한다. 다른 서비스의 터널/LaunchAgent는 변경하지 않았다.

## 중지와 다시 시작

```sh
launchctl bootout gui/$(id -u)/com.oootool.openhigsfield.tunnel
launchctl bootout gui/$(id -u)/com.oootool.openhigsfield.server

# 다시 시작
launchctl bootstrap gui/$(id -u) ~/Library/LaunchAgents/com.oootool.openhigsfield.server.plist
launchctl bootstrap gui/$(id -u) ~/Library/LaunchAgents/com.oootool.openhigsfield.tunnel.plist
```

bootout은 현재 로그인 세션의 실행을 중지한다. 향후 로그인 때도 시작하지 않게 하려면 해당 두 plist를 LaunchAgents 밖으로 옮긴다. DNS나 터널을 삭제하지 않아도 프로세스 중지만으로 원본 접속이 중단된다.

## 앱 설정과 관리자 접근

서버 LaunchAgent에 `PORT=3000`, `NEXT_PUBLIC_SITE_URL=https://openhigsfield.oootool.com`, `OHF_CLOUDFLARE_HOST=openhigsfield.oootool.com`을 설정했다. Next의 `allowedDevOrigins`에 정확한 공개 호스트를 추가했다.

기존 서버는 TCP 접속자가 loopback이면 로컬 관리자 IP로 판정했다. 터널도 loopback으로 연결하므로, 공개 호스트에서는 cloudflared가 전달한 `CF-Connecting-IP`를 검증하여 서명하도록 보완했다. 전제는 **cloudflared가 `httpHostHeader`를 위 공개 호스트로 고정**하고 loopback으로만 원본에 접속하는 것이다. 그 호스트에서 전달 IP가 없거나 잘못됐거나 소켓이 loopback이 아니면 관리자용 접속 증명은 실패한다. 일반 요청의 임의 forwarding 헤더는 신뢰하지 않는다.

외부 접속은 기존 관리자 IP 제한을 우회하지 않는다. 기본 설정에서 관리자는 이 Mac의 `http://localhost:3000`으로 접속한다. 공개 주소의 일반 사용자 로그인과 프로젝트 소유권 검사는 기존 정책을 사용한다. 관리자 허용 IP를 확대하지 않았다.

## 확인 결과

- 로컬 `/`와 공개 HTTPS `/`, `/login`: 200.
- 익명 `/projects`: 공개 주소 `/login`으로 307.
- 익명 개발 trace API: 401.
- 터널 readiness 200, 연결 4개. 두 LaunchAgent 상태 running.
- 실제 브라우저에서 스튜디오→로그인 이동, secure context true, 관측된 실패 정적 자산 없음.
- 접속 IP 분기 회귀 3개 통과, TypeScript 검사와 서버 문법 검사 통과.
- 실제 계정 로그인·유료 AI 생성은 이번 연결 검증에서 수행하지 않았다.

구성 참고: [Cloudflare 로컬 터널 생성](https://developers.cloudflare.com/tunnel/features/locally-managed-tunnels/create-local-tunnel/), [ingress 설정](https://developers.cloudflare.com/tunnel/features/locally-managed-tunnels/configuration-file/).
