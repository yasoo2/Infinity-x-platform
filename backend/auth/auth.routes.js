import { Router } from "express";
import { loginEmail, loginPhone, loginGoogleCallback, logout } from "./auth.controller.js";
import { authRequired } from "../middleware/authRequired.js";

const r = Router();

r.post("/login/email", loginEmail);
r.post("/login/phone", loginPhone);
r.get("/google/callback", loginGoogleCallback);

r.post("/logout", authRequired, logout);

export default r;
