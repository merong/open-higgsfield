"use client";
import { useEffect, useRef, useState } from "react";
import type { Project } from "@/projects/types";
import { landingHtml } from "@/render/landing";
export function LandingPreview({
  project,
  mobile,
}: {
  project: Project;
  mobile: boolean;
}) {
  const ref = useRef<HTMLDivElement>(null),
    [width, setWidth] = useState(480),
    target = mobile ? 375 : 1120;
  useEffect(() => {
    if (!ref.current) return;
    const observer = new ResizeObserver((entries) =>
      setWidth(entries[0].contentRect.width),
    );
    observer.observe(ref.current);
    return () => observer.disconnect();
  }, []);
  const scale = Math.min(1, width / target);
  return (
    <div ref={ref} className="ws-web-viewport">
      <iframe
        title={project.format === "product-detail" ? "제품 상세 페이지 미리보기" : "랜딩 페이지 미리보기"}
        sandbox="allow-same-origin"
        srcDoc={landingHtml(project, {}, "/fonts/PretendardVariable.woff2", true)}
        style={{
          width: target,
          height: 650 / scale,
          transform: `scale(${scale})`,
          transformOrigin: "top left",
          maxWidth: "none",
        }}
      />
    </div>
  );
}
