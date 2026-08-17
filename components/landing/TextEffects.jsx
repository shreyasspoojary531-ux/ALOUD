"use client";
import { useEffect, useRef, useState } from "react";

/**
 * Splits text into individual word spans with staggered animation delays.
 * Equivalent to React Bits "Staggered Text" — no external lib needed.
 */
export function StaggeredHeading({ text, className = "", tag: Tag = "h2" }) {
  const ref = useRef(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const obs = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) { setVisible(true); obs.unobserve(el); }
      },
      { threshold: 0.2 }
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, []);

  const words = text.split(" ");

  return (
    <Tag ref={ref} className={`staggered-heading ${className}`} aria-label={text}>
      {words.map((word, i) => (
        <span
          key={i}
          className={`stagger-word${visible ? " stagger-word--in" : ""}`}
          style={{ "--i": i }}
          aria-hidden="true"
        >
          {word}
          {i < words.length - 1 ? "\u00a0" : ""}
        </span>
      ))}
    </Tag>
  );
}

/**
 * Renders body text where key phrases are "blur-highlighted" as they enter view.
 * Equivalent to React Bits "Blur Highlight" — no external lib needed.
 * Pass `segments` as an array of { text, highlight?: boolean } objects.
 */
export function BlurHighlightText({ segments, className = "" }) {
  const ref = useRef(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const obs = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) { setVisible(true); obs.unobserve(el); }
      },
      { threshold: 0.15 }
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, []);

  return (
    <p
      ref={ref}
      className={`blur-highlight-text ${visible ? "blur-highlight-text--in" : ""} ${className}`}
    >
      {segments.map(({ text, highlight }, i) =>
        highlight ? (
          <mark
            key={i}
            className={`blur-mark${visible ? " blur-mark--in" : ""}`}
            style={{ "--j": i }}
          >
            {text}
          </mark>
        ) : (
          <span
            key={i}
            className={`blur-span${visible ? " blur-span--in" : ""}`}
            style={{ "--j": i }}
          >
            {text}
          </span>
        )
      )}
    </p>
  );
}
