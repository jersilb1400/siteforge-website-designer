// SiteForge operator dashboard. Gated by the operator token (kept in
// localStorage for the session); lists projects, creates new ones, and shows
// each project's interview link + progress.

const el = (id) => document.getElementById(id);
const KEY = 'sf_operator_token';
let token = localStorage.getItem(KEY) || '';

function authHeaders() {
  return { 'content-type': 'application/json', authorization: `Bearer ${token}` };
}

async function api(path, opts = {}) {
  const res = await fetch(path, { headers: authHeaders(), ...opts });
  const data = await res.json().catch(() => ({}));
  if (res.status === 401) { signOut(); throw new Error('Unauthorized'); }
  if (!res.ok) throw new Error(data?.error?.message || `Request failed (${res.status}).`);
  return data;
}

function escapeHtml(s) {
  return String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}

function show(view) {
  el('gate').classList.toggle('hidden', view !== 'gate');
  el('app').classList.toggle('hidden', view !== 'app');
  el('signout').classList.toggle('hidden', view !== 'app');
}

function signOut() {
  token = '';
  localStorage.removeItem(KEY);
  show('gate');
}

async function unlock() {
  const val = el('token').value.trim();
  el('gate-err').textContent = '';
  if (!val) { el('gate-err').textContent = 'Enter your token.'; return; }
  token = val;
  try {
    await api('/api/projects'); // validates the token
    localStorage.setItem(KEY, token);
    show('app');
    loadProjects();
  } catch (e) {
    token = '';
    el('gate-err').textContent = e.message === 'Unauthorized' ? 'That token was rejected.' : e.message;
  }
}

function pill(status) {
  const s = escapeHtml(status || 'interview');
  return `<span class="pill ${s}">${s}</span>`;
}

async function loadProjects() {
  const list = el('list');
  list.innerHTML = '<div class="card center"><span class="spinner"></span></div>';
  try {
    const { projects } = await api('/api/projects');
    if (!projects.length) {
      list.innerHTML = `<div class="card center muted">No projects yet. Start one to generate an interview link.</div>`;
      return;
    }
    list.innerHTML = projects.map((p) => `
      <div class="spec rise" data-id="${escapeHtml(p.id)}">
        <div>
          <div class="title">${escapeHtml(p.name)}</div>
          <div class="muted" style="font-size:0.9rem;">${escapeHtml(p.client_name)}</div>
          <div class="id">${escapeHtml(p.id)}</div>
        </div>
        <div class="row" style="justify-content:flex-end;">
          ${pill(p.status)}
          <button class="btn ghost open" style="padding:0.5rem 0.9rem;font-size:0.85rem;">Open</button>
        </div>
      </div>`).join('');
    list.querySelectorAll('.spec').forEach((row) => {
      row.querySelector('.open').addEventListener('click', () => openProject(row.dataset.id));
    });
  } catch (e) {
    list.innerHTML = `<div class="notice">${escapeHtml(e.message)}</div>`;
  }
}

async function openProject(id) {
  const list = el('list');
  try {
    const { project, session, interviewProgress } = await api(`/api/projects/${id}`);
    const link = session ? `${location.origin}/interview.html?s=${session.id}` : null;
    const pct = interviewProgress && interviewProgress.total
      ? Math.round((interviewProgress.answered / interviewProgress.total) * 100) : 0;

    list.innerHTML = `
      <button class="btn ghost" id="back" style="margin-bottom:1rem;padding:0.5rem 0.9rem;font-size:0.85rem;">← All projects</button>
      <div class="card stack rise">
        <div class="row" style="justify-content:space-between;">
          <div>
            <div class="eyebrow">project</div>
            <h2 style="margin-top:0.5rem;">${escapeHtml(project.name)}</h2>
            <div class="id muted">${escapeHtml(project.id)}</div>
          </div>
          ${pill(project.status)}
        </div>

        ${session ? `
        <div>
          <div class="row" style="justify-content:space-between;">
            <span class="eyebrow">interview</span>
            <span class="step-counter"><b>${interviewProgress.answered}</b> / ${interviewProgress.total}</span>
          </div>
          <div class="rail" style="margin-top:0.5rem;"><span style="width:${pct}%"></span></div>
        </div>
        <div>
          <div class="lbl">Interview link <span class="muted">— share with the client</span></div>
          <div class="row">
            <input type="text" id="link" class="grow mono" style="font-size:0.85rem;" readonly value="${escapeHtml(link)}" />
            <button class="btn" id="copy">Copy</button>
            <a class="btn ghost" href="${escapeHtml(link)}" target="_blank" rel="noopener">Open</a>
          </div>
        </div>` : `<p class="muted">No interview session on this project.</p>`}
      </div>`;

    el('back').addEventListener('click', loadProjects);
    const copy = el('copy');
    if (copy) copy.addEventListener('click', async () => {
      try { await navigator.clipboard.writeText(link); copy.textContent = 'Copied'; setTimeout(() => (copy.textContent = 'Copy'), 1500); }
      catch { el('link').select(); }
    });
  } catch (e) {
    list.innerHTML = `<div class="notice">${escapeHtml(e.message)}</div>`;
  }
}

async function createProject() {
  const clientName = el('clientName').value.trim();
  const contactEmail = el('contactEmail').value.trim();
  const projectName = el('projectName').value.trim();
  el('new-err').textContent = '';
  if (!clientName) { el('new-err').textContent = 'Client name is required.'; return; }
  el('create').disabled = true;
  try {
    const r = await api('/api/projects', {
      method: 'POST',
      body: JSON.stringify({ clientName, contactEmail, projectName }),
    });
    const link = `${location.origin}${r.interviewUrl}`;
    el('created').classList.remove('hidden');
    el('created').innerHTML = `Project created. Interview link: <a href="${escapeHtml(link)}" target="_blank" rel="noopener" class="mono">${escapeHtml(link)}</a>`;
    el('new-form').classList.add('hidden');
    el('clientName').value = el('contactEmail').value = el('projectName').value = '';
    loadProjects();
  } catch (e) {
    el('new-err').textContent = e.message;
  } finally {
    el('create').disabled = false;
  }
}

// --- wire up ---
el('unlock').addEventListener('click', unlock);
el('token').addEventListener('keydown', (e) => { if (e.key === 'Enter') unlock(); });
el('signout').addEventListener('click', signOut);
el('new-btn').addEventListener('click', () => el('new-form').classList.toggle('hidden'));
el('cancel-new').addEventListener('click', () => el('new-form').classList.add('hidden'));
el('create').addEventListener('click', createProject);

// Boot: if we have a stored token, try it; otherwise show the gate.
(async function boot() {
  if (token) {
    try { await api('/api/projects'); show('app'); loadProjects(); return; }
    catch { /* fall through to gate */ }
  }
  show('gate');
})();
