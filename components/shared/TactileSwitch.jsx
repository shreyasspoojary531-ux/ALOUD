"use client";

import React from "react";

/**
 * Tactile Neumorphic Switch component with animated LED light indicator.
 */
export default function TactileSwitch({ id, checked, onChange, ariaLabel }) {
  return (
    <div className="switch-container">
      <input
        className="toggle-checkbox"
        id={id}
        type="checkbox"
        checked={!!checked}
        onChange={onChange}
        aria-label={ariaLabel}
      />
      <label className="switch" htmlFor={id}>
        <div className="toggle">
          <div className="led" />
        </div>
      </label>
    </div>
  );
}
