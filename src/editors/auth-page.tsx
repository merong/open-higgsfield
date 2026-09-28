"use client";
import { useEffect, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { Alert, Button, Field, Input, Segment } from "@openhiggsfield/design";
import { api } from "@/projects/api";
import { useSession } from "@/shell/workspace-shell";
export function AuthPage() {
  const [mode, setMode] = useState("login"),
    [busy, setBusy] = useState(false),
    [error, setError] = useState("");
  const [ready, setReady] = useState(false);
  useEffect(() => setReady(true), []);
  const router = useRouter(),
    session = useSession();
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setError("");
    const data = Object.fromEntries(new FormData(event.currentTarget));
    try {
      const result = await api<{user:{admin:boolean}}>(`auth/${mode}`, { method: "POST", body: JSON.stringify(data) });
      await session.refresh();
      router.push(result.user.admin ? "/admin" : "/projects");
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <main className="ws-auth">
      <section className="ws-auth-story">
        <span className="ws-eyebrow">YOUR NEXT STORY</span>
        <h1>
          한 가지 아이디어,
          <br />세 가지 가능성.
        </h1>
        <p>
          카드뉴스, 짧은 영상, 그리고 브랜드를 담은 한 페이지.
          <br />
          시작부터 마지막 결과물까지 한곳에서 만드세요.
        </p>
        <img
          src="/content/pool-editorial.jpg"
          alt="빛이 비치는 수영장 옆의 스킨케어 제품"
        />
      </section>
      <form method="post" onSubmit={submit} className="ws-form">
        <h2>
          {mode === "login"
            ? "다시, 이어서 만들어요"
            : "당신의 작업실을 만드세요"}
        </h2>
        <p className="ws-muted">
          프로젝트를 계정에 저장하고 어느 화면에서든 이어서 편집하세요.
        </p>
        <Segment
          aria-label="계정 시작"
          items={[
            { id: "login", label: "로그인" },
            { id: "register", label: "회원가입" },
          ]}
          value={mode}
          onChange={setMode}
          plate
        />
        {mode === "register" && (
          <Field label="이름" htmlFor="name">
            <Input
              id="name"
              name="name"
              required
              maxLength={50}
              autoComplete="name"
            />
          </Field>
        )}
        <Field label={mode === "login" ? "아이디 또는 이메일" : "이메일"} htmlFor="email">
          <Input
            id="email"
            name="email"
            type={mode === "login" ? "text" : "email"}
            required
            autoComplete="username"
            maxLength={254}
          />
        </Field>
        <Field
          label="비밀번호"
          htmlFor="password"
          hint={mode === "register" ? "10자 이상으로 설정하세요." : undefined}
        >
          <Input
            id="password"
            name="password"
            type="password"
            required
            minLength={mode === "register" ? 10 : 1}
            maxLength={128}
            autoComplete={
              mode === "register" ? "new-password" : "current-password"
            }
          />
        </Field>
        {error && <Alert>{error}</Alert>}
        <Button type="submit" variant="primary" size="lg" loading={busy} disabled={!ready}>
          {mode === "register" ? "작업실 만들기" : "로그인"}
        </Button>
        <p className="ws-muted">
          편집과 내보내기는 무료입니다. AI 생성에는 관리자가 충전한 크레딧을
          사용합니다.
        </p>
      </form>
    </main>
  );
}
