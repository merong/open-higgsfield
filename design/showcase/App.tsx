import { useEffect, useState, type JSX } from "react";

import { Components } from "./sections/Components";
import { Screens } from "./sections/Screens";
import { Slides } from "./sections/Slides";
import { Tokens } from "./sections/Tokens";

const SECTIONS: {
  id: string;
  label: string;
  view: (props: { sub?: string }) => JSX.Element;
}[] = [
  { id: "tokens", label: "토큰", view: Tokens },
  { id: "components", label: "컴포넌트", view: Components },
  { id: "slides", label: "슬라이드", view: Slides },
  { id: "screens", label: "화면", view: Screens },
];

function useHash() {
  const read = () => location.hash.replace(/^#/, "");
  const [hash, setHash] = useState(read);
  useEffect(() => {
    const on = () => setHash(read());
    addEventListener("hashchange", on);
    return () => removeEventListener("hashchange", on);
  }, []);
  return hash;
}

export function App() {
  const [sectionId, sub] = useHash().split("/");
  useEffect(() => {
    window.scrollTo({ top: 0, left: 0 });
  }, [sectionId, sub]);
  const section = SECTIONS.find((s) => s.id === sectionId) ?? SECTIONS[0]!;
  const View = section.view;
  return (
    <div className="ohf sc-app">
      <nav className="sc-nav" aria-label="목차">
        <div className="sc-nav-brand">OpenHiggsfield Design</div>
        {SECTIONS.map((s) => (
          <a
            key={s.id}
            href={`#${s.id}`}
            className="sc-nav-link"
            aria-current={s.id === section.id ? "page" : undefined}
          >
            {s.label}
          </a>
        ))}
        <div className="sc-nav-foot">
          DESIGN SYSTEM · 0.2
          <br />
          사진과 문장, 그리고 도구.
          <br />
          OpenHiggsfield Studio
        </div>
      </nav>
      <main className="sc-main">
        <View sub={sub} />
      </main>
    </div>
  );
}
