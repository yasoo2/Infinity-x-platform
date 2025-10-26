import React from "react";

export default function HelpTooltipToggle({ t, showHelp, onToggle }) {
  // أخضر = مطفي (مافي شرح)
  // أحمر = شغال (بيظهر شرح الهوفر)
  const active = showHelp;
  return (
    <button
      onClick={onToggle}
      style={{
        width:28,
        height:28,
        borderRadius:6,
        border:"1px solid #444",
        fontWeight:"700",
        cursor:"pointer",
        background: active ? "#ff2d2d" : "#17c964", // أحمر / أخضر
        color:"#000",
        fontSize:"14px",
        lineHeight:"14px"
      }}
      title={active ? t.helpOn : t.helpOff}
    >
      !
    </button>
  );
}
