import { makeClient } from "./apiClient.js";

export async function createQuickProject(token, { clientName, projectType, language }) {
  const c = makeClient(token);
  const r = await c.post("/factory/quick", { clientName, projectType, language });
  return r.data;
}

export async function listProjects(token) {
  const c = makeClient(token);
  const r = await c.get("/factory/projects");
  return r.data;
}

export async function listChangesApi(token) {
  const c = makeClient(token);
  const r = await c.get("/factory/changes");
  return r.data;
}
