import { makeClient } from "./apiClient.js";

export async function askJoe(token, message) {
  const c = makeClient(token);
  const r = await c.post("/joe/chat", { message });
  return r.data;
}

export async function approveJoeAction(token, approvedActionDescription) {
  const c = makeClient(token);
  const r = await c.post("/joe/execute", { approvedActionDescription });
  return r.data;
}
