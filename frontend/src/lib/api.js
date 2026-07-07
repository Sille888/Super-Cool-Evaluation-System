const API_URL = (import.meta.env.VITE_API_URL || "").replace(/\/+$/, "");

const PW_KEY = "bewertung_admin_pw";

export function getAdminPw() {
  return localStorage.getItem(PW_KEY) || "";
}
export function setAdminPw(pw) {
  localStorage.setItem(PW_KEY, pw);
}
export function clearAdminPw() {
  localStorage.removeItem(PW_KEY);
}

async function request(method, path, body, admin = false) {
  const headers = {};
  if (body !== undefined) headers["Content-Type"] = "application/json";
  if (admin) headers["X-Admin-Password"] = getAdminPw();

  const res = await fetch(API_URL + path, {
    method,
    headers,
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });

  let data = null;
  try {
    data = await res.json();
  } catch {
    /* leerer Body */
  }
  if (!res.ok) {
    const e = new Error((data && data.error) || "Fehler " + res.status);
    e.status = res.status;
    throw e;
  }
  return data;
}

export const api = {
  // Öffentlich
  getProject: (id) => request("GET", `/api/projects/${id}`),
  submit: (id, answers) => request("POST", `/api/projects/${id}/submissions`, { answers }),
  getResults: (id) => request("GET", `/api/projects/${id}/results`),

  // Admin – Auth
  login: (password) => request("POST", `/api/admin/login`, { password }),
  changePassword: (new_password) => request("POST", `/api/admin/password`, { new_password }, true),

  // Admin – Projekte
  listProjects: () => request("GET", `/api/admin/projects`, undefined, true),
  createProject: (name) => request("POST", `/api/admin/projects`, { name }, true),
  getProjectAdmin: (id) => request("GET", `/api/admin/projects/${id}`, undefined, true),
  updateProject: (id, patch) => request("PATCH", `/api/admin/projects/${id}`, patch, true),
  deleteProject: (id) => request("DELETE", `/api/admin/projects/${id}`, undefined, true),
  duplicateProject: (id) => request("POST", `/api/admin/projects/${id}/duplicate`, {}, true),

  // Admin – Kriterien
  createCriterion: (pid, data) => request("POST", `/api/admin/projects/${pid}/criteria`, data, true),
  updateCriterion: (cid, data) => request("PATCH", `/api/admin/criteria/${cid}`, data, true),
  deleteCriterion: (cid) => request("DELETE", `/api/admin/criteria/${cid}`, undefined, true),
  duplicateCriterion: (cid) => request("POST", `/api/admin/criteria/${cid}/duplicate`, {}, true),

  // Admin – Gruppen
  createGroup: (pid, name) => request("POST", `/api/admin/projects/${pid}/groups`, { name }, true),
  reorderGroups: (pid, order) => request("POST", `/api/admin/projects/${pid}/groups/reorder`, { order }, true),
  updateGroup: (gid, data) => request("PATCH", `/api/admin/groups/${gid}`, data, true),
  deleteGroup: (gid) => request("DELETE", `/api/admin/groups/${gid}`, undefined, true),
  duplicateGroup: (gid) => request("POST", `/api/admin/groups/${gid}/duplicate`, {}, true),

  // Admin – Bewertungen
  listSubmissions: (pid) => request("GET", `/api/admin/projects/${pid}/submissions`, undefined, true),
  resetSubmissions: (pid) => request("DELETE", `/api/admin/projects/${pid}/submissions`, undefined, true),
};
