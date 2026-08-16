"use client";
import { useCallback, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import TopBar from "../../components/shared/TopBar";
import CameraPill from "../../components/camera/CameraPill";
import CategoryGrid from "../../components/home/CategoryGrid";
import SpokenMessageOverlay from "../../components/overlay/SpokenMessageOverlay";
import { useEyeControl } from "../../components/shared/EyeControlContext";
import { say } from "../../lib/speech";

const root = [
  { label: "I feel", icon: "I feel", tint: "rose" },
  { label: "I need", icon: "I need", tint: "gold" },
  { label: "People", icon: "People", tint: "sage" },
  { label: "Answers", icon: "Answers", tint: "blue" },
  {
    label: "Spell it out",
    note: "Build any message, letter by letter",
    icon: "Spell it out",
    tint: "rose",
    wide: true,
  },
];

const subIcons = {
  "I’m in pain.": "pain",
  "I can’t breathe.": "breathe",
  "I feel sick.": "sick",
  "I’m too hot.": "hot",
  "I’m too cold.": "cold",
  "I’m itchy.": "sick",

  "I need some water.": "droplet",
  "I need help.": "help",
  "I need the bathroom.": "help",
  "I need to rest.": "rest",
  "I need medicine.": "medicine",
  "I need my family.": "users",

  "I need my carer.": "users",
  "Please call someone.": "message",
  "I want company.": "users",

  "Yes.": "yes",
  "No.": "no",
  "Maybe.": "question",
  "I don’t know.": "question",
  "Thank you.": "heart",
  "Please.": "hand",
};

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
  Answers: [
    "Yes.",
    "No.",
    "Maybe.",
    "I don’t know.",
    "Thank you.",
    "Please.",
  ],
};

export default function Home() {
  const router = useRouter();
  const { eyeOn, toggleEye } = useEyeControl();
  const [help, setHelp] = useState(false);
  const [group, setGroup] = useState(null);
  const [spoken, setSpoken] = useState(null);

  const blink = useRef(() => {});
  const onBlink = useCallback(() => blink.current(undefined, { isBlink: true }), []);

  const choose = (item) => {
    if (!item) return;
    if (item.label === "Back") return setGroup(null);
    if (item.label === "Spell it out") return router.push("/spell");
    if (groups[item.label]) return setGroup(item.label);

    say(item.label);
    setSpoken(item.label);
  };

  const items = group && groups[group]
    ? [
        ...groups[group].map((label) => ({
          label,
          icon: subIcons[label] || "heart",
          tint: group === "I need" ? "gold" : group === "Answers" ? "blue" : "rose",
        })),
        { label: "Back", icon: "Back", tint: "blue" },
      ]
    : root;

  return (
    <main className="app">
      <TopBar
        eyeOn={eyeOn}
        toggleEye={toggleEye}
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
          enabled={!spoken}
        />
      </section>
      <p className="caption">
        <span className="pulse-dot" />
        The highlight moves on its own · take a long blink to select
      </p>
      <CameraPill enabled={eyeOn} onLongBlink={onBlink} />
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

