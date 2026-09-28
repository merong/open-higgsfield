"use client";
import { useEffect, useRef, useState } from "react";
import { api, ApiError } from "@/projects/api";
import type { Project } from "@/projects/types";
export function useProject(initial: Project) {
  const [project, setView] = useState(initial),
    [status, setStatus] = useState("저장됨"),
    [error, setError] = useState("");
  const live = useRef(initial),
    version = useRef(initial.version),
    dirty = useRef(false),
    blocked = useRef(false),
    flight = useRef<Promise<void> | null>(null),
    timer = useRef<ReturnType<typeof setTimeout> | null>(null),
    mounted = useRef(true);
  function flush(): Promise<void> {
    if (flight.current) return flight.current;
    if (blocked.current)
      return Promise.reject(new Error("저장 충돌을 해결해 주세요."));
    if (!dirty.current) return Promise.resolve();
    const task = (async () => {
      while (dirty.current && !blocked.current) {
        dirty.current = false;
        const snapshot = { ...live.current, version: version.current };
        if (mounted.current) setStatus("저장 중…");
        try {
          const saved = await api<Project>(`projects/${snapshot.id}`, {
            method: "PUT",
            body: JSON.stringify(snapshot),
            keepalive:
              new TextEncoder().encode(JSON.stringify(snapshot)).length < 60000,
          });
          version.current = saved.version;
          live.current = {
            ...live.current,
            version: saved.version,
            updatedAt: saved.updatedAt,
          };
          if (mounted.current) {
            setView(live.current);
            setStatus(dirty.current ? "저장 중…" : "저장됨");
            setError("");
          }
        } catch (e) {
          dirty.current = true;
          blocked.current = e instanceof ApiError && e.status === 409;
          if (mounted.current) {
            setError((e as Error).message);
            setStatus(blocked.current ? "저장 충돌" : "저장 실패");
          }
          throw e;
        }
      }
    })().finally(() => {
      flight.current = null;
    });
    flight.current = task;
    return task;
  }
  function edit(update: (p: Project) => Project) {
    live.current = update(live.current);
    dirty.current = true;
    setView(live.current);
    setStatus("변경 사항 저장 대기");
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => {
      void flush().catch(() => {});
    }, 650);
  }
  useEffect(() => {
    mounted.current = true;
    const warn = (e: BeforeUnloadEvent) => {
      if (dirty.current || flight.current) {
        e.preventDefault();
        e.returnValue = "";
      }
    };
    window.addEventListener("beforeunload", warn);
    return () => {
      mounted.current = false;
      window.removeEventListener("beforeunload", warn);
      if (timer.current) clearTimeout(timer.current);
      void flush().catch(() => {});
    };
  }, []);
  function replace(saved: Project) {
    if (dirty.current || flight.current) throw new Error("저장 중인 변경이 있습니다. 새로고침해 주세요.");
    live.current = saved; version.current = saved.version; setView(saved); setStatus("저장됨"); setError("");
  }
  return { project, edit, flush, replace, status, error };
}
