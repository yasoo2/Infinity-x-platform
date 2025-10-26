// يقدّم بيانات للحالة الصحية + التنبيهات
import { getDB } from "./db.js";

export async function getSystemStatus() {
  // هون بنرجع أشياء للـ Dashboard:
  // - حالة الداتا بيز
  // - عدد المستخدمين الأونلاين
  // - حالة الوضع (normal / maintenance / locked)
  // - alerts أساسية
  const db = getDB();

  // users online = عندهم session active
  const onlineUsers = await db.collection("sessions").countDocuments({ active: true });

  // احصاء حسب role
  const rolesAgg = await db.collection("users").aggregate([
    {
      $group: {
        _id: "$role",
        count: { $sum: 1 },
        onlineNow: {
          $sum: {
            $cond: ["$online", 1, 0]
          }
        }
      }
    }
  ]).toArray();

  const factoryMode = process.env.FACTORY_MODE || "safe"; // safe / live
  const systemMode = process.env.SYSTEM_MODE || "normal"; // normal / maintenance / locked

  // TODO: performance/security scan automation (Phase2)
  const alerts = [];

  return {
    ok: true,
    dbConnected: true,
    factoryMode,
    systemMode,
    onlineUsers,
    rolesAgg,
    alerts
  };
}
