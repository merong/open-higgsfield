import { Button, Dialog } from "@/index";
import { PlusIcon, SparkleIcon } from "@/index";

export function CreditsModal() {
  return (
    <div style={{ width: "100%", maxWidth: 520, padding: 20 }}>
      <Dialog
        open
        inline
        title="크레딧이 부족합니다"
        onClose={() => {
          location.hash = "screens/projects";
        }}
        closeLabel="닫기"
        width={480}
        head={<span className="sc-muted">남은 3장 · 12 크레딧 필요</span>}
      >
        <div className="sc-row-3" style={{ gap: 8 }}>
          <div className="sc-stat">
            <span className="sc-muted">필요</span>
            <b>12</b>
          </div>
          <div className="sc-stat">
            <span className="sc-muted">잔액</span>
            <b>4</b>
          </div>
          <div className="sc-stat sc-stat--danger">
            <span style={{ fontSize: 11 }}>부족</span>
            <b>8</b>
          </div>
        </div>
        <span className="sc-muted">
          지금은 1장만 생성할 수 있습니다. 나머지는 충전한 뒤 이어서 생성할 수
          있고, 문구 편집과 내보내기는 계속 됩니다.
        </span>
        <div className="sc-cell">
          <Button disabled size="lg" icon={<SparkleIcon />} style={{ flex: 1 }}>
            1장만 생성 · 4 크레딧
          </Button>
          <Button
            href="#screens/account"
            variant="primary"
            size="lg"
            icon={<PlusIcon />}
            style={{ flex: 1 }}
          >
            충전하기
          </Button>
        </div>
      </Dialog>
    </div>
  );
}
