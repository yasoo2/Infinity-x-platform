import React, { useState } from "react";
import axios from "axios";
import ActionWithHelp from "./components/ActionWithHelp";

export default function OwnerDashboard({ sessionToken }) {
  const [helpModeEnabled, setHelpModeEnabled] = useState(true);

  const [buildKey, setBuildKey] = useState("");

  // client
  const [clientId, setClientId] = useState("");
  const [brandName, setBrandName] = useState("");
  const [rtl, setRtl] = useState(true);
  const [primaryColor, setPrimaryColor] = useState("#000000");
  const [accentColor, setAccentColor] = useState("#d4af37");
  const [contactEmail, setContactEmail] = useState("");

  // project
  const [projectName, setProjectName] = useState("");
  const [brandTone, setBrandTone] = useState("علامة راقية، ثقة، جودة عالية");
  const [title, setTitle] = useState("مرحباً في منصتك الجديدة");
  const [heroLine, setHeroLine] = useState("نحول فكرتك إلى منصة جاهزة للعمل");
  const [ctaText, setCtaText] = useState("ابدأ الآن");

  // list
  const [projectsList, setProjectsList] = useState([]);
  const [downloadInfo, setDownloadInfo] = useState({ version: "", message: "" });

  // plan
  const [businessType, setBusinessType] = useState("clinic");
  const [featuresText, setFeaturesText] = useState("online booking, dashboard, mobile app");
  const [scale, setScale] = useState("up to 1000 active users/month");
  const [tone, setTone] = useState("فخم / طبي / ثقة وراحة نفسية");
  const [planPreview, setPlanPreview] = useState("");
  const [savingPlanStatus, setSavingPlanStatus] = useState("");

  const API_BASE = process.env.REACT_APP_API_URL || "http://localhost:10000";

  async function registerClient() {
    try {
      const res = await axios.post(`${API_BASE}/api/clients/register`, {
        buildKey,
        clientId,
        brandName,
        rtl,
        primaryColor,
        accentColor,
        contactEmail,
      }, {
        headers: sessionToken ? { "x-session-token": sessionToken } : {}
      });
      alert("تم تسجيل العميل / أو موجود أصلاً:\n" + JSON.stringify(res.data, null, 2));
    } catch (err) {
      alert("خطأ في تسجيل العميل: " + err.message);
    }
  }

  async function generatePlatform() {
    try {
      const res = await axios.post(`${API_BASE}/api/builder/scaffold`, {
        buildKey,
        projectName,
        clientId,
        kind: "platform",
        brandName,
        brandTone,
        rtl,
        primaryColor,
        accentColor,
        title,
        heroLine,
        ctaText,
      }, {
        headers: sessionToken ? { "x-session-token": sessionToken } : {}
      });

      alert("تم بناء المنصة وحفظ النسخة:\n" + JSON.stringify(res.data, null, 2));
      if (res.data && res.data.version) {
        setDownloadInfo({ version: res.data.version, message: "صار عندك إصدار جاهز للتنزيل كـ ZIP" });
      }
    } catch (err) {
      alert("خطأ في توليد المنصة: " + err.message);
    }
  }

  async function fetchClientProjects() {
    try {
      const res = await axios.get(`${API_BASE}/api/clients/${clientId}/projects`, {
        params: { buildKey },
        headers: sessionToken ? { "x-session-token": sessionToken } : {}
      });
        setProjectsList(res.data.projects || []);
    } catch (err) {
      alert("خطأ في جلب مشاريع العميل: " + err.message);
    }
  }

  function downloadZip(version) {
    const url = `${API_BASE}/api/builder/download?buildKey=${encodeURIComponent(buildKey)}&projectName=${encodeURIComponent(projectName)}&clientId=${encodeURIComponent(clientId)}&version=${encodeURIComponent(version)}`;
    window.open(url, "_blank");
  }

  async function generatePlan() {
    try {
      const res = await axios.post(`${API_BASE}/api/builder/plan`, {
        buildKey, clientId, businessType, features: featuresText, scale, tone
      }, {
        headers: sessionToken ? { "x-session-token": sessionToken } : {}
      });

      const planText = typeof res.data?.plan === "string" ? res.data.plan : JSON.stringify(res.data?.plan || res.data, null, 2);
      setPlanPreview(planText || "لم يرجع نص الخطة.");
    } catch (err) {
      setPlanPreview("خطأ في توليد الخطة: " + err.message);
    }
  }

  async function savePlanToNotion() {
    try {
      setSavingPlanStatus("جارٍ الحفظ...");
      const res = await axios.post(`${API_BASE}/api/builder/savePlanToNotion`, {
        buildKey, clientId, planContent: planPreview
      }, {
        headers: sessionToken ? { "x-session-token": sessionToken } : {}
      });
      setSavingPlanStatus(res.data?.ok ? "تم الحفظ في Notion ✅" : "لم يتم الحفظ");
    } catch (err) {
      setSavingPlanStatus("خطأ أثناء الحفظ: " + err.message);
    }
  }

  const groupBoxStyle = { border: "1px solid #333", borderRadius: "12px", padding: "16px", marginBottom: "20px" };
  const labelMain = { fontSize: "14px", fontWeight: 600, color: "#fff" };
  const labelDesc = { fontSize: "12px", color: "#999" };
  const fieldInputStyle = {
    width: "100%", padding: "10px", borderRadius: "8px", border: "1px solid #444", backgroundColor: "#111", color: "#fff", marginBottom: "12px", fontSize: "13px"
  };
  const fieldTextareaStyle = {
    width: "100%", minHeight: "60px", padding: "10px", borderRadius: "8px", border: "1px solid #444", backgroundColor: "#111", color: "#fff", marginBottom: "12px", fontSize: "13px", lineHeight: 1.4
  };
  const mainButtonStyle = { backgroundColor: "#d4af37", color: "#000", border: "none", borderRadius: "10px", padding: "10px 14px", fontSize: "13px", fontWeight: 600, cursor: "pointer" };
  const secondaryButtonStyle = { backgroundColor: "#222", color: "#fff", border: "1px solid #444", borderRadius: "10px", padding: "10px 14px", fontSize: "13px", fontWeight: 600, cursor: "pointer", marginTop: "8px" };
  const downloadButtonStyle = { backgroundColor: "#111", color: "#d4af37", border: "1px solid #d4af37", borderRadius: "8px", padding: "6px 10px", fontSize: "12px", fontWeight: 600, cursor: "pointer", marginTop: "8px" };

  return (
    <div style={{ padding: "20px", color: "#fff", backgroundColor: "#000", minHeight: "100vh", fontFamily: "system-ui, sans-serif" }}>
      <h1 style={{ color: "#d4af37", fontSize: "20px", fontWeight: 600, marginBottom: "8px" }}>InfinityX Owner Dashboard</h1>
      <div style={{ fontSize: "13px", color: "#aaa", marginBottom: "16px", lineHeight: 1.5 }}>لوحة تحكم خاصة بالمالك فقط. يمكنك إنشاء مشاريع، توليد خطة عمل تقنية، وتحميل الإصدار كـ ZIP.</div>

      <button
        style={{
          backgroundColor: helpModeEnabled ? "#d4af37" : "#222",
          color: helpModeEnabled ? "#000" : "#fff",
          border: helpModeEnabled ? "1px solid #d4af37" : "1px solid #444",
          borderRadius: "10px",
          padding: "8px 12px",
          fontSize: "12px",
          fontWeight: 600,
          cursor: "pointer",
          marginBottom: "24px",
        }}
        title="إظهار أو إخفاء (!) بجانب الأزرار لعرض الشرح المفصل"
        onClick={() => setHelpModeEnabled(!helpModeEnabled)}
      >
        {helpModeEnabled ? "إخفاء الشرح (!) - وضع الخبير" : "إظهار الشرح (!) - وضع المساعدة"}
      </button>

      {/* buildKey */}
      <div style={groupBoxStyle}>
        <div style={{ marginBottom: "4px" }}>
          <div style={labelMain}>مفتاح المالك / buildKey</div>
          <div style={labelDesc}>هذا المفتاح السري. فقط من يملك هذا المفتاح يمكنه توليد منصات أو تنزيل السورس كـ ZIP.</div>
        </div>
        <input style={fieldInputStyle} placeholder="CONTINUE_ADMIN_KEY" value={buildKey} onChange={(e) => setBuildKey(e.target.value)} />
      </div>

      {/* client */}
      <div style={groupBoxStyle}>
        <h2 style={{ color: "#d4af37", fontSize: "16px", fontWeight: 600, marginBottom: "12px" }}>تسجيل / تحديث بيانات العميل</h2>

        <div style={{ marginBottom: "4px" }}><div style={labelMain}>clientId</div><div style={labelDesc}>اسم قصير ثابت للعميل.</div></div>
        <input style={fieldInputStyle} value={clientId} onChange={(e) => setClientId(e.target.value)} />

        <div style={{ marginBottom: "4px" }}><div style={labelMain}>brandName</div><div style={labelDesc}>الاسم التجاري الظاهر.</div></div>
        <input style={fieldInputStyle} value={brandName} onChange={(e) => setBrandName(e.target.value)} />

        <div style={{ marginBottom: "4px" }}><div style={labelMain}>contactEmail (اختياري)</div></div>
        <input style={fieldInputStyle} value={contactEmail} onChange={(e) => setContactEmail(e.target.value)} />

        <div style={{ marginBottom: "4px" }}><div style={labelMain}>RTL?</div><div style={labelDesc}>true = عربي.</div></div>
        <select style={fieldInputStyle} value={rtl} onChange={(e) => setRtl(e.target.value === "true")}>
          <option value="true">true (عربي)</option>
          <option value="false">false (English)</option>
        </select>

        <div style={{ marginBottom: "4px" }}><div style={labelMain}>primaryColor</div></div>
        <input style={fieldInputStyle} value={primaryColor} onChange={(e) => setPrimaryColor(e.target.value)} />

        <div style={{ marginBottom: "4px" }}><div style={labelMain}>accentColor</div></div>
        <input style={fieldInputStyle} value={accentColor} onChange={(e) => setAccentColor(e.target.value)} />

        <ActionWithHelp
          buttonStyle={mainButtonStyle}
          buttonLabel="تسجيل / تحديث معلومات العميل"
          onClick={registerClient}
          helpModeEnabled={helpModeEnabled}
          helpText={"هذا الزر يخزن بيانات العميل في قاعدة البيانات.\nنستخدم هذه البيانات لاحقًا لما نبني له منصة."}
        />
      </div>

      {/* scaffold */}
      <div style={groupBoxStyle}>
        <h2 style={{ color: "#d4af37", fontSize: "16px", fontWeight: 600, marginBottom: "12px" }}>توليد منصة كاملة (ويب + API + موبايل)</h2>

        <div style={{ marginBottom: "4px" }}><div style={labelMain}>projectName</div></div>
        <input style={fieldInputStyle} value={projectName} onChange={(e) => setProjectName(e.target.value)} />

        <div style={{ marginBottom: "4px" }}><div style={labelMain}>title</div></div>
        <input style={fieldInputStyle} value={title} onChange={(e) => setTitle(e.target.value)} />

        <div style={{ marginBottom: "4px" }}><div style={labelMain}>heroLine</div></div>
        <input style={fieldInputStyle} value={heroLine} onChange={(e) => setHeroLine(e.target.value)} />

        <div style={{ marginBottom: "4px" }}><div style={labelMain}>ctaText</div></div>
        <input style={fieldInputStyle} value={ctaText} onChange={(e) => setCtaText(e.target.value)} />

        <div style={{ marginBottom: "4px" }}><div style={labelMain}>brandTone</div></div>
        <textarea style={fieldTextareaStyle} value={brandTone} onChange={(e) => setBrandTone(e.target.value)} />

        <ActionWithHelp
          buttonStyle={mainButtonStyle}
          buttonLabel="⬛ توليد منصة كاملة وحفظها كإصدار جديد"
          onClick={generatePlatform}
          helpModeEnabled={helpModeEnabled}
          helpText={"يبني مشروع ضخم جاهز للعميل:\n- واجهة ويب (React+Vite+Tailwind)\n- API (Express+Mongo)\n- موبايل (React Native)\nويحفظهم كنسخة Version بدون ما يكسر القديم."}
        />

        {downloadInfo.message && (
          <div style={{ marginTop: "12px", fontSize: "12px", color: "#0f0" }}>
            {downloadInfo.message} (الإصدار {downloadInfo.version})
          </div>
        )}
      </div>

      {/* projects */}
      <div style={groupBoxStyle}>
        <h2 style={{ color: "#d4af37", fontSize: "16px", fontWeight: 600, marginBottom: "12px" }}>مشاريع العميل / تنزيل ZIP</h2>

        <ActionWithHelp
          buttonStyle={secondaryButtonStyle}
          buttonLabel="عرض كل الإصدارات لهذا العميل"
          onClick={fetchClientProjects}
          helpModeEnabled={helpModeEnabled}
          helpText={"يعرض كل الإصدارات (v1, v2, v3...) الخاصة بـ clientId المحدد."}
        />

        <ul style={{ marginTop: "16px", fontSize: "12px", color: "#fff", lineHeight: 1.6 }}>
          {projectsList.map((p, idx) => (
            <li key={idx} style={{ borderBottom: "1px solid #333", padding: "8px 0" }}>
              <div>المشروع: {p.projectName}</div>
              <div>الإصدار: v{p.version}</div>
              <div>النوع: {p.metadata?.kind}</div>
              <div>تاريخ الإنشاء: {p.createdAt}</div>

              <ActionWithHelp
                buttonStyle={downloadButtonStyle}
                buttonLabel="⬇ تنزيل هذا الإصدار كـ ZIP"
                onClick={() => downloadZip(p.version)}
                helpModeEnabled={helpModeEnabled}
                helpText={"يبني ملف ZIP للإصدار المحدد (واجهة + API + موبايل) للتسليم أو الرفع على GitHub."}
              />
            </li>
          ))}
        </ul>
      </div>

      {/* AI Plan */}
      <div style={groupBoxStyle}>
        <h2 style={{ color: "#d4af37", fontSize: "16px", fontWeight: 600, marginBottom: "12px" }}>خطة المشروع (AI Plan)</h2>
        <div style={{ fontSize: "12px", color: "#999", lineHeight: 1.4, marginBottom: "12px" }}>
          وثيقة تخطيط كاملة: نظرة عامة، الوظائف، البنية التقنية، نموذج البيانات، رحلة المستخدم، المخاطر، المطلوب قبل الإطلاق.
        </div>

        <div style={{ marginBottom: "4px" }}><div style={labelMain}>businessType</div></div>
        <input style={fieldInputStyle} value={businessType} onChange={(e) => setBusinessType(e.target.value)} />

        <div style={{ marginBottom: "4px" }}><div style={labelMain}>features</div></div>
        <input style={fieldInputStyle} value={featuresText} onChange={(e) => setFeaturesText(e.target.value)} />

        <div style={{ marginBottom: "4px" }}><div style={labelMain}>scale</div></div>
        <input style={fieldInputStyle} value={scale} onChange={(e) => setScale(e.target.value)} />

        <div style={{ marginBottom: "4px" }}><div style={labelMain}>tone</div></div>
        <input style={fieldInputStyle} value={tone} onChange={(e) => setTone(e.target.value)} />

        <ActionWithHelp
          buttonStyle={mainButtonStyle}
          buttonLabel="📝 توليد خطة المشروع (AI Plan)"
          onClick={generatePlan}
          helpModeEnabled={helpModeEnabled}
          helpText={"ينشئ وثيقة تحليل رسمية جاهزة للعميل لعرضها قبل البناء."}
        />

        {planPreview && (
          <>
            <div style={{ marginTop: "16px", fontSize: "12px", color: "#fff" }}>المعاينة (Preview):</div>
            <pre
              style={{
                backgroundColor: "#111",
                border: "1px solid #444",
                borderRadius: "10px",
                padding: "12px",
                fontSize: "12px",
                lineHeight: 1.5,
                color: "#ddd",
                whiteSpace: "pre-wrap",
                wordBreak: "break-word",
                maxHeight: "300px",
                overflowY: "auto",
                marginTop: "8px",
              }}
            >
              {planPreview}
            </pre>

            <ActionWithHelp
              buttonStyle={secondaryButtonStyle}
              buttonLabel="💾 حفظ الخطة في Notion"
              onClick={savePlanToNotion}
              helpModeEnabled={helpModeEnabled}
              helpText={"يحفظ هذه الخطة داخل Notion لتكون وثيقة رسمية للعميل."}
            />

            {savingPlanStatus && <div style={{ fontSize: "11px", color: "#0f0", marginTop: "8px" }}>{savingPlanStatus}</div>}
          </>
        )}
      </div>

      <div style={{ fontSize: "11px", color: "#555", textAlign: "center", marginTop: "40px" }}>InfinityX © {new Date().getFullYear()} — مصنع منصات ذكية</div>
    </div>
  );
}
