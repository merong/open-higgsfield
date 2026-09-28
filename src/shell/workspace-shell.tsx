"use client";
import {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Button, CreditBadge } from "@openhiggsfield/design";
import type { User } from "@/service/auth";
import { api } from "@/projects/api";
const SessionContext = createContext<{
  user: User | null;
  ready: boolean;
  refresh: () => Promise<void>;
}>({ user: null, ready: false, refresh: async () => {} });
export const useSession = () => useContext(SessionContext);
export function WorkspaceShell({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null),
    [ready, setReady] = useState(false);
  const path = usePathname();
  async function refresh() {
    try {
      const result = await api<{ user: User | null }>("session");
      setUser(result.user);
    } finally {
      setReady(true);
    }
  }
  useEffect(() => {
    void refresh().catch(() => {});
  }, [path]);
  return (
    <SessionContext.Provider value={{ user, ready, refresh }}>
      <div className="ohf workspace">
        <header className="ws-nav">
          <Link className="ws-brand" href="/projects">
            <span className="ws-mark">O</span>OpenHiggsfield{" "}
            <small>CREATE</small>
          </Link>
          <nav aria-label="주 메뉴">
            <Link href="/" aria-current={path === "/" ? "page" : undefined}>
              스튜디오
            </Link>
            <Link
              href="/projects"
              aria-current={path.startsWith("/projects") ? "page" : undefined}
            >
              프로젝트
            </Link>
            {user?.admin && <><Link href="/admin" aria-current={path.startsWith("/admin") ? "page" : undefined}>관리자</Link></>}
            <Link href="/help" aria-current={path.startsWith("/help") ? "page" : undefined}>도움말</Link>
            {process.env.NODE_ENV === "development" && user && <Link href="/dev/workflows" aria-current={path.startsWith("/dev/workflows") ? "page" : undefined}>워크플로우 관찰실</Link>}
          </nav>
          <div className="ws-nav-account">
            {user ? (
              <>
                <CreditBadge amount={user.credits} />
                <Link href="/account" aria-label={`마이페이지 · ${user.name}`}>{user.name}</Link>
              </>
            ) : (
              <Button href="/login" size="sm">
                로그인
              </Button>
            )}
          </div>
        </header>
        {children}
      </div>
    </SessionContext.Provider>
  );
}
