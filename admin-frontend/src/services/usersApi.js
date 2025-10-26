import { makeClient } from "./apiClient.js";

export async function fetchUsers(token) {
  const c = makeClient(token);
  const r = await c.get("/users");
  return r.data;
}
