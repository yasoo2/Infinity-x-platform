import express from "express";
import cors from "cors";
import helmet from "helmet";
import rateLimit from "express-rate-limit";
import dotenv from "dotenv";
import { connectDB } from "./services/db.js";
import { initRedis } from "./services/redis.js";
import { initAuthBootstrap } from "./auth/auth.controller.js";

import authRoutes from "./auth/auth.routes.js";
import userRoutes from "./users/user.routes.js";
import factoryRoutes from "./factory/factory.routes.js";
import joeRoutes from "./joe/joe.routes.js";
import systemRoutes from "./system/system.routes.js";
import connectionsRoutes from "./connections/connections.routes.js";

import { errorHandler } from "./middleware/errorHandler.js";

dotenv.config();

const app = express();
const PORT = process.env.PORT || 10000;

// أمان عام
app.use(helmet());
app.use(rateLimit({ windowMs: 15 * 60 * 1000, max: 200 }));
app.use(express.json({ limit: "2mb" }));
app.use(cors({
  origin: process.env.CORS_ORIGINS ? process.env.CORS_ORIGINS.split(",") : ["*"],
  credentials: true
}));

// جاهزية بسيطة
app.get("/health", async (req,res)=>{
  res.json({ ok:true, time: new Date().toISOString() });
});

// Routes
app.use("/auth", authRoutes);
app.use("/users", userRoutes);
app.use("/factory", factoryRoutes);
app.use("/joe", joeRoutes);
app.use("/system", systemRoutes);
app.use("/connections", connectionsRoutes);

// أخطاء عامة
app.use(errorHandler);

// تشغيل
connectDB()
  .then(() => {
    initRedis();
    return initAuthBootstrap();
  })
  .then(() => {
    app.listen(PORT, () => {
      console.log(`InfinityX Backend running on ${PORT}`);
    });
  })
  .catch(err => {
    console.error("Startup error:", err);
    process.exit(1);
  });
