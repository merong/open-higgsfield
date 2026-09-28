import type { Project } from "@/projects/types";
import { filename, rasterize } from "./export";
function mediaReady(media: HTMLMediaElement) {
  return new Promise<void>((resolve, reject) => {
    if (media.readyState >= 2) {
      resolve();
      return;
    }
    const timer = setTimeout(
      () => done(new Error("미디어를 불러오는 시간이 초과되었습니다.")),
      20000,
    );
    const done = (error?: Error) => {
      clearTimeout(timer);
      media.onloadeddata = null;
      media.onerror = null;
      error ? reject(error) : resolve();
    };
    media.onloadeddata = () => done();
    media.onerror = () =>
      done(
        new Error("미디어를 읽을 수 없습니다. 파일을 다시 업로드해 주세요."),
      );
  });
}
async function seek(media: HTMLMediaElement, seconds: number) {
  if (Math.abs(media.currentTime - seconds) < 0.01) return;
  await new Promise<void>((resolve, reject) => {
    const timer = setTimeout(
      () => done(new Error("영상 시작 위치를 읽지 못했습니다.")),
      10000,
    );
    const done = (error?: Error) => {
      clearTimeout(timer);
      media.removeEventListener("seeked", ready);
      error ? reject(error) : resolve();
    };
    const ready = () => done();
    media.addEventListener("seeked", ready, { once: true });
    media.currentTime = seconds;
  });
}
export async function exportReels(
  nodes: HTMLElement[],
  project: Project,
  progress: (value: number) => void,
  signal: AbortSignal,
) {
  if (typeof MediaRecorder === "undefined")
    throw new Error(
      "이 브라우저는 영상 내보내기를 지원하지 않습니다. Chrome에서 시도해 주세요.",
    );
  const mime = [
    "video/webm;codecs=vp9,opus",
    "video/webm;codecs=vp8,opus",
    "video/webm",
  ].find((t) => MediaRecorder.isTypeSupported(t));
  if (!mime)
    throw new Error("WebM 녹화를 지원하는 브라우저에서 시도해 주세요.");
  const images = await rasterize(
    nodes,
    project,
    (p) => progress(p * 0.15),
    signal,
  );
  const canvas = document.createElement("canvas");
  canvas.width = 720;
  canvas.height = 1280;
  const ctx = canvas.getContext("2d")!;
  const stream = canvas.captureStream(30),
    audioContext = new AudioContext(),
    destination = audioContext.createMediaStreamDestination();
  let music: HTMLAudioElement | undefined;
  const videos: HTMLVideoElement[] = [];
  let recorder: MediaRecorder | undefined;
  try {
    if (project.audio) {
      music = new Audio(project.audio.url);
      music.crossOrigin = "anonymous";
      music.loop = true;
      await mediaReady(music);
      audioContext.createMediaElementSource(music).connect(destination);
      stream.addTrack(destination.stream.getAudioTracks()[0]);
    }
    for (const slot of project.slots) {
      if (slot.media?.kind === "video") {
        const v = document.createElement("video");
        v.crossOrigin = "anonymous";
        v.preload = "auto";
        v.muted = true;
        v.playsInline = true;
        v.src = slot.media.url;
        await mediaReady(v);
        if (slot.trim >= v.duration)
          throw new Error("장면 시작 시간이 영상 길이를 초과합니다.");
        await seek(v, slot.trim);
        videos.push(v);
      }
    }
    await audioContext.resume();
    signal.throwIfAborted();
    const chunks: Blob[] = [];
    recorder = new MediaRecorder(stream, {
      mimeType: mime,
      videoBitsPerSecond: 5000000,
    });
    const finished = new Promise<Blob>((resolve, reject) => {
      recorder!.ondataavailable = (e) => {
        if (e.data.size) chunks.push(e.data);
      };
      recorder!.onstop = () => resolve(new Blob(chunks, { type: mime }));
      recorder!.onerror = () =>
        reject(new Error("영상 내보내기를 완료하지 못했습니다."));
    });
    recorder.start(500);
    if (music) await music.play();
    const total = project.slots.reduce((sum, s) => sum + s.duration, 0);
    let elapsed = 0,
      videoIndex = 0;
    for (let i = 0; i < project.slots.length; i++) {
      const slot = project.slots[i],
        video = slot.media?.kind === "video" ? videos[videoIndex++] : undefined;
      if (video) {
        await video.play();
      }
      const start = performance.now();
      await new Promise<void>((resolve, reject) => {
        let timer: ReturnType<typeof setTimeout>;
        const abort = () => {
          clearTimeout(timer);
          reject(new DOMException("취소했습니다.", "AbortError"));
        };
        signal.addEventListener("abort", abort, { once: true });
        const draw = () => {
          if (signal.aborted) {
            abort();
            return;
          }
          const seconds = (performance.now() - start) / 1000;
          if (seconds >= slot.duration) {
            signal.removeEventListener("abort", abort);
            resolve();
            return;
          }
          ctx.fillStyle = "#0a0a0b";
          ctx.fillRect(0, 0, 720, 1280);
          if (video) {
            const scale = Math.max(
              720 / video.videoWidth,
              1280 / video.videoHeight,
            );
            const w = video.videoWidth * scale,
              h = video.videoHeight * scale;
            ctx.drawImage(
              video,
              (720 - w) / 2,
              (1280 - h) * (slot.crop / 100),
              w,
              h,
            );
            ctx.fillStyle = `rgba(0,0,0,${slot.dim})`;
            ctx.fillRect(0, 0, 720, 1280);
          }
          ctx.drawImage(images[i], 0, 0, 720, 1280);
          progress(0.15 + (0.85 * (elapsed + seconds)) / total);
          timer = setTimeout(draw, 1000 / 30);
        };
        draw();
      });
      video?.pause();
      elapsed += slot.duration;
    }
    recorder.stop();
    const blob = await finished;
    signal.throwIfAborted();
    progress(1);
    return { blob, name: `${filename(project.title)}.webm` };
  } finally {
    if (recorder && recorder.state !== "inactive") recorder.stop();
    music?.pause();
    for (const v of videos) {
      v.pause();
      v.removeAttribute("src");
      v.load();
    }
    stream.getTracks().forEach((t) => t.stop());
    await audioContext.close();
  }
}
