import {
  json,
  err,
  corsHeaders,
  genId,
  sha256,
  getAdminHash,
  checkAdmin,
  timestamp,
} from "./helpers.js";

export default {
  async fetch(request, env) {
    if (request.method === "OPTIONS") {
      return new Response(null, { status: 204, headers: corsHeaders() });
    }
    try {
      return await route(request, env);
    } catch (e) {
      return err("Serverfehler: " + (e && e.message ? e.message : String(e)), 500);
    }
  },
};

async function route(request, env) {
  const url = new URL(request.url);
  const path = url.pathname.replace(/\/+$/, "");
  const seg = path.split("/").filter(Boolean); // z.B. ['api','admin','projects']
  const m = request.method;

  if (seg[0] !== "api") return err("Nicht gefunden", 404);

  // ---------- Öffentliche Routen ----------
  if (seg[1] === "projects" && seg[2] && !seg[3] && m === "GET") {
    return getProjectForForm(env, seg[2]);
  }
  if (seg[1] === "projects" && seg[2] && seg[3] === "submissions" && m === "POST") {
    return submitEvaluation(request, env, seg[2]);
  }
  if (seg[1] === "projects" && seg[2] && seg[3] === "results" && m === "GET") {
    return getResults(env, seg[2]);
  }

  // ---------- Admin-Routen ----------
  if (seg[1] === "admin") {
    // Login prüft Passwort selbst
    if (seg[2] === "login" && m === "POST") return adminLogin(request, env);

    const ok = await checkAdmin(request, env);
    if (!ok) return err("Nicht autorisiert", 401);

    if (seg[2] === "password" && m === "POST") return changePassword(request, env);

    if (seg[2] === "projects" && !seg[3] && m === "GET") return listProjects(env);
    if (seg[2] === "projects" && !seg[3] && m === "POST") return createProject(request, env);
    if (seg[2] === "projects" && seg[3] && seg[4] === "duplicate" && m === "POST") return duplicateProject(env, seg[3]);
    if (seg[2] === "projects" && seg[3] && !seg[4] && m === "GET") return getProjectAdmin(env, seg[3]);
    if (seg[2] === "projects" && seg[3] && !seg[4] && m === "PATCH") return updateProject(request, env, seg[3]);
    if (seg[2] === "projects" && seg[3] && !seg[4] && m === "DELETE") return deleteProject(env, seg[3]);

    if (seg[2] === "projects" && seg[3] && seg[4] === "criteria" && m === "POST") return createCriterion(request, env, seg[3]);
    if (seg[2] === "projects" && seg[3] && seg[4] === "groups" && seg[5] === "reorder" && m === "POST") return reorderGroups(request, env, seg[3]);
    if (seg[2] === "projects" && seg[3] && seg[4] === "groups" && m === "POST") return createGroup(request, env, seg[3]);
    if (seg[2] === "projects" && seg[3] && seg[4] === "submissions" && m === "GET") return listSubmissions(env, seg[3]);
    if (seg[2] === "projects" && seg[3] && seg[4] === "submissions" && m === "DELETE") return resetSubmissions(env, seg[3]);

    if (seg[2] === "criteria" && seg[3] && !seg[4] && m === "PATCH") return updateCriterion(request, env, seg[3]);
    if (seg[2] === "criteria" && seg[3] && !seg[4] && m === "DELETE") return deleteCriterion(env, seg[3]);
    if (seg[2] === "criteria" && seg[3] && seg[4] === "duplicate" && m === "POST") return duplicateCriterion(env, seg[3]);

    if (seg[2] === "groups" && seg[3] && !seg[4] && m === "PATCH") return updateGroup(request, env, seg[3]);
    if (seg[2] === "groups" && seg[3] && !seg[4] && m === "DELETE") return deleteGroup(env, seg[3]);
    if (seg[2] === "groups" && seg[3] && seg[4] === "duplicate" && m === "POST") return duplicateGroup(env, seg[3]);
  }

  return err("Nicht gefunden", 404);
}

/* =======================================================================
   ÖFFENTLICH
   ======================================================================= */

async function loadGroupsWithCriteria(env, projectId) {
  const groups = (
    await env.DB.prepare(
      "SELECT id, name, position FROM groups WHERE project_id = ? ORDER BY position ASC, created_at ASC"
    )
      .bind(projectId)
      .all()
  ).results;

  const result = [];
  for (const g of groups) {
    const participants = (
      await env.DB.prepare(
        "SELECT name FROM group_participants WHERE group_id = ? ORDER BY position ASC"
      )
        .bind(g.id)
        .all()
    ).results.map((p) => p.name);

    const crit = (
      await env.DB.prepare(
        `SELECT c.id, c.title, c.description, c.type, c.star_labels, gc.position
         FROM group_criteria gc
         JOIN criteria c ON c.id = gc.criterion_id
         WHERE gc.group_id = ?
         ORDER BY gc.position ASC`
      )
        .bind(g.id)
        .all()
    ).results.map((c) => ({
      id: c.id,
      title: c.title,
      description: c.description,
      type: c.type,
      star_labels: c.star_labels ? JSON.parse(c.star_labels) : ["", "", "", "", ""],
    }));

    result.push({ id: g.id, name: g.name, participants, criteria: crit });
  }
  return result;
}

async function getProjectForForm(env, id) {
  const p = await env.DB.prepare(
    "SELECT id, name, evaluation_unlocked FROM projects WHERE id = ?"
  )
    .bind(id)
    .first();
  if (!p) return err("Projekt nicht gefunden", 404);
  const groups = await loadGroupsWithCriteria(env, id);
  return json({ ...p, evaluation_unlocked: !!p.evaluation_unlocked, groups });
}

async function submitEvaluation(request, env, projectId) {
  const p = await env.DB.prepare("SELECT id FROM projects WHERE id = ?").bind(projectId).first();
  if (!p) return err("Projekt nicht gefunden", 404);

  const body = await request.json().catch(() => null);
  if (!body || !Array.isArray(body.answers)) return err("Ungültige Daten");

  // Serverseitige Vollständigkeitsprüfung
  const groups = await loadGroupsWithCriteria(env, projectId);
  const need = new Set();
  const critType = {};
  for (const g of groups) {
    for (const c of g.criteria) {
      need.add(g.id + "::" + c.id);
      critType[c.id] = c.type;
    }
  }
  const have = new Set();
  for (const a of body.answers) {
    const key = a.group_id + "::" + a.criterion_id;
    if (!need.has(key)) continue;
    if (a.skipped) {
      have.add(key);
      continue;
    }
    if (critType[a.criterion_id] === "stars") {
      if (!(a.stars >= 1 && a.stars <= 5)) continue;
    } else {
      if (!a.text || !String(a.text).trim()) continue;
    }
    have.add(key);
  }
  if (have.size < need.size) {
    return err("Nicht alle Felder ausgefüllt", 422);
  }

  const subId = genId(12);
  const now = timestamp();
  await env.DB.prepare(
    "INSERT INTO submissions (id, project_id, created_at) VALUES (?, ?, ?)"
  )
    .bind(subId, projectId, now)
    .run();

  const stmt = env.DB.prepare(
    "INSERT INTO answers (id, submission_id, group_id, criterion_id, stars, text) VALUES (?, ?, ?, ?, ?, ?)"
  );
  const batch = [];
  for (const a of body.answers) {
    const key = a.group_id + "::" + a.criterion_id;
    if (!need.has(key)) continue;
    const isStars = critType[a.criterion_id] === "stars";
    const skipped = !!a.skipped;
    batch.push(
      stmt.bind(
        genId(12),
        subId,
        a.group_id,
        a.criterion_id,
        skipped ? null : isStars ? a.stars : null,
        skipped ? null : isStars ? null : String(a.text).trim()
      )
    );
  }
  if (batch.length) await env.DB.batch(batch);
  return json({ ok: true });
}

async function getResults(env, projectId) {
  const p = await env.DB.prepare(
    "SELECT id, name, evaluation_unlocked FROM projects WHERE id = ?"
  )
    .bind(projectId)
    .first();
  if (!p) return err("Projekt nicht gefunden", 404);
  if (!p.evaluation_unlocked) return err("Auswertung noch nicht freigeschaltet", 403);

  return json(await computeResults(env, projectId, p.name));
}

async function computeResults(env, projectId, projectName) {
  const groups = await loadGroupsWithCriteria(env, projectId);
  const subCount =
    (await env.DB.prepare(
      "SELECT COUNT(*) AS n FROM submissions WHERE project_id = ?"
    )
      .bind(projectId)
      .first()).n || 0;

  // Alle Stern-Antworten laden
  const rows = (
    await env.DB.prepare(
      `SELECT a.group_id, a.criterion_id, a.stars
       FROM answers a
       JOIN submissions s ON s.id = a.submission_id
       WHERE s.project_id = ? AND a.stars IS NOT NULL`
    )
      .bind(projectId)
      .all()
  ).results;

  // Aggregation: sum/count je (group, criterion)
  const agg = {}; // key group::crit -> {sum,count}
  for (const r of rows) {
    const k = r.group_id + "::" + r.criterion_id;
    if (!agg[k]) agg[k] = { sum: 0, count: 0 };
    agg[k].sum += r.stars;
    agg[k].count += 1;
  }
  const avg = (g, c) => {
    const a = agg[g + "::" + c];
    return a && a.count ? a.sum / a.count : null;
  };

  // Stern-Kriterien (eindeutig über Projekt, nur die mit type 'stars')
  const critMap = {};
  for (const g of groups)
    for (const c of g.criteria) if (c.type === "stars") critMap[c.id] = c.title;

  const criteriaResults = [];
  for (const cid of Object.keys(critMap)) {
    const scores = [];
    for (const g of groups) {
      if (!g.criteria.some((c) => c.id === cid)) continue; // nur zugeordnete Gruppen
      const a = avg(g.id, cid);
      scores.push({ group_id: g.id, group_name: g.name, average: a });
    }
    scores.sort((x, y) => (y.average ?? -1) - (x.average ?? -1));
    const best = scores.find((s) => s.average != null);
    criteriaResults.push({
      criterion_id: cid,
      title: critMap[cid],
      best_group_id: best ? best.group_id : null,
      scores,
    });
  }

  // Gesamtwertung: erreichte Punkte vs. maximal mögliche Punkte, Ranking nach Prozent
  const totals = groups.map((g) => {
    let total_points = 0;
    let max_points = 0;
    for (const c of g.criteria) {
      if (c.type !== "stars") continue;
      const a = agg[g.id + "::" + c.id];
      if (a) {
        total_points += a.sum;
        max_points += a.count * 5;
      }
    }
    const percentage = max_points > 0 ? Math.round((total_points / max_points) * 1000) / 10 : null;
    return {
      group_id: g.id,
      group_name: g.name,
      total_points,
      max_points,
      percentage,
    };
  });
  totals.sort((a, b) => (b.percentage ?? -1) - (a.percentage ?? -1));

  return {
    project_id: projectId,
    name: projectName,
    submissions_count: subCount,
    criteria: criteriaResults,
    totals,
    winner_group_id: totals.length && totals[0].percentage > 0 ? totals[0].group_id : null,
  };
}

/* =======================================================================
   ADMIN
   ======================================================================= */

async function adminLogin(request, env) {
  const body = await request.json().catch(() => null);
  if (!body || !body.password) return err("Passwort fehlt");
  const stored = await getAdminHash(env);
  const ok = (await sha256(body.password)) === stored;
  return ok ? json({ ok: true }) : err("Falsches Passwort", 401);
}

async function changePassword(request, env) {
  const body = await request.json().catch(() => null);
  if (!body || !body.new_password || body.new_password.length < 4)
    return err("Neues Passwort zu kurz (min. 4 Zeichen)");
  const hash = await sha256(body.new_password);
  await env.DB.prepare(
    "INSERT OR REPLACE INTO settings (key, value) VALUES ('admin_password', ?)"
  )
    .bind(hash)
    .run();
  return json({ ok: true });
}

async function listProjects(env) {
  const rows = (
    await env.DB.prepare(
      "SELECT id, name, evaluation_unlocked, created_at FROM projects ORDER BY created_at DESC"
    ).all()
  ).results;
  const out = [];
  for (const p of rows) {
    const g = (await env.DB.prepare("SELECT COUNT(*) AS n FROM groups WHERE project_id = ?").bind(p.id).first()).n;
    const s = (await env.DB.prepare("SELECT COUNT(*) AS n FROM submissions WHERE project_id = ?").bind(p.id).first()).n;
    out.push({ ...p, evaluation_unlocked: !!p.evaluation_unlocked, groups_count: g, submissions_count: s });
  }
  return json(out);
}

async function createProject(request, env) {
  const body = await request.json().catch(() => null);
  const name = body && body.name ? String(body.name).trim() : "";
  if (!name) return err("Name fehlt");
  const id = genId(8);
  await env.DB.prepare(
    "INSERT INTO projects (id, name, evaluation_unlocked, created_at) VALUES (?, ?, 0, ?)"
  )
    .bind(id, name, timestamp())
    .run();
  return json({ id, name });
}

async function duplicateProject(env, id) {
  const p = await env.DB.prepare("SELECT * FROM projects WHERE id = ?").bind(id).first();
  if (!p) return err("Projekt nicht gefunden", 404);

  const newId = genId(8);
  const now = timestamp();

  const [criteria, groups] = (
    await Promise.all([
      env.DB.prepare("SELECT * FROM criteria WHERE project_id = ? ORDER BY created_at ASC").bind(id).all(),
      env.DB.prepare("SELECT * FROM groups WHERE project_id = ? ORDER BY position ASC, created_at ASC").bind(id).all(),
    ])
  ).map((r) => r.results);

  // Teilnehmer & Gruppenkriterien für alle Gruppen parallel laden
  const [allParts, allGc] = await Promise.all([
    Promise.all(
      groups.map((g) =>
        env.DB.prepare("SELECT name, position FROM group_participants WHERE group_id = ? ORDER BY position ASC")
          .bind(g.id).all().then((r) => r.results)
      )
    ),
    Promise.all(
      groups.map((g) =>
        env.DB.prepare("SELECT criterion_id, position FROM group_criteria WHERE group_id = ? ORDER BY position ASC")
          .bind(g.id).all().then((r) => r.results)
      )
    ),
  ]);

  const batch = [
    env.DB.prepare(
      "INSERT INTO projects (id, name, evaluation_unlocked, created_at) VALUES (?, ?, 0, ?)"
    ).bind(newId, p.name + " (Kopie)", now),
  ];

  // Kriterien duplizieren, alte → neue ID merken
  const critIdMap = {};
  const critStmt = env.DB.prepare(
    "INSERT INTO criteria (id, project_id, title, description, type, star_labels, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)"
  );
  for (const c of criteria) {
    const newCritId = genId(10);
    critIdMap[c.id] = newCritId;
    batch.push(critStmt.bind(newCritId, newId, c.title, c.description, c.type, c.star_labels, now));
  }

  // Gruppen + Teilnehmer + Gruppenkriterien duplizieren
  const groupStmt = env.DB.prepare(
    "INSERT INTO groups (id, project_id, name, position, created_at) VALUES (?, ?, ?, ?, ?)"
  );
  const partStmt = env.DB.prepare(
    "INSERT INTO group_participants (id, group_id, name, position) VALUES (?, ?, ?, ?)"
  );
  const gcStmt = env.DB.prepare(
    "INSERT INTO group_criteria (id, group_id, criterion_id, position) VALUES (?, ?, ?, ?)"
  );
  groups.forEach((g, i) => {
    const newGroupId = genId(10);
    batch.push(groupStmt.bind(newGroupId, newId, g.name, g.position, now));

    for (const pt of allParts[i])
      batch.push(partStmt.bind(genId(10), newGroupId, pt.name, pt.position));

    for (const x of allGc[i]) {
      const newCritId = critIdMap[x.criterion_id];
      if (!newCritId) continue;
      batch.push(gcStmt.bind(genId(10), newGroupId, newCritId, x.position));
    }
  });

  if (batch.length) await env.DB.batch(batch);

  return json({ id: newId });
}

async function getProjectAdmin(env, id) {
  const p = await env.DB.prepare(
    "SELECT id, name, evaluation_unlocked FROM projects WHERE id = ?"
  )
    .bind(id)
    .first();
  if (!p) return err("Projekt nicht gefunden", 404);

  const criteria = (
    await env.DB.prepare(
      "SELECT id, title, description, type, star_labels FROM criteria WHERE project_id = ? ORDER BY created_at ASC"
    )
      .bind(id)
      .all()
  ).results.map((c) => ({
    ...c,
    star_labels: c.star_labels ? JSON.parse(c.star_labels) : ["", "", "", "", ""],
  }));

  const groupRows = (
    await env.DB.prepare(
      "SELECT id, name, position FROM groups WHERE project_id = ? ORDER BY position ASC, created_at ASC"
    )
      .bind(id)
      .all()
  ).results;

  const groups = [];
  for (const g of groupRows) {
    const participants = (
      await env.DB.prepare(
        "SELECT name FROM group_participants WHERE group_id = ? ORDER BY position ASC"
      )
        .bind(g.id)
        .all()
    ).results.map((x) => x.name);
    const gc = (
      await env.DB.prepare(
        "SELECT criterion_id FROM group_criteria WHERE group_id = ? ORDER BY position ASC"
      )
        .bind(g.id)
        .all()
    ).results.map((x) => x.criterion_id);
    groups.push({ id: g.id, name: g.name, participants, criteria: gc });
  }

  const subs = (await env.DB.prepare("SELECT COUNT(*) AS n FROM submissions WHERE project_id = ?").bind(id).first()).n;

  return json({
    id: p.id,
    name: p.name,
    evaluation_unlocked: !!p.evaluation_unlocked,
    submissions_count: subs,
    criteria,
    groups,
  });
}

async function updateProject(request, env, id) {
  const body = await request.json().catch(() => ({}));
  const sets = [];
  const vals = [];
  if (typeof body.name === "string" && body.name.trim()) {
    sets.push("name = ?");
    vals.push(body.name.trim());
  }
  if (typeof body.evaluation_unlocked === "boolean") {
    sets.push("evaluation_unlocked = ?");
    vals.push(body.evaluation_unlocked ? 1 : 0);
  }
  if (!sets.length) return err("Nichts zu aktualisieren");
  vals.push(id);
  await env.DB.prepare(`UPDATE projects SET ${sets.join(", ")} WHERE id = ?`).bind(...vals).run();
  return json({ ok: true });
}

async function deleteProject(env, id) {
  // manuelles Kaskadieren
  const groups = (await env.DB.prepare("SELECT id FROM groups WHERE project_id = ?").bind(id).all()).results;
  for (const g of groups) {
    await env.DB.prepare("DELETE FROM group_participants WHERE group_id = ?").bind(g.id).run();
    await env.DB.prepare("DELETE FROM group_criteria WHERE group_id = ?").bind(g.id).run();
  }
  const subs = (await env.DB.prepare("SELECT id FROM submissions WHERE project_id = ?").bind(id).all()).results;
  for (const s of subs) await env.DB.prepare("DELETE FROM answers WHERE submission_id = ?").bind(s.id).run();
  await env.DB.prepare("DELETE FROM submissions WHERE project_id = ?").bind(id).run();
  await env.DB.prepare("DELETE FROM groups WHERE project_id = ?").bind(id).run();
  await env.DB.prepare("DELETE FROM criteria WHERE project_id = ?").bind(id).run();
  await env.DB.prepare("DELETE FROM projects WHERE id = ?").bind(id).run();
  return json({ ok: true });
}

/* ----- Kriterien ----- */
function normalizeCriterion(body) {
  const title = body && body.title ? String(body.title).trim() : "";
  const type = body.type === "text" ? "text" : "stars";
  const description = body.description ? String(body.description).trim() : null;
  let labels = Array.isArray(body.star_labels) ? body.star_labels.slice(0, 5) : [];
  while (labels.length < 5) labels.push("");
  labels = labels.map((l) => String(l || ""));
  return { title, type, description, star_labels: JSON.stringify(labels) };
}

async function createCriterion(request, env, projectId) {
  const p = await env.DB.prepare("SELECT id FROM projects WHERE id = ?").bind(projectId).first();
  if (!p) return err("Projekt nicht gefunden", 404);
  const body = await request.json().catch(() => null);
  const c = normalizeCriterion(body || {});
  if (!c.title) return err("Titel fehlt");
  const id = genId(10);
  await env.DB.prepare(
    "INSERT INTO criteria (id, project_id, title, description, type, star_labels, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)"
  )
    .bind(id, projectId, c.title, c.description, c.type, c.star_labels, timestamp())
    .run();
  return json({ id });
}

async function updateCriterion(request, env, id) {
  const body = await request.json().catch(() => null);
  const c = normalizeCriterion(body || {});
  if (!c.title) return err("Titel fehlt");
  await env.DB.prepare(
    "UPDATE criteria SET title = ?, description = ?, type = ?, star_labels = ? WHERE id = ?"
  )
    .bind(c.title, c.description, c.type, c.star_labels, id)
    .run();
  return json({ ok: true });
}

async function deleteCriterion(env, id) {
  await env.DB.prepare("DELETE FROM group_criteria WHERE criterion_id = ?").bind(id).run();
  await env.DB.prepare("DELETE FROM criteria WHERE id = ?").bind(id).run();
  return json({ ok: true });
}

async function duplicateCriterion(env, id) {
  const c = await env.DB.prepare("SELECT * FROM criteria WHERE id = ?").bind(id).first();
  if (!c) return err("Kriterium nicht gefunden", 404);
  const newId = genId(10);
  await env.DB.prepare(
    "INSERT INTO criteria (id, project_id, title, description, type, star_labels, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)"
  )
    .bind(newId, c.project_id, c.title + " (Kopie)", c.description, c.type, c.star_labels, timestamp())
    .run();
  return json({ id: newId });
}

/* ----- Gruppen ----- */
async function reorderGroups(request, env, projectId) {
  const body = await request.json().catch(() => null);
  if (!body || !Array.isArray(body.order)) return err("Ungültige Daten");
  const batch = body.order.map((id, i) =>
    env.DB.prepare("UPDATE groups SET position = ? WHERE id = ? AND project_id = ?").bind(i, id, projectId)
  );
  if (batch.length) await env.DB.batch(batch);
  return json({ ok: true });
}

async function createGroup(request, env, projectId) {
  const p = await env.DB.prepare("SELECT id FROM projects WHERE id = ?").bind(projectId).first();
  if (!p) return err("Projekt nicht gefunden", 404);
  const body = await request.json().catch(() => null);
  const name = body && body.name ? String(body.name).trim() : "";
  if (!name) return err("Name fehlt");
  const pos = (await env.DB.prepare("SELECT COUNT(*) AS n FROM groups WHERE project_id = ?").bind(projectId).first()).n;
  const id = genId(10);
  await env.DB.prepare(
    "INSERT INTO groups (id, project_id, name, position, created_at) VALUES (?, ?, ?, ?, ?)"
  )
    .bind(id, projectId, name, pos, timestamp())
    .run();
  return json({ id });
}

async function updateGroup(request, env, id) {
  const g = await env.DB.prepare("SELECT id FROM groups WHERE id = ?").bind(id).first();
  if (!g) return err("Gruppe nicht gefunden", 404);
  const body = await request.json().catch(() => ({}));

  if (typeof body.name === "string" && body.name.trim()) {
    await env.DB.prepare("UPDATE groups SET name = ? WHERE id = ?").bind(body.name.trim(), id).run();
  }

  // Teilnehmer ersetzen
  if (Array.isArray(body.participants)) {
    await env.DB.prepare("DELETE FROM group_participants WHERE group_id = ?").bind(id).run();
    const clean = body.participants.map((x) => String(x || "").trim()).filter(Boolean);
    for (let i = 0; i < clean.length; i++) {
      await env.DB.prepare(
        "INSERT INTO group_participants (id, group_id, name, position) VALUES (?, ?, ?, ?)"
      )
        .bind(genId(10), id, clean[i], i)
        .run();
    }
  }

  // Kriterienzuordnung + Reihenfolge ersetzen
  if (Array.isArray(body.criteria)) {
    await env.DB.prepare("DELETE FROM group_criteria WHERE group_id = ?").bind(id).run();
    for (let i = 0; i < body.criteria.length; i++) {
      await env.DB.prepare(
        "INSERT INTO group_criteria (id, group_id, criterion_id, position) VALUES (?, ?, ?, ?)"
      )
        .bind(genId(10), id, body.criteria[i], i)
        .run();
    }
  }
  return json({ ok: true });
}

async function deleteGroup(env, id) {
  await env.DB.prepare("DELETE FROM group_participants WHERE group_id = ?").bind(id).run();
  await env.DB.prepare("DELETE FROM group_criteria WHERE group_id = ?").bind(id).run();
  await env.DB.prepare("DELETE FROM groups WHERE id = ?").bind(id).run();
  return json({ ok: true });
}

async function duplicateGroup(env, id) {
  const g = await env.DB.prepare("SELECT * FROM groups WHERE id = ?").bind(id).first();
  if (!g) return err("Gruppe nicht gefunden", 404);
  const newId = genId(10);

  const [posRow, parts, gc] = await Promise.all([
    env.DB.prepare("SELECT COUNT(*) AS n FROM groups WHERE project_id = ?").bind(g.project_id).first(),
    env.DB.prepare("SELECT name, position FROM group_participants WHERE group_id = ?").bind(id).all().then((r) => r.results),
    env.DB.prepare("SELECT criterion_id, position FROM group_criteria WHERE group_id = ?").bind(id).all().then((r) => r.results),
  ]);

  const partStmt = env.DB.prepare("INSERT INTO group_participants (id, group_id, name, position) VALUES (?, ?, ?, ?)");
  const gcStmt = env.DB.prepare("INSERT INTO group_criteria (id, group_id, criterion_id, position) VALUES (?, ?, ?, ?)");

  const batch = [
    env.DB.prepare(
      "INSERT INTO groups (id, project_id, name, position, created_at) VALUES (?, ?, ?, ?, ?)"
    ).bind(newId, g.project_id, g.name + " (Kopie)", posRow.n, timestamp()),
    ...parts.map((p) => partStmt.bind(genId(10), newId, p.name, p.position)),
    ...gc.map((x) => gcStmt.bind(genId(10), newId, x.criterion_id, x.position)),
  ];
  await env.DB.batch(batch);

  return json({ id: newId });
}

/* ----- Bewertungen ----- */
async function listSubmissions(env, projectId) {
  const subs = (
    await env.DB.prepare(
      "SELECT id, created_at FROM submissions WHERE project_id = ? ORDER BY created_at DESC"
    )
      .bind(projectId)
      .all()
  ).results;

  const answers = (
    await env.DB.prepare(
      `SELECT a.submission_id, a.group_id, a.criterion_id, a.stars, a.text,
              g.name AS group_name, c.title AS criterion_title, c.type AS criterion_type
       FROM answers a
       JOIN submissions s ON s.id = a.submission_id
       LEFT JOIN groups g ON g.id = a.group_id
       LEFT JOIN criteria c ON c.id = a.criterion_id
       WHERE s.project_id = ?`
    )
      .bind(projectId)
      .all()
  ).results;

  const bySub = {};
  for (const a of answers) {
    (bySub[a.submission_id] = bySub[a.submission_id] || []).push(a);
  }
  return json({
    count: subs.length,
    submissions: subs.map((s) => ({
      id: s.id,
      created_at: s.created_at,
      answers: bySub[s.id] || [],
    })),
  });
}

async function resetSubmissions(env, projectId) {
  const subs = (await env.DB.prepare("SELECT id FROM submissions WHERE project_id = ?").bind(projectId).all()).results;
  for (const s of subs) await env.DB.prepare("DELETE FROM answers WHERE submission_id = ?").bind(s.id).run();
  await env.DB.prepare("DELETE FROM submissions WHERE project_id = ?").bind(projectId).run();
  return json({ ok: true });
}
