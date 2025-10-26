import { Router } from "express";
import { authRequired } from "../middleware/authRequired.js";
import { roleRequired } from "../middleware/roleRequired.js";
import { ROLES } from "../config/roles.js";
import { getDB } from "../services/db.js";
import bcrypt from "bcryptjs";

const r = Router();

// قائمة المستخدمين مرتبين حسب آخر دخول
r.get("/", authRequired, roleRequired([ROLES.SUPER_ADMIN, ROLES.ADMIN]), async (req, res) => {
  const db = getDB();
  const all = await db.collection("users").aggregate([
    {
      $lookup: {
        from: "sessions",
        localField: "_id",
        foreignField: "userId",
        as: "sessions"
      }
    },
    {
      $addFields: {
        lastSession: { $arrayElemAt: [ { $slice: [ "$sessions", -1 ] }, 0 ] },
        sessionDurationMs: {
          $cond: [
            { $gt: [ { $size: "$sessions" }, 0 ] },
            {
              $subtract: [
                { $ifNull: [ { $arrayElemAt: [ "$sessions.endAt", -1 ] }, new Date() ] },
                { $ifNull: [ { $arrayElemAt: [ "$sessions.startAt", -1 ] }, new Date() ] }
              ]
            },
            0
          ]
        }
      }
    },
    { $sort: { "lastLoginAt": -1 } }
  ]).toArray();

  const cleaned = all.map(u => ({
    id: u._id,
    email: u.email,
    phone: u.phone,
    role: u.role,
    lastLoginAt: u.lastLoginAt,
    online: u.online,
    sessionDurationMs: u.sessionDurationMs
  }));

  res.json({ ok: true, users: cleaned });
});

// تفاصيل مستخدم واحد
r.get("/:id", authRequired, roleRequired([ROLES.SUPER_ADMIN, ROLES.ADMIN]), async (req,res)=>{
  const db = getDB();
  const u = await db.collection("users").findOne({ _id: req.params.id });
  if (!u) return res.status(404).json({ ok:false, error:"Not found" });
  res.json({
    ok:true,
    user:{
      id:u._id,
      email:u.email,
      phone:u.phone,
      role:u.role,
      lastLoginAt:u.lastLoginAt,
      createdAt:u.createdAt,
      online:u.online
    }
  });
});

// تعديل دور
r.post("/:id/role", authRequired, roleRequired([ROLES.SUPER_ADMIN]), async (req,res)=>{
  const { role } = req.body;
  const db = getDB();
  await db.collection("users").updateOne({ _id:req.params.id }, { $set:{ role }});
  res.json({ ok:true });
});

// تغيير باسورد (سوبر أدمن يقدر يصلح لمستخدم)
r.post("/:id/password", authRequired, roleRequired([ROLES.SUPER_ADMIN]), async (req,res)=>{
  const { newPassword } = req.body;
  const hash = await bcrypt.hash(newPassword,10);
  const db = getDB();
  await db.collection("users").updateOne({ _id:req.params.id }, { $set:{ passwordHash:hash }});
  res.json({ ok:true });
});

export default r;
