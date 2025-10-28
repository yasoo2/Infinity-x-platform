// dashboard-x/src/AdminHome.jsx

import { useEffect, useState } from "react";
import { getSystemStatus } from "./apiClient/adminApi";

export default function AdminHome() {
  const [status, setStatus] = useState(null);
  const [err, setErr] = useState(null);

  useEffect(() => {
    async function load() {
      try {
        const token = localStorage.getItem("sessionToken");
        if (!token) {
          setErr("No sessionToken. Please log in first.");
          return;
        }
        const data = await getSystemStatus(token);
        setStatus(data);
      } catch (e) {
        console.log("status error:", e);
        setErr("Failed to load status");
      }
    }
    load();
  }, []);

  return (
    <div className="min-h-screen bg-[#0a0b10] text-white p-6">
      <div className="max-w-[1200px] mx-auto flex flex-col gap-6">

        <header className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-semibold text-white">
              InfinityX Control Panel
            </h1>
            <p className="text-sm text-[#8b8ea8]">
              Live System / Joe / Factory / Security
            </p>
          </div>

          <div className="text-xs text-[#8b8ea8] mt-4 sm:mt-0">
            <div>User: {localStorage.getItem("userEmail")}</div>
            <div>Role: {localStorage.getItem("userRole")}</div>
          </div>
        </header>

        {err && (
          <div className="bg-[#141622] border border-[#ff38a4] text-[#ff38a4] rounded-xl2 p-4 text-sm">
            {err}
          </div>
        )}

        <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <InfoCard
            label="Total Users"
            value={status?.system?.usersTotal ?? "--"}
            color="neonBlue"
          />
          <InfoCard
            label="Active Sessions"
            value={status?.system?.activeSessions ?? "--"}
            color="neonGreen"
          />
          <InfoCard
            label="Mongo"
            value={status?.system?.mongoOnline ? "Online" : "Down"}
            color="neonPink"
          />
          <InfoCard
            label="Redis"
            value={status?.system?.redisOnline ? "Online" : "Off"}
            color="neonGreen"
          />
        </section>

        <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-2 gap-4">
          <InfoCard
            label="Factory"
            value={status?.system?.factoryOnline === false ? "?" : "Online"}
            color="neonBlue"
          />
          <InfoCard
            label="Joe"
            value={status?.joeRecent ? "Running" : "Idle"}
            color="neonPink"
          />
        </section>

        <section className="bg-[#141622] rounded-xl2 border border-[#3d7eff] p-4 shadow-[0_0_20px_rgba(61,126,255,0.4)]">
          <h2 className="text-lg font-semibold text-white mb-2">
            Joe Recent Activity
          </h2>
          <div className="text-xs text-[#8b8ea8] max-h-[200px] overflow-y-auto space-y-2">
            {status?.joeRecent?.length > 0 ? (
              status.joeRecent.map((evt, i) => (
                <div
                  key={i}
                  className="border-b border-[#0a0b10] pb-2"
                >
                  <div className="text-white">
                    {evt.action}
                  </div>
                  <div className="text-[#8b8ea8] break-all">
                    {evt.detail}
                  </div>
                  <div className="text-[11px] text-[#3d7eff]">
                    {new Date(evt.ts).toLocaleString()}
                  </div>
                </div>
              ))
            ) : (
              <div>No activity found (yet).</div>
            )}
          </div>
        </section>

      </div>
    </div>
  );
}

// كرت معلومات صغير بألوان النيون تبعتك
function InfoCard({ label, value, color }) {
  let borderColor = "#4dff91";
  let glow = "0 0 20px rgba(77,255,145,0.4)";
  if (color === "neonBlue") {
    borderColor = "#3d7eff";
    glow = "0 0 20px rgba(61,126,255,0.4)";
  }
  if (color === "neonPink") {
    borderColor = "#ff38a4";
    glow = "0 0 20px rgba(255,56,164,0.4)";
  }

  return (
    <div
      className="bg-[#141622] rounded-xl2 p-4"
      style={{
        border: `1px solid ${borderColor}`,
        boxShadow: glow
      }}
    >
      <div className="text-xs text-[#8b8ea8]">{label}</div>
      <div className="text-xl font-semibold text-white">{value}</div>
    </div>
  );
}
