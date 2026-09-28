import { Chip } from "@/index";

import { Account } from "../screens/Account";
import { CreditsModal } from "../screens/CreditsModal";
import {
  EditorExport,
  EditorGenerating,
  EditorOutline,
  EditorStyle,
} from "../screens/Editors";
import { NewProject } from "../screens/NewProject";
import { Phone } from "../screens/Phone";
import { Projects } from "../screens/Projects";
import { Styles } from "../screens/Styles";
import { Templates } from "../screens/Templates";

const SCREENS = [
  { id: "projects", label: "프로젝트 목록", view: Projects },
  { id: "new", label: "새 프로젝트", view: NewProject },
  { id: "account", label: "계정 · 크레딧", view: Account },
  { id: "editor-outline", label: "편집기 ① 구성안", view: EditorOutline },
  {
    id: "editor-generating",
    label: "편집기 ② 생성 중",
    view: EditorGenerating,
  },
  { id: "editor-style", label: "편집기 ③ 스타일", view: EditorStyle },
  { id: "editor-export", label: "편집기 ④ 내보내기", view: EditorExport },
  { id: "phone", label: "휴대폰 미리보기", view: Phone },
  { id: "templates", label: "템플릿 5종", view: Templates },
  { id: "styles", label: "스타일 4종", view: Styles },
  { id: "credits", label: "크레딧 부족 모달", view: CreditsModal },
];

export function Screens({ sub }: { sub?: string }) {
  const screen = SCREENS.find((s) => s.id === sub) ?? SCREENS[0]!;
  const View = screen.view;
  return (
    <>
      <h1 className="sc-h1">화면</h1>
      <p className="sc-lead">
        프로젝트 탐색부터 슬라이드 편집까지. 검색, 선택, 문구와 스타일 변경을
        직접 확인해 보세요.
      </p>
      <div className="sc-toolbar">
        {SCREENS.map((s) => (
          <Chip
            key={s.id}
            pressed={s.id === screen.id}
            onClick={() => {
              location.hash = `screens/${s.id}`;
            }}
          >
            {s.label}
          </Chip>
        ))}
      </div>
      <div className="sc-frame">
        <View />
      </div>
    </>
  );
}
