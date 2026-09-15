import React from "react";
import { getInitials } from "../utils/nomeCurto";

const GOLD = "#C8932F";

export default function UserAvatar({ nome, size = 36, fontSize, background = GOLD, color = "#fff", className, style }) {
  return (
    <div
      className={className}
      style={{
        width: size, height: size, borderRadius: "50%", background, flexShrink: 0,
        display: "flex", alignItems: "center", justifyContent: "center",
        fontSize: fontSize || Math.round(size * 0.34), fontWeight: 700, color,
        ...style,
      }}
    >
      {getInitials(nome)}
    </div>
  );
}
