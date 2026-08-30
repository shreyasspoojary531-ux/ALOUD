"use client";
import { useCallback, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import TopBar from "../../components/shared/TopBar";
import CameraPill from "../../components/camera/CameraPill";
import CategoryGrid from "../../components/home/CategoryGrid";
import SpokenMessageOverlay from "../../components/overlay/SpokenMessageOverlay";
import HelpModal from "../../components/shared/HelpModal";
import { useEyeControl } from "../../components/shared/EyeControlContext";
import { useSettings } from "../../components/shared/SettingsContext";
import { BUILTIN_PHRASES, findBuiltinPhrase } from "../../lib/phrases";

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

export default function Home() {
  const router = useRouter();
  const { eyeOn } = useEyeControl();
  const { repeatCount, customPhrases, adaptedDwellDuration } = useSettings();
  const [help, setHelp] = useState(false);
  const [group, setGroup] = useState(null);
  const [spoken, setSpoken] = useState(null);

  const blink = useRef(null);
  const onBlink = useCallback((...args) => {
    if (typeof blink.current === "function") {
      blink.current(...args);
    } else if (blink.current?.onLongBlink) {
      blink.current.onLongBlink(...args);
    }
  }, []);

  const onBlinkOnset = useCallback(() => {
    if (blink.current?.onBlinkOnset) {
      blink.current.onBlinkOnset();
    }
  }, []);

  const choose = (item) => {
    if (!item) return;
    if (item.label === "Back") return setGroup(null);
    if (item.label === "Spell it out") return router.push("/spell");

    const isGroupHeader = root.some((r) => r.label === item.label && r.label !== "Spell it out");
    if (isGroupHeader) return setGroup(item.label);

    const isEmerg = item.isEmergency !== undefined
      ? item.isEmergency
      : findBuiltinPhrase(item.label)?.isEmergency ?? false;

    setSpoken({ message: item.label, isEmergency: isEmerg });
  };

  const groupTint =
    group === "I need"
      ? "gold"
      : group === "Answers"
      ? "blue"
      : group === "People"
      ? "sage"
      : "rose";

  const groupBuiltinPhrases = BUILTIN_PHRASES.filter(
    (p) => p.category?.toLowerCase() === group?.toLowerCase()
  );

  const groupCustomPhrases = (customPhrases || []).filter(
    (p) => p.category?.toLowerCase() === group?.toLowerCase()
  );

  const items = group
    ? [
        ...groupBuiltinPhrases.map((p) => ({
          label: p.text,
          icon: p.icon || "heart",
          tint: groupTint,
          isEmergency: p.isEmergency,
        })),
        ...groupCustomPhrases.map((p) => ({
          label: p.text,
          icon: "heart",
          tint: groupTint,
          isCustom: true,
          isEmergency: !!p.isEmergency,
          id: p.id,
        })),
        { label: "Back", icon: "Back", tint: "blue" },
      ]
    : root;

  return (
    <main className="app">
      <TopBar onHelp={() => setHelp(true)} />
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
          interval={adaptedDwellDuration}
        />
      </section>
      <p className="caption">
        <span className="pulse-dot" />
        The highlight moves on its own · take a long blink to select
      </p>
      <CameraPill enabled={eyeOn} onLongBlink={onBlink} onBlinkOnset={onBlinkOnset} />
      {spoken && (
        <SpokenMessageOverlay
          message={spoken.message}
          isEmergency={spoken.isEmergency}
          repeatCount={repeatCount}
          urgent={spoken.isEmergency || /breathe|help/i.test(spoken.message)}
          blinkSelect={blink}
          onDismiss={() => {
            setSpoken(null);
            setGroup(null);
          }}
        />
      )}
      {help && <HelpModal onClose={() => setHelp(false)} />}
    </main>
  );
}
