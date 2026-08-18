"use client";
import { useEffect } from "react";
import useScanner from "../scanner/useScanner";
import CategoryCard from "./CategoryCard";

export default function CategoryGrid({
  items,
  onChoose,
  sub = false,
  blinkSelect,
  enabled = true,
}) {
  const { active, select, selectedIndex, captureOnset } = useScanner(
    items,
    onChoose,
    1800,
    enabled
  );

  useEffect(() => {
    if (enabled && blinkSelect) {
      blinkSelect.current = {
        onLongBlink: (index, options) => select(index, { isBlink: true, ...options }),
        onBlinkOnset: () => captureOnset(),
      };
    }
  }, [enabled, blinkSelect, select, captureOnset]);

  return (
    <div className={sub ? "grid subgrid" : "grid"}>
      {items.map((item, i) => (
        <CategoryCard
          key={item.label}
          item={item}
          active={enabled && i === active}
          selected={enabled && i === selectedIndex}
          onSelect={() => select(i, { isPointer: true })}
        />
      ))}
    </div>
  );
}
