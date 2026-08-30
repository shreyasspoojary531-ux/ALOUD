"use client";

import dynamic from "next/dynamic";

// Dynamic lazy loading with SSR disabled so MediaPipe and webcam assets
// are only loaded on-demand when someone navigates directly to /naruto.
const NarutoExperience = dynamic(
  () => import("../../components/naruto/NarutoExperience"),
  {
    ssr: false,
    loading: () => (
      <div
        style={{
          position: "fixed",
          inset: 0,
          backgroundColor: "#080808",
          color: "#ffffff",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontSize: "16px",
          fontWeight: 500,
        }}
      >
        Loading Naruto AR...
      </div>
    ),
  }
);

export default function NarutoPage() {
  return <NarutoExperience />;
}
