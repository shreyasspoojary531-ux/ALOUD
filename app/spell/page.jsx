"use client";
import { useCallback, useRef, useState } from "react";
import TopBar from "../../components/shared/TopBar";
import CameraPill from "../../components/camera/CameraPill";
import Keyboard from "../../components/keyboard/Keyboard";
import SpokenMessageOverlay from "../../components/overlay/SpokenMessageOverlay";
import { say } from "../../lib/speech";

export default function Spell() {
  const [eye, setEye] = useState(true),
    [message, setMessage] = useState(""),
    [spoken, setSpoken] = useState(null);

  const blink = useRef(() => {});
  const onBlink = useCallback(() => blink.current(), []);

  const speak = (text, urgent = false) => {
    if (!text) return;
    say(text);
    setSpoken({ text, urgent });
  };

  return (
    <main className="app">
      <section className="spell center">
        <TopBar spell toggleEye={() => setEye((x) => !x)} />
        <div className="spell-message">
          <p className="eyebrow">YOUR MESSAGE</p>
          <div className={`message-line ${message ? "live" : ""}`}>
            {message || "Pick a suggestion, or spell a word."}
          </div>
        </div>
        <Keyboard
          message={message}
          setMessage={setMessage}
          speak={speak}
          blinkSelect={blink}
          enabled={!spoken}
        />
      </section>
      <p className="caption">
        A row is highlighting — <b>long-blink</b> to open it
      </p>
      <CameraPill enabled={eye} onLongBlink={onBlink} />
      {spoken && (
        <SpokenMessageOverlay
          message={spoken.text}
          urgent={spoken.urgent}
          blinkSelect={blink}
          onDismiss={() => setSpoken(null)}
        />
      )}
    </main>
  );
}
