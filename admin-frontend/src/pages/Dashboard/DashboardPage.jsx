import React, { useEffect, useState } from "react";
import { fetchSystemStatus, setSystemMode } from "../../services/systemApi.js";

export default function DashboardPage({ t, token, showHelp }) {
  const [status, setStatus] = useState(null);
  const [err, setErr] = useState("");

  async function load() {
    try {
      const data = await fetchSystemStatus(token);
      if (!data.ok) throw new Error("status not ok");
      setStatus(data);
    } catch(e){
      setErr(e.message);
    }
  }

  useEffect(()=>{ load(); },[]);

  async function toggleSystemMode() {
    if (!status) return;
    const next = status.systemMode==="normal" ? "maintenance"
      : status.systemMode==="maintenance" ? "locked"
      : "normal";

    try {
      await setSystemMode(token, next);
      await load();
    } catch(e){
      console.error(e);
    }
  }

  return (
    <div style={pageStyle}>
      <h2 style={titleStyle} title={showHelp? "ملخص حالة الشركة / Summary of live system":""}>
        {t.dashboard}
      </h2>
      {err && <div style={{color:"#ff2d2d",fontSize:"12px"}}>{err}</div>}

      {!status ? (
        <div style={{color:"#888",fontSize:"12px"}}>Loading...</div>
      ) : (
        <div style={gridStyle}>
          <div style={cardStyle} title={showHelp? "عدد المستخدمين النشطين حاليا":""
          }>
            <div style={cardLabel}>{t.usersOnline}</div>
            <div style={cardValue}>{status.onlineUsers ?? 0}</div>
          </div>

          <div style={cardStyle} title={showHelp? "الوضع العام (Normal / Maintenance / Locked)":""}>
            <div style={cardLabel}>{t.systemMode}</div>
            <div style={cardValue}>{status.systemMode}</div>
            <button
              style={smallBtn}
              onClick={toggleSystemMode}
            >toggle</button>
          </div>

          <div style={cardStyle} title={showHelp? "وضع المصنع (safe=ستيج فقط / live=تطبيق مباشر)":""}>
            <div style={cardLabel}>{t.factoryMode}</div>
            <div style={cardValue}>{status.factoryMode}</div>
          </div>

          <div style={cardStyle} title={showHelp? "تنبيهات السرعة / الأمن / الجودة":""}>
            <div style={cardLabel}>Alerts</div>
            <div style={{
              color: status.alerts && status.alerts.length ? "#ff2d2d" : "#17c964",
              fontWeight:"700"
            }}>
              {status.alerts && status.alerts.length ? status.alerts.length+" issue(s)" : "OK"}
            </div>
          </div>

          <div style={cardStyle}
            title={showHelp? "إجمالي توزيع الأدوار وعددهم أونلاين الآن":""
          }>
            <div style={cardLabel}>{t.role}</div>
            <div style={{fontSize:"11px",color:"#aaa",lineHeight:"16px"}}>
              {(status.rolesAgg||[]).map(r => (
                <div key={r._id}>
                  {r._id}: {r.count} total / {r.onlineNow} online
                </div>
              ))}
            </div>
          </div>

        </div>
      )}
    </div>
  );
}

const pageStyle = { color:"#fff", padding:"16px", fontFamily:"sans-serif" };
const titleStyle = { color:"#00e5ff", fontSize:"16px", fontWeight:"600", marginBottom:"16px" };
const gridStyle = { display:"grid", gridTemplateColumns:"repeat(auto-fit,minmax(180px,1fr))", gap:"12px" };
const cardStyle = { background:"#111", border:"1px solid #333", borderRadius:"12px", padding:"12px" };
const cardLabel = { fontSize:"12px", color:"#888", marginBottom:"4px" };
const cardValue = { fontSize:"20px", color:"#fff", fontWeight:"700" };
const smallBtn = {
  marginTop:"8px",
  fontSize:"10px",
  background:"#222",
  color:"#fff",
  border:"1px solid #444",
  borderRadius:"6px",
  cursor:"pointer",
  padding:"4px 6px",
  fontWeight:"600"
};
