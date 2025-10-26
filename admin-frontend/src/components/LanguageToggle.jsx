import React from "react";

export default function LanguageToggle({ t, language, onToggle }) {
  return (
    <button
      style={{
        background:"#222",
        color:"#fff",
        border:"1px solid #444",
        borderRadius:8,
        padding:"6px 10px",
        fontSize:"12px",
        cursor:"pointer"
      }}
      onClick={onToggle}
      title={language === "en" ? "Switch to Arabic" : "تحويل للإنجليزي"}
    >
      {language === "en" ? "AR" : "EN"}
    </button>
  );
}
