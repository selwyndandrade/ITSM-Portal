import { useMemo, useState } from "react";

const BACKGROUND_VIDEOS = [
  "/10617214-uhd_4096_2160_25fps.mp4",
  "/11025440-hd_4096_2160_25fps.mp4",
  "/853979-hd_1920_1080_25fps.mp4",
  "/854086-hd_1920_1080_25fps.mp4",
];

const prefersReducedMotion =
  typeof window !== "undefined" &&
  window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;

export default function AuthBackgroundVideo() {
  const [failed, setFailed] = useState(false);
  const src = useMemo(
    () => BACKGROUND_VIDEOS[Math.floor(Math.random() * BACKGROUND_VIDEOS.length)],
    []
  );

  if (prefersReducedMotion || failed) return null;

  return (
    <video
      className="auth-background-video"
      src={src}
      autoPlay
      muted
      loop
      playsInline
      aria-hidden="true"
      onError={() => setFailed(true)}
    />
  );
}
