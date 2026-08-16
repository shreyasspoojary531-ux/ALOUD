"use client";
import { useCallback, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import TopBar from "../../components/shared/TopBar";
import CameraPill from "../../components/camera/CameraPill";
import CategoryGrid from "../../components/home/CategoryGrid";
import SpokenMessageOverlay from "../../components/overlay/SpokenMessageOverlay";
import { say } from "../../lib/speech";
const root = [
  { label: "I feel", icon: "♡", tint: "rose" },
  { label: "I need", icon: "☞", tint: "gold" },
  { label: "People", icon: "♧", tint: "sage" },
  { label: "Answers", icon: "◯", tint: "blue" },
  {
    label: "Spell it out",
    note: "Build any message, letter by letter",
    icon: "⌨",
    tint: "rose",
    wide: true,
  },
];
const groups = {
  "I feel": [
    "I’m in pain.",
    "I can’t breathe.",
    "I feel sick.",
    "I’m too hot.",
    "I’m too cold.",
    "I’m itchy.",
  ],
  "I need": [
    "I need some water.",
    "I need help.",
    "I need the bathroom.",
    "I need to rest.",
    "I need medicine.",
    "I need my family.",
  ],
  People: [
    "I need my carer.",
    "I need my family.",
    "Please call someone.",
    "I want company.",
  ],
};
export default function Home() {
  const router = useRouter(),
    [eye, setEye] = useState(true),
    [help, setHelp] = useState(false),
    [group, setGroup] = useState(null),
    [spoken, setSpoken] = useState(null);
  const blink = useRef(() => {});
  const onBlink = useCallback(() => blink.current(), []);
  const choose = (item) => {
    if (item.label === "Back") return setGroup(null);
    if (item.label === "Spell it out") return router.push("/spell");
    if (root.some((x) => x.label === item.label)) return setGroup(item.label);
    say(item.label);
    setSpoken(item.label);
  };
  const items = group
    ? [
        ...groups[group].map((label, i) => ({
          label,
          icon: ["⌁", "≋", "♨", "☀", "❄", "⌁"][i],
          tint: group === "I need" ? "gold" : "rose",
        })),
        { label: "Back", icon: "‹", tint: "blue" },
      ]
    : root;
  return (
    <main className="app">
      <TopBar
        eyeOn={eye}
        toggleEye={() => setEye((x) => !x)}
        onHelp={() => setHelp(true)}
      />
      <section className="home center">
        <p className="eyebrow">
          {group ? group.toUpperCase() : "WHAT WOULD YOU LIKE TO SAY?"}
        </p>
        <CategoryGrid
          items={items}
          onChoose={choose}
          sub={!!group}
          blinkSelect={blink}
        />
      </section>
      <p className="caption">
        <span className="pulse-dot" />
        The highlight moves on its own · take a long blink to select
      </p>
      <CameraPill enabled={eye} onLongBlink={onBlink} />
      {spoken && (
        <SpokenMessageOverlay
          message={spoken}
          urgent={/breathe|help/i.test(spoken)}
          blinkSelect={blink}
          onDismiss={() => {
            setSpoken(null);
            setGroup(null);
          }}
        />
      )}
      {help && (
        <div className="help">
          <div className="help-card">
            <h2>Speaking with your eyes</h2>
            <p>
              The scan moves through every choice. A long blink, click, and
              Spacebar always select the same highlighted choice.
            </p>
            <button className="button dark" onClick={() => setHelp(false)}>
              Got it
            </button>
          </div>
        </div>
      )}
    </main>
  );
}
