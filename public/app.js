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
  const headers = { authorization: `Bearer ${token}` };
  // Let the browser set multipart boundary for FormData; otherwise send JSON.
  if (!(opts.body instanceof FormData)) {
    headers['content-type'] = 'application/json';
  }
  const res = await fetch(path, { ...opts, headers: { ...headers, ...(opts.headers || {}) } });
  const data = await res.json().catch(() => ({}));
  if (res.status === 401) { signOut(); throw new Error('Unauthorized'); }
  if (!res.ok) throw new Error(data?.error?.message || `Request failed (${res.status}).`);
  return data;
}

function escapeHtml(s) {
  return String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}

function setOperatorCookie(value) {
  if (value) {
    document.cookie = `sf_operator=${encodeURIComponent(value)}; path=/; SameSite=Lax; Secure`;
  } else {
    document.cookie = 'sf_operator=; path=/; Max-Age=0; SameSite=Lax; Secure';
  }
}

function show(view) {
  el('gate').classList.toggle('hidden', view !== 'gate');
  el('app').classList.toggle('hidden', view !== 'app');
  el('signout').classList.toggle('hidden', view !== 'app');
}

function signOut() {
  token = '';
  localStorage.removeItem(KEY);
  setOperatorCookie('');
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
    setOperatorCookie(token);
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

function isDemoProject(p) {
  return String(p.name || '').startsWith('Demo —');
}

async function loadProjects() {
  const list = el('list');
  list.innerHTML = '<div class="card center"><span class="spinner"></span></div>';
  try {
    const { projects } = await api('/api/projects');
    if (!projects.length) {
      list.innerHTML = `<div class="card center muted">No projects yet. Start one to generate an interview link, or create a sales demo.</div>`;
      return;
    }
    list.innerHTML = projects.map((p) => `
      <div class="spec rise" data-id="${escapeHtml(p.id)}" data-name="${escapeHtml(p.name)}">
        <div>
          <div class="title">${escapeHtml(p.name)}${isDemoProject(p) ? ' <span class="pill ready">Demo</span>' : ''}</div>
          <div class="muted" style="font-size:0.9rem;">${escapeHtml(p.client_name)}${p.industry ? ` · ${escapeHtml(p.industry)}` : ''}</div>
          <div class="id">${escapeHtml(p.id)}</div>
        </div>
        <div class="row" style="justify-content:flex-end;">
          ${pill(p.status)}
          <button class="btn ghost open" style="padding:0.5rem 0.9rem;font-size:0.85rem;">Open</button>
          <button class="btn danger delete" style="padding:0.5rem 0.9rem;font-size:0.85rem;" title="Delete project">Delete</button>
        </div>
      </div>`).join('');
    list.querySelectorAll('.spec').forEach((row) => {
      row.querySelector('.open').addEventListener('click', () => openProject(row.dataset.id));
      row.querySelector('.delete').addEventListener('click', () => deleteProject(row.dataset.id, row.dataset.name));
    });
  } catch (e) {
    list.innerHTML = `<div class="notice">${escapeHtml(e.message)}</div>`;
  }
}

async function deleteProject(id, name) {
  const label = name || id;
  if (!confirm(`Delete “${label}”? This removes builds and previews permanently.`)) return;
  try {
    await api(`/api/projects/${id}`, { method: 'DELETE' });
    loadProjects();
  } catch (e) {
    alert(e.message || 'Delete failed.');
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
            <div class="eyebrow">${isDemoProject(project) ? 'sales demo' : 'project'}</div>
            <h2 style="margin-top:0.5rem;">${escapeHtml(project.name)}${isDemoProject(project) ? ' <span class="pill ready">Demo</span>' : ''}</h2>
            <div class="id muted">${escapeHtml(project.id)}${project.industry ? ` · ${escapeHtml(project.industry)}` : ''}</div>
          </div>
          <div class="row" style="gap:0.5rem;">
            ${pill(project.status)}
            <button class="btn danger" id="delete-project" style="padding:0.45rem 0.85rem;font-size:0.85rem;">Delete</button>
          </div>
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

        <div>
          <div class="row" style="justify-content:space-between;align-items:center;">
            <span class="eyebrow">client media</span>
            <div class="row" style="gap:0.45rem;">
              <label class="btn ghost" style="padding:0.45rem 0.85rem;font-size:0.85rem;cursor:pointer;margin:0;">
                Upload logo
                <input type="file" id="upload-logo" accept="image/png,image/jpeg,image/webp,image/svg+xml,image/gif" hidden />
              </label>
              <label class="btn primary" style="padding:0.45rem 0.85rem;font-size:0.85rem;cursor:pointer;margin:0;">
                Upload photos
                <input type="file" id="upload-photos" accept="image/png,image/jpeg,image/webp,image/gif" multiple hidden />
              </label>
            </div>
          </div>
          <p class="muted" style="font-size:0.88rem;margin:0.5rem 0 0;">Drop in the logo and photos the customer provided. Uploads are auto-approved and used on the next generate (logo in the nav, photos in hero/gallery).</p>
          <p id="upload-status" class="muted" style="font-size:0.85rem;margin:0.5rem 0 0;" aria-live="polite"></p>
          <div id="uploads-panel" style="margin-top:1rem;" aria-live="polite"></div>
        </div>

        <div>
          <div class="row" style="justify-content:space-between;">
            <span class="eyebrow">generate</span>
            <button class="btn primary" id="run-generate" style="padding:0.45rem 0.85rem;font-size:0.85rem;">Generate preview</button>
          </div>
          <p class="muted" style="font-size:0.88rem;margin:0.5rem 0 0;">Builds a live preview from the interview and confirmed content. Each build is versioned.</p>
          <div id="builds-panel" style="margin-top:1rem;" aria-live="polite"></div>
        </div>
      </div>`;

    el('back').addEventListener('click', loadProjects);
    el('delete-project').addEventListener('click', () => deleteProject(project.id, project.name));
    const copy = el('copy');
    if (copy) copy.addEventListener('click', async () => {
      try { await navigator.clipboard.writeText(link); copy.textContent = 'Copied'; setTimeout(() => (copy.textContent = 'Copy'), 1500); }
      catch { el('link').select(); }
    });
    el('run-ingest').addEventListener('click', () => runIngest(project.id));
    el('run-generate').addEventListener('click', () => runGenerate(project.id));
    el('upload-logo').addEventListener('change', (e) => uploadClientMedia(project.id, 'logo', e.target.files));
    el('upload-photos').addEventListener('change', (e) => uploadClientMedia(project.id, 'photo', e.target.files));
    loadIngestion(project.id);
    loadBuilds(project.id);
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
  const uploadsPanel = el('uploads-panel');
  if (!panel) return false;
  try {
    const { items, assets } = await api(`/api/projects/${projectId}/source-content`);
    const scraped = (assets || []).filter((a) => !a.uploaded);
    const uploaded = (assets || []).filter((a) => a.uploaded);
    if (!items.length && !scraped.length) {
      panel.innerHTML = `<p class="muted" style="font-size:0.88rem;">No ingested content yet.</p>`;
    } else {
      panel.innerHTML = items.map((it) => sourceCard(it)).join('') + assetsCard(scraped, 'scraped images');
      panel.querySelectorAll('[data-confirm]').forEach((b) => b.addEventListener('click', () => reviewSource(projectId, b.dataset.confirm, 'confirmed')));
      panel.querySelectorAll('[data-reject]').forEach((b) => b.addEventListener('click', () => reviewSource(projectId, b.dataset.reject, 'rejected')));
      panel.querySelectorAll('[data-asset]').forEach((b) => b.addEventListener('click', () => reviewAsset(projectId, b.dataset.asset, b.dataset.status)));
    }
    if (uploadsPanel) {
      uploadsPanel.innerHTML = uploaded.length
        ? assetsCard(uploaded, 'uploaded media')
        : `<p class="muted" style="font-size:0.88rem;">No client uploads yet.</p>`;
      uploadsPanel.querySelectorAll('[data-asset]').forEach((b) => b.addEventListener('click', () => reviewAsset(projectId, b.dataset.asset, b.dataset.status)));
    }
    return items.length > 0 || uploaded.length > 0 || scraped.length > 0;
  } catch (e) {
    panel.innerHTML = `<div class="notice">${escapeHtml(e.message)}</div>`;
    return false;
  }
}

async function uploadClientMedia(projectId, kind, fileList) {
  const status = el('upload-status');
  const input = kind === 'logo' ? el('upload-logo') : el('upload-photos');
  if (!fileList || !fileList.length) return;
  const form = new FormData();
  form.append('kind', kind);
  for (const f of fileList) form.append('files', f);
  if (status) status.textContent = kind === 'logo' ? 'Uploading logo…' : `Uploading ${fileList.length} photo${fileList.length > 1 ? 's' : ''}…`;
  try {
    const r = await api(`/api/projects/${projectId}/uploads`, { method: 'POST', body: form });
    if (status) status.textContent = `Saved ${r.count} file${r.count === 1 ? '' : 's'}. Regenerate the preview to bake them into the site.`;
    await loadIngestion(projectId);
  } catch (e) {
    if (status) status.textContent = e.message || 'Upload failed.';
  } finally {
    if (input) input.value = '';
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

async function runGenerate(projectId) {
  const btn = el('run-generate');
  btn.disabled = true; btn.textContent = 'Forging…';
  try {
    const r = await api(`/api/projects/${projectId}/generate`, { method: 'POST', body: '{}' });
    await loadBuilds(projectId);
    window.open(r.previewUrl, '_blank', 'noopener');
  } catch (e) {
    el('builds-panel').innerHTML = `<div class="notice">${escapeHtml(e.message)}</div>`;
  } finally {
    btn.disabled = false; btn.textContent = 'Generate preview';
  }
}

async function loadBuilds(projectId) {
  const panel = el('builds-panel');
  if (!panel) return;
  try {
    const { builds } = await api(`/api/projects/${projectId}/builds`);
    if (!builds.length) { panel.innerHTML = `<p class="muted" style="font-size:0.88rem;">No builds yet.</p>`; return; }
    panel.innerHTML = builds.map((b) => `
      <div class="spec" style="margin-bottom:0.5rem;">
        <div>
          <div class="title">Version ${b.version} <span class="pill">${escapeHtml(b.theme_id)}</span></div>
          <div class="id">${escapeHtml(b.id)}</div>
        </div>
        <div class="row" style="justify-content:flex-end;">
          <span class="pill ${b.status === 'ready' || b.status === 'deployed' ? 'ready' : ''}">${escapeHtml(b.status)}</span>
          <a class="btn ghost" style="padding:0.45rem 0.9rem;font-size:0.85rem;" href="${escapeHtml(b.preview_url)}" target="_blank" rel="noopener">Preview</a>
        </div>
      </div>`).join('');
  } catch (e) {
    panel.innerHTML = `<div class="notice">${escapeHtml(e.message)}</div>`;
  }
}

// Scraped images need approve; client uploads arrive confirmed (operator is the gate).
function assetsCard(assets, title = 'images') {
  if (!assets.length) return '';
  const tiles = assets.map((a) => {
    const status = a.reviewStatus || a.review_status || 'pending';
    const approved = status === 'confirmed' || status === 'edited';
    const rejected = status === 'rejected';
    const src = a.previewUrl || a.sourceUrl || a.source_url || '';
    const alt = a.altText || a.alt_text || '';
    const kindLabel = a.kind === 'logo' ? 'logo' : a.uploaded ? 'upload' : 'scraped';
    return `<figure style="margin:0;border:1px solid ${approved ? 'var(--ok, #6a9b6a)' : 'var(--line)'};border-radius:8px;overflow:hidden;opacity:${rejected ? '0.4' : '1'};background:var(--iron-2,#1a1816);">
      <img src="${escapeHtml(src)}" alt="${escapeHtml(alt)}" style="width:100%;height:110px;object-fit:${a.kind === 'logo' ? 'contain' : 'cover'};background:#0e0c0a;padding:${a.kind === 'logo' ? '0.6rem' : '0'};" loading="lazy" />
      <figcaption style="padding:.45rem;">
        <div class="muted" style="font-size:.7rem;letter-spacing:.08em;text-transform:uppercase;margin-bottom:.35rem;">${escapeHtml(kindLabel)}</div>
        <div class="row" style="gap:.3rem;justify-content:center;">
          ${approved
            ? `<span class="pill ready" style="font-size:.65rem;">Approved</span>`
            : `<button class="btn primary" style="padding:.3rem .6rem;font-size:.75rem;" data-asset="${escapeHtml(a.id)}" data-status="confirmed">Approve</button>`}
          <button class="btn ghost" style="padding:.3rem .6rem;font-size:.75rem;" data-asset="${escapeHtml(a.id)}" data-status="rejected">${rejected ? 'Rejected' : 'Reject'}</button>
        </div>
      </figcaption>
    </figure>`;
  }).join('');
  const hint = title === 'scraped images'
    ? `<p class="muted" style="font-size:.85rem;margin:0 0 .8rem;">Approve only images you have the right to use. Only approved images are built into the site.</p>`
    : `<p class="muted" style="font-size:.85rem;margin:0 0 .8rem;">Client-provided files are auto-approved. Reject to keep one out of the next build.</p>`;
  return `<div class="card" style="padding:1.1rem;margin-bottom:0.75rem;">
    <div class="eyebrow" style="margin:0 0 .25rem;">${escapeHtml(title)}</div>
    ${hint}
    <div style="display:grid;gap:.6rem;grid-template-columns:repeat(auto-fill,minmax(140px,1fr));">${tiles}</div>
  </div>`;
}

async function reviewAsset(projectId, assetId, status) {
  try {
    await api(`/api/assets/${assetId}`, { method: 'PATCH', body: JSON.stringify({ reviewStatus: status }) });
    loadIngestion(projectId);
  } catch (e) {
    el('ingest-panel').insertAdjacentHTML('afterbegin', `<div class="notice">${escapeHtml(e.message)}</div>`);
  }
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

let demoIndustriesLoaded = false;

async function ensureDemoIndustries() {
  if (demoIndustriesLoaded) return;
  const select = el('demoIndustry');
  const { industries } = await api('/api/demos/industries');
  select.innerHTML = industries.map((i) =>
    `<option value="${escapeHtml(i.industry)}">${escapeHtml(i.industry)} — ${escapeHtml(i.themeName)}</option>`
  ).join('');
  // Prefer spa/salon when present (primary sales use case).
  const spa = industries.find((i) => i.industry === 'Day spa / Salon');
  if (spa) select.value = spa.industry;
  demoIndustriesLoaded = true;
}

function showDemoForm() {
  el('new-form').classList.add('hidden');
  el('demo-form').classList.toggle('hidden');
  if (!el('demo-form').classList.contains('hidden')) {
    ensureDemoIndustries().catch((e) => { el('demo-err').textContent = e.message; });
  }
}

async function createDemo() {
  const businessName = el('demoName').value.trim();
  const industry = el('demoIndustry').value;
  el('demo-err').textContent = '';
  if (!businessName) { el('demo-err').textContent = 'Business name is required.'; return; }
  if (!industry) { el('demo-err').textContent = 'Pick an industry.'; return; }
  const btn = el('create-demo');
  btn.disabled = true; btn.textContent = 'Forging demo…';
  try {
    const body = {
      businessName,
      industry,
      tagline: el('demoTagline').value.trim() || undefined,
      blurb: el('demoBlurb').value.trim() || undefined,
      phone: el('demoPhone').value.trim() || undefined,
      email: el('demoEmail').value.trim() || undefined,
      city: el('demoCity').value.trim() || undefined,
      logoUrl: el('demoLogo').value.trim() || undefined,
    };
    const r = await api('/api/demos', { method: 'POST', body: JSON.stringify(body) });
    el('created').classList.remove('hidden');
    el('created').innerHTML = `Demo ready for <b>${escapeHtml(businessName)}</b>.
      <a href="${escapeHtml(r.previewUrl)}" target="_blank" rel="noopener">Open preview</a>
      · theme <span class="mono">${escapeHtml(r.themeId)}</span>`;
    el('demo-form').classList.add('hidden');
    el('demoName').value = el('demoTagline').value = el('demoBlurb').value = '';
    el('demoPhone').value = el('demoEmail').value = el('demoCity').value = el('demoLogo').value = '';
    window.open(r.previewUrl, '_blank', 'noopener');
    await loadProjects();
    openProject(r.projectId);
  } catch (e) {
    el('demo-err').textContent = e.message;
  } finally {
    btn.disabled = false; btn.textContent = 'Forge demo preview';
  }
}

// --- wire up ---
el('unlock').addEventListener('click', unlock);
el('token').addEventListener('keydown', (e) => { if (e.key === 'Enter') unlock(); });
el('signout').addEventListener('click', signOut);
el('new-btn').addEventListener('click', () => {
  el('demo-form').classList.add('hidden');
  el('new-form').classList.toggle('hidden');
});
el('cancel-new').addEventListener('click', () => el('new-form').classList.add('hidden'));
el('create').addEventListener('click', createProject);
el('demo-btn').addEventListener('click', showDemoForm);
el('cancel-demo').addEventListener('click', () => el('demo-form').classList.add('hidden'));
el('create-demo').addEventListener('click', createDemo);

// Boot: if we have a stored token, try it; otherwise show the gate.
(async function boot() {
  if (token) {
    try {
      await api('/api/projects');
      setOperatorCookie(token);
      show('app');
      loadProjects();
      return;
    } catch { /* fall through to gate */ }
  }
  show('gate');
})();
