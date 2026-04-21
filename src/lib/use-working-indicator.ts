import { useEffect, useRef } from "react";

const IDLE_TITLE = "🐝 Worker Bee — Website Builder";

function setFavicon(emoji: string) {
  if (typeof document === "undefined") return;
  const canvas = document.createElement("canvas");
  canvas.width = 32;
  canvas.height = 32;
  const ctx = canvas.getContext("2d");
  if (!ctx) return;
  ctx.font = "28px serif";
  ctx.textBaseline = "alphabetic";
  ctx.fillText(emoji, 2, 26);
  let link = document.querySelector("link[rel*='icon']") as HTMLLinkElement | null;
  if (!link) {
    link = document.createElement("link");
    link.rel = "icon";
    document.head.appendChild(link);
  }
  link.type = "image/png";
  link.href = canvas.toDataURL("image/png");
}

export function useWorkingIndicator(streaming: boolean) {
  const faviconTimer = useRef<number | null>(null);
  const titleTimer = useRef<number | null>(null);

  useEffect(() => {
    if (typeof window === "undefined") return;

    if (streaming) {
      const faviconFrames = ["🐝", "🫧"];
      let f = 0;
      setFavicon(faviconFrames[0]);
      faviconTimer.current = window.setInterval(() => {
        f = (f + 1) % faviconFrames.length;
        setFavicon(faviconFrames[f]);
      }, 400);

      const titleFrames = [
        "🐝 Working... — Worker Bee",
        "🐝· Working... — Worker Bee",
        "🐝·· Working... — Worker Bee",
        "🐝··· Working... — Worker Bee",
      ];
      let t = 0;
      document.title = titleFrames[0];
      titleTimer.current = window.setInterval(() => {
        t = (t + 1) % titleFrames.length;
        document.title = titleFrames[t];
      }, 800);
    } else {
      setFavicon("🐝");
      document.title = IDLE_TITLE;
    }

    return () => {
      if (faviconTimer.current) {
        clearInterval(faviconTimer.current);
        faviconTimer.current = null;
      }
      if (titleTimer.current) {
        clearInterval(titleTimer.current);
        titleTimer.current = null;
      }
    };
  }, [streaming]);
}
