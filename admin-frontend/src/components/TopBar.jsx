import React from "react";
import LanguageToggle from "./LanguageToggle.jsx";
import HelpTooltipToggle from "./HelpTooltipToggle.jsx";
import SafeModeIndicator from "./SafeModeIndicator.jsx";

export default function TopBar({
  t,
  language, onToggleLanguage,
  showHelp, onToggleHelp,
  factoryMode, onSwitchFactoryMode,
  systemNameDisplay
}) {
  return (
    <div style={{
      display:"flex",
      justifyContent:"space-between",
      alignItems:"center",
      padding:"10px 16px",
      background:"#000",
      borderBottom:"1px solid #222",
      color:"#fff"
    }}>
      <div style={{display:"flex",flexDirection:"column"}}>
        <div style={{fontSize:"14px",fontWeight:"700",color:"#00e5ff"}}>
          {systemNameDisplay}
        </div>
        <div style={{fontSize:"11px",color:"#777"}}>
          {/* في المستقبل: Inject اسم الشركة بعد ما تختار الدومين */}
        </div>
      </div>

      <div style={{display:"flex",alignItems:"center",gap:"10px"}}>
        <SafeModeIndicator
          factoryMode={factoryMode}
          onSwitchFactoryMode={onSwitchFactoryMode}
        />
        <HelpTooltipToggle
          t={t}
          showHelp={showHelp}
          onToggle={onToggleHelp}
        />
        <LanguageToggle
          t={t}
          language={language}
          onToggle={onToggleLanguage}
        />
      </div>
    </div>
  );
}
