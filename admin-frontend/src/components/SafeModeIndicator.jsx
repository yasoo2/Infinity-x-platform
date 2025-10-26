import React from "react";

export default function SafeModeIndicator({ factoryMode, onSwitchFactoryMode }) {
  const isSafe = factoryMode === "safe";
  return (
    <div style={{
      display:"flex",
      alignItems:"center",
      gap:"8px",
      background:"#111",
      border:"1px solid #333",
      borderRadius:"8px",
      padding:"6px 10px",
      color:"#fff",
      fontSize:"12px"
    }}>
      <div
        style={{
          width:10,
          height:10,
          borderRadius:"50%",
          background: isSafe ? "#17c964" : "#ff2d2d"
        }}
      />
      <div style={{fontWeight:"600"}}>
        {isSafe ? "SAFE" : "LIVE"}
      </div>
      <button
        onClick={onSwitchFactoryMode}
        style={{
          fontSize:"10px",
          background:"#222",
          color:"#fff",
          border:"1px solid #444",
          borderRadius:"6px",
          cursor:"pointer",
          padding:"3px 6px"
        }}
      >
        toggle
      </button>
    </div>
  );
}
