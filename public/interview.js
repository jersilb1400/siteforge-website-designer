// SiteForge client interview. Renders one question at a time against the
// /api/interview/:sessionId engine, saves each answer, and shows a completion
// summary. No framework — small, fast, accessible.

const params = new URLSearchParams(location.search);
const sessionId = params.get('s');

const el = (id) => document.getElementById(id);
const loading = el('loading');
const stage = el('stage');
const done = el('done');
const fatal = el('fatal');
const rail = el('rail');
const counter = el('counter');

function showFatal(msg) {
  loading.classList.add('hidden');
  stage.classList.add('hidden');
  fatal.textContent = msg;
  fatal.classList.remove('hidden');
}

async function api(path, opts) {
  const res = await fetch(path, {
    headers: { 'content-type': 'application/json' },
    ...opts,
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const m = data && data.error ? data.error.message : `Request failed (${res.status}).`;
    throw new Error(m);
  }
  return data;
}

function setProgress(p) {
  if (!p || !p.total) return;
  const pct = Math.round((p.answered / p.total) * 100);
  rail.style.width = pct + '%';
  const n = String(p.answered + 1).padStart(2, '0');
  const t = String(p.total).padStart(2, '0');
  counter.innerHTML = `<b>${n}</b> / ${t}`;
}

// Build the input control for a question and return { node, read }.
function buildControl(q) {
  const val = q.defaultValue;
  if (q.type === 'longtext') {
    const ta = document.createElement('textarea');
    ta.id = 'answer';
    if (q.placeholder) ta.placeholder = q.placeholder;
    return { node: ta, read: () => ta.value.trim() };
  }
  if (q.type === 'boolean') {
    const wrap = document.createElement('div');
    wrap.className = 'opts';
    let choice = null;
    for (const [label, v] of [['Yes', true], ['No', false]]) {
      const b = document.createElement('label');
      b.className = 'opt';
      b.tabIndex = 0;
      b.innerHTML = `<input type="radio" name="answer" /> ${label}`;
      const pick = () => {
        choice = v;
        wrap.querySelectorAll('.opt').forEach((o) => o.classList.remove('checked'));
        b.classList.add('checked');
      };
      b.addEventListener('click', pick);
      b.addEventListener('keydown', (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); pick(); } });
      wrap.appendChild(b);
    }
    return { node: wrap, read: () => choice };
  }
  if (q.type === 'single_select' || q.type === 'multi_select') {
    const multi = q.type === 'multi_select';
    const wrap = document.createElement('div');
    wrap.className = 'opts';
    const chosen = new Set(multi && Array.isArray(val) ? val : []);
    (q.options || []).forEach((opt) => {
      const b = document.createElement('label');
      b.className = 'opt' + (chosen.has(opt) ? ' checked' : '');
      b.tabIndex = 0;
      b.innerHTML = `<input type="${multi ? 'checkbox' : 'radio'}" name="answer" /> ${opt}`;
      const pick = () => {
        if (multi) {
          if (chosen.has(opt)) { chosen.delete(opt); b.classList.remove('checked'); }
          else { chosen.add(opt); b.classList.add('checked'); }
        } else {
          chosen.clear(); chosen.add(opt);
          wrap.querySelectorAll('.opt').forEach((o) => o.classList.remove('checked'));
          b.classList.add('checked');
        }
      };
      b.addEventListener('click', pick);
      b.addEventListener('keydown', (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); pick(); } });
      wrap.appendChild(b);
    });
    return { node: wrap, read: () => (multi ? [...chosen] : ([...chosen][0] ?? '')) };
  }
  // text / url / email
  const input = document.createElement('input');
  input.type = q.type === 'url' ? 'url' : 'text';
  input.id = 'answer';
  if (q.placeholder) input.placeholder = q.placeholder;
  return { node: input, read: () => input.value.trim() };
}

function renderQuestion(q, progress) {
  setProgress(progress);
  loading.classList.add('hidden');
  done.classList.add('hidden');
  stage.classList.remove('hidden');

  stage.innerHTML = '';
  const card = document.createElement('div');
  card.className = 'card rise';

  const eyebrow = document.createElement('div');
  eyebrow.className = 'eyebrow';
  eyebrow.textContent = q.phase.replace(/_/g, ' ');
  card.appendChild(eyebrow);

  const h = document.createElement('h1');
  h.style.margin = '0.6rem 0 0';
  h.textContent = q.text;
  card.appendChild(h);

  if (q.help) {
    const help = document.createElement('p');
    help.className = 'muted';
    help.style.margin = '0.6rem 0 0';
    help.textContent = q.help;
    card.appendChild(help);
  }

  const control = buildControl(q);
  control.node.style.marginTop = '1.25rem';
  card.appendChild(control.node);

  const err = document.createElement('p');
  err.className = 'error';
  err.setAttribute('role', 'alert');
  card.appendChild(err);

  const rowEl = document.createElement('div');
  rowEl.className = 'row';
  rowEl.style.marginTop = '0.5rem';
  const next = document.createElement('button');
  next.className = 'btn primary';
  next.textContent = q.required ? 'Continue' : 'Continue';
  const skip = document.createElement('button');
  skip.className = 'btn ghost';
  skip.textContent = 'Skip';
  rowEl.appendChild(next);
  if (!q.required) rowEl.appendChild(skip);
  card.appendChild(rowEl);

  stage.appendChild(card);

  const first = card.querySelector('input, textarea');
  if (first) setTimeout(() => first.focus(), 60);

  async function submit(value) {
    next.disabled = true; skip.disabled = true;
    err.textContent = '';
    try {
      const r = await api(`/api/interview/${sessionId}/answer`, {
        method: 'POST',
        body: JSON.stringify({ questionId: q.id, value }),
      });
      if (r.followUp) {
        // Surface the adaptive follow-up as gentle guidance on the next render.
        pendingFollowUp = r.followUp;
      }
      if (r.complete) return finish();
      renderQuestion(r.question, r.progress);
    } catch (e) {
      err.textContent = e.message;
      next.disabled = false; skip.disabled = false;
    }
  }

  next.addEventListener('click', () => {
    const value = control.read();
    const empty = value === null || value === '' || (Array.isArray(value) && value.length === 0);
    if (q.required && empty) { err.textContent = 'This one is required.'; return; }
    submit(value);
  });
  skip.addEventListener('click', () => submit(q.type === 'multi_select' ? [] : ''));

  // Enter submits single-line inputs.
  const single = card.querySelector('input#answer');
  if (single) single.addEventListener('keydown', (e) => { if (e.key === 'Enter') { e.preventDefault(); next.click(); } });
}

let pendingFollowUp = null;

async function finish() {
  stage.classList.add('hidden');
  loading.classList.add('hidden');
  rail.style.width = '100%';
  counter.innerHTML = '<b>done</b>';
  let profile = null;
  try {
    const r = await api(`/api/interview/${sessionId}/profile`);
    profile = r.profile;
  } catch { /* summary is best-effort */ }

  done.classList.remove('hidden');
  done.innerHTML = `
    <div class="card rise center">
      <div class="eyebrow" style="justify-content:center;">interview complete</div>
      <h1 style="margin:0.75rem 0 0;">Your brief is forged.</h1>
      <p class="muted" style="max-width:46ch;margin:0.75rem auto 1.25rem;">
        Thanks${profile && profile.business.name ? `, ${escapeHtml(profile.business.name)}` : ''}. SiteForge has everything it needs to start.
        Your operator will review the details and generate your first preview.
      </p>
      ${profile ? summaryTable(profile) : ''}
    </div>`;
}

function summaryTable(p) {
  const rows = [
    ['Business', p.business.name],
    ['Type', p.business.industry],
    ['Goals', (p.goals || []).join(', ')],
    ['Pages', (p.pages || []).join(', ')],
    ['Tone', p.tone],
  ].filter(([, v]) => v && String(v).trim());
  return `<div style="text-align:left;max-width:520px;margin:0 auto;">
    ${rows.map(([k, v]) => `
      <div style="display:grid;grid-template-columns:110px 1fr;gap:1rem;padding:0.6rem 0;border-top:1px solid var(--line);">
        <span class="mono muted" style="font-size:0.75rem;text-transform:uppercase;letter-spacing:0.08em;">${k}</span>
        <span>${escapeHtml(String(v))}</span>
      </div>`).join('')}
  </div>`;
}

function escapeHtml(s) {
  return s.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}

async function start() {
  if (!sessionId) return showFatal('Missing interview link. Ask your operator for a fresh link.');
  try {
    const r = await api(`/api/interview/${sessionId}`);
    if (r.complete) return finish();
    renderQuestion(r.question, r.progress);
  } catch (e) {
    showFatal(e.message.includes('not found')
      ? 'This interview link is invalid or expired.'
      : e.message);
  }
}

start();
