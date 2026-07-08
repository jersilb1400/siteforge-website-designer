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

        <div>
          <div class="row" style="justify-content:space-between;">
            <span class="eyebrow">web presence</span>
            <button class="btn" id="run-ingest" style="padding:0.45rem 0.85rem;font-size:0.85rem;">Pull from web presence</button>
          </div>
          <p class="muted" style="font-size:0.88rem;margin:0.5rem 0 0;">Scrapes the client's website, Facebook, and Google listing from their interview answers. Nothing is used until you confirm it below.</p>
          <div id="ingest-panel" style="margin-top:1rem;" aria-live="polite"></div>
        </div>
      </div>`;

    el('back').addEventListener('click', loadProjects);
    const copy = el('copy');
    if (copy) copy.addEventListener('click', async () => {
      try { await navigator.clipboard.writeText(link); copy.textContent = 'Copied'; setTimeout(() => (copy.textContent = 'Copy'), 1500); }
      catch { el('link').select(); }
    });
    el('run-ingest').addEventListener('click', () => runIngest(project.id));
    loadIngestion(project.id);
  } catch (e) {
    list.innerHTML = `<div class="notice">${escapeHtml(e.message)}</div>`;
  }
}

const CONFIDENCE_LABEL = { high: 'reliable', best_effort: 'best-effort', manual: 'needs your input' };

async function runIngest(projectId) {
  const btn = el('run-ingest');
  const panel = el('ingest-panel');
  btn.disabled = true; btn.textContent = 'Pulling…';
  try {
    const r = await api(`/api/projects/${projectId}/ingest`, { method: 'POST', body: '{}' });
    panel.innerHTML = `<div class="notice">Queued: ${r.enqueued.map(escapeHtml).join(', ')}. Results appear below in a moment.</div>`;
    // Poll a few times while the queue processes.
    for (let i = 0; i < 8; i++) { await new Promise((res) => setTimeout(res, 3000)); if (await loadIngestion(projectId)) break; }
  } catch (e) {
    panel.innerHTML = `<div class="notice">${escapeHtml(e.message)}</div>`;
  } finally {
    btn.disabled = false; btn.textContent = 'Pull from web presence';
  }
}

async function loadIngestion(projectId) {
  const panel = el('ingest-panel');
  if (!panel) return false;
  try {
    const { items } = await api(`/api/projects/${projectId}/source-content`);
    if (!items.length) { panel.innerHTML = `<p class="muted" style="font-size:0.88rem;">No ingested content yet.</p>`; return false; }
    panel.innerHTML = items.map((it) => sourceCard(it)).join('');
    panel.querySelectorAll('[data-confirm]').forEach((b) => b.addEventListener('click', () => reviewSource(projectId, b.dataset.confirm, 'confirmed')));
    panel.querySelectorAll('[data-reject]').forEach((b) => b.addEventListener('click', () => reviewSource(projectId, b.dataset.reject, 'rejected')));
    return true;
  } catch (e) {
    panel.innerHTML = `<div class="notice">${escapeHtml(e.message)}</div>`;
    return false;
  }
}

function sourceCard(it) {
  const d = it.data || {};
  const status = escapeHtml(it.reviewStatus);
  const conf = CONFIDENCE_LABEL[it.confidence] || it.confidence;
  const facts = [];
  if (d.businessName) facts.push(['Name', d.businessName]);
  if (d.description) facts.push(['Description', d.description]);
  if (d.emails && d.emails.length) facts.push(['Email', d.emails.join(', ')]);
  if (d.phones && d.phones.length) facts.push(['Phone', d.phones.join(', ')]);
  if (d.addresses && d.addresses.length) facts.push(['Address', d.addresses.join(' · ')]);
  if (d.savedAssetCount != null) facts.push(['Images saved', String(d.savedAssetCount)]);
  if (d.note) facts.push(['Note', d.note]);
  const palette = (d.palette || []).map((c) => `<span title="${escapeHtml(c)}" style="display:inline-block;width:20px;height:20px;border-radius:4px;border:1px solid var(--line);background:${escapeHtml(c)}"></span>`).join('');
  const decided = it.reviewStatus === 'confirmed' || it.reviewStatus === 'edited' || it.reviewStatus === 'rejected';
  return `
    <div class="card" style="padding:1.1rem;margin-bottom:0.75rem;">
      <div class="row" style="justify-content:space-between;">
        <div class="row" style="gap:0.5rem;">
          <span class="eyebrow" style="margin:0;">${escapeHtml(it.sourceType.replace(/_/g,' '))}</span>
          <span class="pill">${escapeHtml(conf)}</span>
        </div>
        <span class="pill ${status === 'confirmed' || status === 'edited' ? 'ready' : ''}">${status}</span>
      </div>
      ${facts.map(([k, v]) => `<div style="display:grid;grid-template-columns:110px 1fr;gap:0.75rem;padding:0.4rem 0;border-top:1px solid var(--line);font-size:0.9rem;">
        <span class="mono muted" style="font-size:0.72rem;text-transform:uppercase;letter-spacing:0.06em;">${escapeHtml(k)}</span>
        <span>${escapeHtml(String(v))}</span></div>`).join('')}
      ${palette ? `<div style="display:flex;gap:0.35rem;margin-top:0.6rem;">${palette}</div>` : ''}
      ${decided ? '' : `<div class="row" style="margin-top:0.85rem;">
        <button class="btn primary" style="padding:0.45rem 0.9rem;font-size:0.85rem;" data-confirm="${escapeHtml(it.id)}">Confirm</button>
        <button class="btn ghost" style="padding:0.45rem 0.9rem;font-size:0.85rem;" data-reject="${escapeHtml(it.id)}">Reject</button>
      </div>`}
    </div>`;
}

async function reviewSource(projectId, sourceId, status) {
  try {
    await api(`/api/source-content/${sourceId}`, { method: 'PATCH', body: JSON.stringify({ reviewStatus: status }) });
    loadIngestion(projectId);
  } catch (e) {
    el('ingest-panel').insertAdjacentHTML('afterbegin', `<div class="notice">${escapeHtml(e.message)}</div>`);
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
