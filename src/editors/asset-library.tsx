"use client";
import { useEffect, useRef, useState } from "react";
import {
  Alert,
  AssetCard,
  Button,
  Dialog,
  EmptyState,
  SearchField,
} from "@openhiggsfield/design";
import { api } from "@/projects/api";
import { loadHistory } from "@/openhiggsfield/history";
import { loadUploads } from "@/openhiggsfield/uploads";
import type { Media } from "@/projects/types";
interface Asset {
  url: string;
  name: string;
  mime: string;
}
export function AssetLibrary({
  video,
  onSelect,
  onClose,
}: {
  video: boolean;
  onSelect: (media: Media) => void;
  onClose: () => void;
}) {
  const [assets, setAssets] = useState<Asset[]>([]),
    [query, setQuery] = useState(""),
    [error, setError] = useState(""),
    [busy, setBusy] = useState(false);
  const input = useRef<HTMLInputElement>(null);
  useEffect(() => {
    Promise.all([api<Asset[]>("assets"), loadHistory(), loadUploads()])
      .then(([stored, history, uploads]) =>
        setAssets([
          ...stored,
          ...history
            .filter((h) => h.status === "completed")
            .flatMap((h) =>
              h.urls.map((url) => ({
                url,
                name: h.prompt,
                mime: `${h.kind}/unknown`,
              })),
            ),
          ...uploads.map((a) => ({
            url: a.url,
            name: a.name,
            mime: `${a.kind}/unknown`,
          })),
          {
            url: "/content/pool-editorial.jpg",
            name: "여름의 빛 · 예시 이미지",
            mime: "image/jpeg",
          },
          {
            url: "/content/sage-still-life.jpg",
            name: "세이지 스튜디오 · 예시 이미지",
            mime: "image/jpeg",
          },
        ]),
      )
      .catch((e) => setError(e.message));
  }, []);
  async function upload(file: File) {
    setBusy(true);
    setError("");
    try {
      const form = new FormData();
      form.append("file", file);
      const asset = await api<Asset>("assets", { method: "POST", body: form });
      onSelect({
        url: asset.url,
        name: asset.name,
        kind: asset.mime.startsWith("video/") ? "video" : "image",
      });
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  const filtered = assets.filter(
    (a, i, all) =>
      all.findIndex((b) => b.url === a.url) === i &&
      (a.mime.startsWith("image/") || (video && a.mime.startsWith("video/"))) &&
      a.name.toLowerCase().includes(query.toLowerCase()),
  );
  return (
    <Dialog
      open
      title="에셋 라이브러리"
      closeLabel="닫기"
      onClose={onClose}
      width={760}
    >
      <div className="ws-toolbar">
        <SearchField
          label="에셋 검색"
          value={query}
          onValueChange={setQuery}
          clearLabel="검색 지우기"
          placeholder="이름으로 찾기"
        />
        <Button onClick={() => input.current?.click()} loading={busy}>
          파일 업로드
        </Button>
        <input
          hidden
          ref={input}
          type="file"
          accept={
            video
              ? "image/png,image/jpeg,image/webp,image/gif,video/mp4,video/webm"
              : "image/png,image/jpeg,image/webp,image/gif"
          }
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) void upload(file);
            e.target.value = "";
          }}
        />
      </div>
      <p className="ws-muted">
        내 계정의 파일과 이 브라우저의 스튜디오 에셋을 선택하세요. 최대 50MB.
      </p>
      {error && <Alert>{error}</Alert>}
      <div className="ws-assets">
        {filtered.map((a) => (
          <AssetCard
            key={a.url}
            src={a.mime.startsWith("image/") ? a.url : undefined}
            title={a.name}
            meta={a.mime.startsWith("video/") ? "영상" : "이미지"}
            onClick={() =>
              onSelect({
                url: a.url,
                name: a.name,
                kind: a.mime.startsWith("video/") ? "video" : "image",
              })
            }
          />
        ))}
      </div>
      {!filtered.length && (
        <EmptyState
          title="선택할 에셋이 없어요"
          description="파일을 업로드하거나 스튜디오에서 생성해 보세요."
        />
      )}
    </Dialog>
  );
}
