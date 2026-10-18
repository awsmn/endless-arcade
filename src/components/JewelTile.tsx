import React from "react";

export function JewelTile({
  color,
  preview = false,
}: {
  color: string;
  preview?: boolean;
}) {
  return (
    <span
      aria-hidden="true"
      className={`jewel-tile${preview ? " jewel-preview" : ""}`}
      style={{ "--jewel-color": color } as React.CSSProperties}
    >
      <span />
    </span>
  );
}
