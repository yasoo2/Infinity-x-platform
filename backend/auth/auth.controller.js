import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { getDB } from "../services/db.js";
import { ROLES } from "../config/roles.js";

async function ensureSuperAdminExists() {
  const db = getDB();
  const email = process.env.SUPER_ADMIN_EMAIL;
  const pass = process.env.SUPER_ADMIN_PASSWORD || "younes2025";
  const phone = process.env.SUPER_ADMIN_PHONE || "0000000000";

  if (!email) return;

  const existing = await db.collection("users").findOne({ email });
  if (existing) {
    console.log("[Auth] Super admin already exists");
    return;
  }

  const hash = await bcrypt.hash(pass, 10);
  await db.collection("users").insertOne({
    email,
    phone,
    passwordHash: hash,
    role: ROLES.SUPER_ADMIN,
    createdAt: new Date(),
    lastLoginAt: null,
    online: false
  });

  console.log("[Auth] Super admin created:", email);
}

export async function initAuthBootstrap() {
  await ensureSuperAdminExists();
}

async function issueToken(user) {
  const payload = {
    _id: user._id,
    role: user.role,
    email: user.email
  };
  const token = jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: "30d" });
  return token;
}

function markOnline(db, userId) {
  return Promise.all([
    db.collection("users").updateOne(
      { _id: userId },
      { $set: { online: true, lastLoginAt: new Date() } }
    ),
    db.collection("sessions").insertOne({
      userId,
      startAt: new Date(),
      active: true
    })
  ]);
}

export async function loginEmail(req, res) {
  const { email, password } = req.body;
  const db = getDB();
  const user = await db.collection("users").findOne({ email });
  if (!user) return res.status(401).json({ ok: false, error: "Invalid credentials" });

  const match = await bcrypt.compare(password, user.passwordHash || "");
  if (!match) return res.status(401).json({ ok: false, error: "Invalid credentials" });

  const token = await issueToken(user);
  await markOnline(db, user._id);

  return res.json({
    ok: true,
    token,
    user: { email: user.email, role: user.role, phone: user.phone }
  });
}

export async function loginPhone(req, res) {
  const { phone, password } = req.body;
  const db = getDB();
  const user = await db.collection("users").findOne({ phone });
  if (!user) return res.status(401).json({ ok: false, error: "Invalid credentials" });

  const match = await bcrypt.compare(password, user.passwordHash || "");
  if (!match) return res.status(401).json({ ok: false, error: "Invalid credentials" });

  const token = await issueToken(user);
  await markOnline(db, user._id);

  return res.json({
    ok: true,
    token,
    user: { email: user.email, role: user.role, phone: user.phone }
  });
}

// تسجيل الدخول بجوجل:
// الواجهة الأمامية رح تفتح نافذة جوجل، تاخد OAuth code
// تبعته هون /auth/google/callback
// إحنا هون بنبدله بحساب مستخدم
export async function loginGoogleCallback(req, res) {
  // TODO: استبدال الـcode بتوكن من Google وقراءة ايميل المستخدم
  // بعدها ننشئ/نجيب يوزر بنفس الايميل ونصدر توكن JWT
  return res.json({
    ok: false,
    note: "Google OAuth integration requires CLIENT_ID/SECRET from you. Once provided, this route will create/login the user automatically."
  });
}

export async function logout(req, res) {
  const db = getDB();
  const userId = req.user?._id;
  if (userId) {
    await db.collection("users").updateOne(
      { _id: userId },
      { $set: { online: false } }
    );
    await db.collection("sessions").updateMany(
      { userId, active: true },
      { $set: { active: false, endAt: new Date() } }
    );
  }
  return res.json({ ok: true });
}
