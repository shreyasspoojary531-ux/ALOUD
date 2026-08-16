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
  const { active, select } = useScanner(items, onChoose, 1800, enabled);

  useEffect(() => {
    if (enabled && blinkSelect) {
      blinkSelect.current = select;
    }
  }, [enabled, blinkSelect, select]);

  return (
    <div className={sub ? "grid subgrid" : "grid"}>
      {items.map((item, i) => (
        <CategoryCard
          key={item.label}
          item={item}
          active={enabled && i === active}
          onSelect={() => select(i)}
        />
      ))}
    </div>
  );
}
