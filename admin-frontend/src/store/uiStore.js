import { useState } from "react";

// بسيط، بدون Redux: React hooks مبدئياً
// language: "ar" | "en"
// help: هل نظهر التولتيب عند الـ hover ولا لأ
export function useUIStore() {
  const [language, setLanguage] = useState("en"); // الواجهة تبدأ بالانجليزي
  const [showHelp, setShowHelp] = useState(true);

  function toggleLanguage() {
    setLanguage(prev => (prev === "en" ? "ar" : "en"));
  }
  function toggleHelp() {
    setShowHelp(prev => !prev);
  }

  return {
    language,
    setLanguage,
    toggleLanguage,
    showHelp,
    toggleHelp
  };
}
