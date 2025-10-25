import React, { useState } from "react";

export default function ActionWithHelp({ buttonStyle, buttonLabel, onClick, helpText, helpModeEnabled }) {
  const [open, setOpen] = useState(false);

  return (
    <div style={{ marginBottom: "16px" }}>
      <div style={{ display: "flex", alignItems: "center", gap: "8px", flexWrap: "wrap" }}>
        <button style={buttonStyle} onClick={onClick}>
          {buttonLabel}
        </button>

        {helpModeEnabled && (
          <button
            style={{
              backgroundColor: "#111",
              color: "#d4af37",
              border: "1px solid #d4af37",
              borderRadius: "8px",
              padding: "6px 10px",
              fontSize: "12px",
              fontWeight: 600,
              cursor: "pointer",
              lineHeight: 1,
            }}
            title="اضغط هنا لعرض شرح هذا الزر"
            onClick={() => setOpen(!open)}
          >
            !
          </button>
        )}
      </div>

      {open && helpModeEnabled && (
        <div
          style={{
            backgroundColor: "#000",
            border: "1px solid #d4af37",
            color: "#fff",
            borderRadius: "10px",
            padding: "12px",
            fontSize: "12px",
            lineHeight: 1.5,
            marginTop: "8px",
            maxWidth: "360px",
            whiteSpace: "pre-line",
          }}
        >
          {helpText}
        </div>
      )}
    </div>
  );
}
