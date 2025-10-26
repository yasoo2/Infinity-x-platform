import React from "react";

// العرض:
const itemStyle = (active)=>({
  padding:"10px 12px",
  borderRadius:"8px",
  background: active ? "#111" : "transparent",
  border: active ? "1px solid #333" : "1px solid transparent",
  color:"#fff",
  fontSize:"13px",
  fontWeight: active ? "600" : "400",
  cursor:"pointer"
});

export default function Sidebar({ t, current, onNavigate, showHelp }) {
  const links = [
    { key:"dashboard", label:t.dashboard, help:"عرض الحالة الحية للنظام، المستخدمين الأونلاين، وضع المصنع والنظام، ونبض الإيرادات." },
    { key:"users", label:t.users, help:"إدارة المستخدمين، الترقية والتنزيل بين user/admin/super_admin، مشاهدة آخر دخول." },
    { key:"factory", label:t.smartFactory, help:"المصنع الذكي: إنشاء مشاريع، القوالب، تطبيق موبايل، جو، الربط، سجل التعديلات." },
    { key:"health", label:t.systemHealth, help:"مؤشرات السلامة، الأداء، عدد الجلسات النشطة، Alerts." },
    { key:"revenue", label:t.revenue, help:"نظرة مالية داخلية: العملاء المهمين (VIP)، الفرص لرفع الباقة." }
  ];

  return (
    <div style={{
      width:"230px",
      background:"#000",
      borderRight:"1px solid #222",
      color:"#fff",
      padding:"12px",
      display:"flex",
      flexDirection:"column",
      gap:"8px",
      fontFamily:"sans-serif"
    }}>
      {links.map(l => (
        <div
          key={l.key}
          style={itemStyle(current===l.key)}
          onClick={()=>onNavigate(l.key)}
          title={showHelp ? l.help : ""}
        >
          {l.label}
        </div>
      ))}
    </div>
  );
}
