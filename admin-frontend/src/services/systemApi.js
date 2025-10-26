import { makeClient } from "./apiClient.js";

export async function fetchSystemStatus(token) {
  const c = makeClient(token);
  const r = await c.get("/system/status");
  return r.data;
}

export async function setSystemMode(token, mode) {
  const c = makeClient(token);
  const r = await c.post("/system/mode", { mode });
  return r.data;
}

export async function setFactoryMode(token, mode) {
  const c = makeClient(token);
  const r = await c.post("/system/factory-mode", { mode });
  return r.data;
}
