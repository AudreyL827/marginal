'use strict';

let quotes = [];
let albums = [];
let searchQuery = '';
let dateFilter = 'all';
let albumFilter = null;
let exportCiteFmt = 'apa';

// ── Theme ─────────────────────────────────────────
const MOON_SVG = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/></svg>`;
const SUN_SVG  = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="5"/><line x1="12" y1="1" x2="12" y2="3"/><line x1="12" y1="21" x2="12" y2="23"/><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/><line x1="1" y1="12" x2="3" y2="12"/><line x1="21" y1="12" x2="23" y2="12"/><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/></svg>`;

function initTheme() {
  const saved = localStorage.getItem('marginal-theme') || 'light';
  applyTheme(saved);
}

function applyTheme(theme) {
  document.documentElement.dataset.theme = theme;
  const btn = document.getElementById('theme-btn');
  if (!btn) return;
  // Icon shows what you'll switch TO: moon = click to go dark, sun = click to go light
  btn.innerHTML = theme === 'light' ? MOON_SVG : SUN_SVG;
  btn.title = theme === 'light' ? 'Switch to dark mode' : 'Switch to light mode';
}

function toggleTheme() {
  const current = document.documentElement.dataset.theme || 'light';
  const next = current === 'light' ? 'dark' : 'light';
  localStorage.setItem('marginal-theme', next);
  applyTheme(next);
}

// ── Boot ──────────────────────────────────────────
document.addEventListener('DOMContentLoaded', async () => {
  initTheme();
  await loadData();
  renderFilters();
  renderAll();
  bindEvents();
});

chrome.storage.onChanged.addListener((changes) => {
  if (changes.quotes) { quotes = changes.quotes.newValue || []; renderAll(); }
  if (changes.albums) { albums = changes.albums.newValue || []; renderFilters(); renderAll(); }
});

// ── Data ──────────────────────────────────────────
async function loadData() {
  const [qRes, aRes] = await Promise.all([
    chrome.runtime.sendMessage({ action: 'getQuotes' }),
    chrome.runtime.sendMessage({ action: 'getAlbums' }),
  ]);
  quotes = qRes.quotes || [];
  albums = aRes.albums || [];
}

// ── Render ────────────────────────────────────────
function renderAll() {
  const filtered = applyFilters();
  document.getElementById('quote-count').textContent = quotes.length;
  const list = document.getElementById('quotes-list');
  const empty = document.getElementById('empty-state');
  if (filtered.length === 0) {
    list.innerHTML = '';
    empty.hidden = false;
  } else {
    empty.hidden = true;
    list.innerHTML = filtered.map(q => cardHTML(q)).join('');
  }
}

function renderFilters() {
  const container = document.getElementById('album-chips');
  container.innerHTML = albums.map(a => `
    <button class="album-chip ${albumFilter === a.id ? 'active' : ''}" data-album-id="${esc(a.id)}">
      <span class="album-chip__dot" style="background:${esc(a.color)}"></span>${esc(a.name)}
    </button>
  `).join('');
}

// ── Card ──────────────────────────────────────────
function cardHTML(q) {
  const fmt = q.citationFormat || 'apa';
  const citation = formatCitation(q, fmt);
  const date = fmtDate(q.savedAt);
  const favicon = `https://www.google.com/s2/favicons?domain=${encodeURIComponent(q.domain)}&sz=16`;
  const isLong = q.text.length > 280;
  const quoteAlbums = albums.filter(a => (q.albums || []).includes(a.id));

  const albumTags = quoteAlbums.map(a => `
    <span class="action-album-tag" style="border-color:${a.color}44;color:${a.color}">
      <span class="action-album-tag__dot" style="background:${a.color}"></span>${esc(a.name)}
    </span>
  `).join('');

  return `
<article class="card" data-id="${esc(q.id)}">
  <div class="card__chromatic"></div>
  <div class="card__body">
    <blockquote class="card__quote card__quote--clamped" data-expanded="false">${esc(q.text)}</blockquote>
    ${isLong ? `<button class="card__expand" data-action="expand">Show more</button>` : ''}
  </div>
  <div class="card__meta">
    <img class="card__favicon" src="${favicon}" alt="" width="14" height="14" onerror="this.style.display='none'">
    <div class="card__source-info">
      <a class="card__source-title" href="${esc(q.url)}" target="_blank" rel="noopener noreferrer" title="${esc(q.title)}">${esc(q.title)}</a>
      <span class="card__source-domain">${esc(q.domain)}</span>
    </div>
    <time class="card__time" datetime="${esc(q.savedAt)}">${date}</time>
  </div>
  ${q.author ? `<div class="card__author">${esc(q.author)}</div>` : ''}
  <div class="card__cite">
    <div class="card__cite-tabs">
      <button class="cite-tab ${fmt==='apa'?'active':''}" data-action="cite-fmt" data-fmt="apa">APA</button>
      <button class="cite-tab ${fmt==='mla'?'active':''}" data-action="cite-fmt" data-fmt="mla">MLA</button>
      <button class="cite-tab ${fmt==='chicago'?'active':''}" data-action="cite-fmt" data-fmt="chicago">Chicago</button>
    </div>
    <div class="card__cite-text">${esc(citation)}</div>
  </div>
  <div class="card__actions">
    <button class="action-btn" data-action="copy-quote">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/>
      </svg>Copy
    </button>
    <button class="action-btn" data-action="copy-cite">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/>
      </svg>Cite
    </button>
    <button class="action-btn" data-action="toggle-note">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
      </svg>${q.note ? 'Note ·' : 'Note'}
    </button>
    ${albumTags}
    <button class="action-btn action-btn--album" data-action="album-menu" title="Add to album">＋</button>
    <button class="action-btn action-btn--danger" data-action="delete">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/>
        <path d="M10 11v6M14 11v6"/><path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/>
      </svg>
    </button>
  </div>
  <div class="card__note-wrap ${q.note ? '' : 'card__note-wrap--hidden'}">
    <textarea class="card__note" placeholder="Add a personal note…" data-action="note-input">${esc(q.note || '')}</textarea>
  </div>
</article>`;
}

// ── Filter logic ──────────────────────────────────
function applyFilters() {
  const now = new Date();
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const weekStart = new Date(todayStart);
  weekStart.setDate(todayStart.getDate() - todayStart.getDay());

  return quotes.filter(q => {
    if (searchQuery) {
      const hay = `${q.text} ${q.title} ${q.domain} ${q.author || ''} ${q.note || ''}`.toLowerCase();
      if (!hay.includes(searchQuery)) return false;
    }
    if (dateFilter === 'today' && new Date(q.savedAt) < todayStart) return false;
    if (dateFilter === 'week'  && new Date(q.savedAt) < weekStart)  return false;
    if (albumFilter !== null && !(q.albums || []).includes(albumFilter)) return false;
    return true;
  });
}

// ── Events ────────────────────────────────────────
function bindEvents() {
  document.getElementById('search-input').addEventListener('input', e => {
    searchQuery = e.target.value.trim().toLowerCase();
    renderAll();
  });

  document.getElementById('filters').addEventListener('click', e => {
    const chip = e.target.closest('[data-filter]');
    if (chip) {
      document.querySelectorAll('.filter-chip').forEach(c => c.classList.remove('active'));
      chip.classList.add('active');
      dateFilter = chip.dataset.filter;
      renderAll();
      return;
    }
    const albumChip = e.target.closest('[data-album-id]');
    if (albumChip) {
      const id = albumChip.dataset.albumId;
      albumFilter = albumFilter === id ? null : id;
      renderFilters();
      renderAll();
    }
  });

  document.getElementById('theme-btn').addEventListener('click', toggleTheme);
  document.getElementById('new-album-btn').addEventListener('click', showNewAlbumForm);

  // Tab switching
  document.querySelectorAll('.view-tab').forEach(tab => {
    tab.addEventListener('click', () => switchTab(tab.dataset.view));
  });

  document.getElementById('quotes-list').addEventListener('click', handleCardClick);
  document.getElementById('quotes-list').addEventListener('focusout', e => {
    if (!e.target.matches('.card__note')) return;
    const card = e.target.closest('.card');
    const id = card?.dataset.id;
    if (!id) return;
    const note = e.target.value;
    const q = quotes.find(x => x.id === id);
    if (q) q.note = note;
    chrome.runtime.sendMessage({ action: 'updateQuote', id, patch: { note } });
  });

  document.getElementById('export-copy').addEventListener('click', copyExport);

  document.querySelectorAll('.export-cite-tabs .tab').forEach(tab => {
    tab.addEventListener('click', () => {
      document.querySelectorAll('.export-cite-tabs .tab').forEach(t => t.classList.remove('active'));
      tab.classList.add('active');
      exportCiteFmt = tab.dataset.fmt;
      updateExportPreview();
    });
  });

  document.querySelectorAll('[name="export-format"]').forEach(r => {
    r.addEventListener('change', updateExportPreview);
  });
}

function handleCardClick(e) {
  const btn = e.target.closest('[data-action]');
  if (!btn) return;
  const card = btn.closest('.card');
  const id = card?.dataset.id;
  const q = quotes.find(x => x.id === id);
  if (!q) return;

  switch (btn.dataset.action) {
    case 'expand': {
      const bq = card.querySelector('.card__quote');
      const expanded = bq.dataset.expanded === 'true';
      bq.dataset.expanded = String(!expanded);
      bq.classList.toggle('card__quote--clamped', expanded);
      btn.textContent = expanded ? 'Show more' : 'Show less';
      break;
    }
    case 'copy-quote':
      copyText(q.text, btn, 'Copied!');
      break;
    case 'copy-cite':
      copyText(formatCitation(q, q.citationFormat || 'apa'), btn, 'Copied!');
      break;
    case 'cite-fmt': {
      const fmt = btn.dataset.fmt;
      card.querySelectorAll('.cite-tab').forEach(t => t.classList.toggle('active', t.dataset.fmt === fmt));
      card.querySelector('.card__cite-text').textContent = formatCitation(q, fmt);
      q.citationFormat = fmt;
      chrome.runtime.sendMessage({ action: 'updateQuote', id, patch: { citationFormat: fmt } });
      break;
    }
    case 'toggle-note': {
      const wrap = card.querySelector('.card__note-wrap');
      wrap.classList.toggle('card__note-wrap--hidden');
      if (!wrap.classList.contains('card__note-wrap--hidden')) card.querySelector('.card__note').focus();
      break;
    }
    case 'album-menu':
      showAlbumMenu(btn, q);
      break;
    case 'delete':
      handleDelete(btn, id);
      break;
  }
}

function handleDelete(btn, id) {
  if (btn.dataset.confirming === 'true') {
    chrome.runtime.sendMessage({ action: 'deleteQuote', id }, () => {
      quotes = quotes.filter(q => q.id !== id);
      renderAll();
    });
    return;
  }
  btn.dataset.confirming = 'true';
  btn.classList.add('action-btn--confirming');
  const origHTML = btn.innerHTML;
  btn.innerHTML = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="width:11px;height:11px"><path d="M12 9v4m0 4h.01"/><circle cx="12" cy="12" r="10"/></svg>Sure?`;
  setTimeout(() => {
    if (btn.dataset.confirming === 'true') {
      btn.dataset.confirming = 'false';
      btn.classList.remove('action-btn--confirming');
      btn.innerHTML = origHTML;
    }
  }, 2500);
}

// ── Albums ────────────────────────────────────────
function showAlbumMenu(trigger, q) {
  document.querySelector('.album-popup')?.remove();
  const popup = document.createElement('div');
  popup.className = 'album-popup';

  const quoteAlbumIds = new Set(q.albums || []);
  popup.innerHTML = albums.length === 0
    ? `<p class="album-popup__empty">No albums — create one first</p>`
    : albums.map(a => `
        <label class="album-popup__item">
          <input type="checkbox" value="${esc(a.id)}" ${quoteAlbumIds.has(a.id) ? 'checked' : ''}>
          <span class="album-popup__dot" style="background:${a.color}"></span>
          <span>${esc(a.name)}</span>
        </label>`).join('');

  const rect = trigger.getBoundingClientRect();
  popup.style.cssText = `top:${rect.bottom + 6}px;left:${rect.left}px;`;
  document.body.appendChild(popup);

  popup.addEventListener('change', e => {
    const albumId = e.target.value;
    if (e.target.checked) {
      if (!q.albums) q.albums = [];
      if (!q.albums.includes(albumId)) q.albums.push(albumId);
    } else {
      q.albums = (q.albums || []).filter(aid => aid !== albumId);
    }
    chrome.runtime.sendMessage({ action: 'updateQuote', id: q.id, patch: { albums: q.albums } });
    renderAll();
  });

  const close = ev => {
    if (!popup.contains(ev.target) && ev.target !== trigger) {
      popup.remove();
      document.removeEventListener('click', close, true);
    }
  };
  setTimeout(() => document.addEventListener('click', close, true), 0);
}

function showNewAlbumForm() {
  if (document.getElementById('new-album-form')) {
    document.getElementById('new-album-form').querySelector('input').focus();
    return;
  }
  const palette = ['#818cf8', '#34d399', '#f59e0b', '#f472b6', '#60a5fa', '#a78bfa', '#fb923c'];
  let colorIdx = Math.floor(Math.random() * palette.length);
  let color = palette[colorIdx];

  const form = document.createElement('div');
  form.id = 'new-album-form';
  form.className = 'new-album-form';
  form.innerHTML = `
    <span class="album-color-swatch" id="color-swatch" style="background:${color}" title="Click to cycle colour"></span>
    <input type="text" placeholder="Album name…" maxlength="30" autocomplete="off">
    <button class="action-btn" id="save-album-btn">Create</button>
    <button class="icon-btn icon-btn--sm" id="cancel-album-btn">✕</button>`;

  document.getElementById('filters').after(form);
  const input = form.querySelector('input');
  input.focus();

  form.querySelector('#color-swatch').addEventListener('click', () => {
    colorIdx = (colorIdx + 1) % palette.length;
    color = palette[colorIdx];
    form.querySelector('#color-swatch').style.background = color;
  });

  const save = () => {
    const name = input.value.trim();
    if (!name) return;
    const album = { id: `${Date.now()}`, name, color, createdAt: new Date().toISOString() };
    chrome.runtime.sendMessage({ action: 'createAlbum', album }, () => {
      albums.push(album);
      renderFilters();
      form.remove();
    });
  };

  form.querySelector('#save-album-btn').addEventListener('click', save);
  form.querySelector('#cancel-album-btn').addEventListener('click', () => form.remove());
  input.addEventListener('keydown', e => {
    if (e.key === 'Enter') save();
    if (e.key === 'Escape') form.remove();
  });
}

// ── Tab switching ─────────────────────────────────
function switchTab(name) {
  document.querySelectorAll('.view-tab').forEach(t => t.classList.toggle('active', t.dataset.view === name));
  document.getElementById('quotes-view').hidden = name !== 'quotes';
  document.getElementById('export-view').hidden  = name !== 'export';
  if (name === 'export') updateExportPreview();
}

// ── Export ────────────────────────────────────────

function updateExportPreview() {
  const fmt = document.querySelector('[name="export-format"]:checked')?.value || 'text';
  document.getElementById('export-preview').value = buildExport(applyFilters(), fmt, exportCiteFmt);
}

function buildExport(qs, fmt, citeFmt) {
  if (fmt === 'json') return JSON.stringify(qs, null, 2);
  const sep = '\n\n---\n\n';
  return qs.map(q => {
    const cite = formatCitation(q, citeFmt);
    const date = fmtDate(q.savedAt);
    if (fmt === 'md') {
      return [`> "${q.text}"`, `>`, `> — ${cite}`, q.note ? `\n*Note: ${q.note}*` : ''].filter(Boolean).join('\n');
    }
    return [`"${q.text}"`, `Source: ${cite}`, `Saved: ${date}`, q.note ? `Note: ${q.note}` : ''].filter(Boolean).join('\n');
  }).join(sep);
}

async function copyExport() {
  const text = document.getElementById('export-preview').value;
  await navigator.clipboard.writeText(text);
  const btn = document.getElementById('export-copy');
  const orig = btn.textContent;
  btn.textContent = 'Copied!';
  setTimeout(() => { btn.textContent = orig; }, 1500);
}

// ── Citations ─────────────────────────────────────
function formatCitation(q, format) {
  const d = new Date(q.savedAt);
  const year = d.getFullYear();
  const month = d.toLocaleString('default', { month: 'long' });
  const day = d.getDate();
  const author = q.author || null;
  const title = q.title || 'Untitled';
  const domain = q.domain || '';
  const url = q.url || '';

  const parts = (arr) => arr.filter(Boolean).join(' ');

  switch (format) {
    case 'apa':
      return parts([author && `${author}.`, `(${year}).`, `${title}.`, domain && `${domain}.`, url]);
    case 'mla':
      return parts([author && `${author}.`, `"${title}."`, domain && `${domain},`, `${day} ${month} ${year},`, url]);
    case 'chicago':
      return parts([author && `${author}.`, `"${title}."`, domain && `${domain}.`, `${month} ${day}, ${year}.`, url]);
    default:
      return url;
  }
}

// ── Utilities ─────────────────────────────────────
function fmtDate(iso) {
  const d = new Date(iso);
  const now = new Date();
  const diffMin = Math.floor((now - d) / 60000);
  if (diffMin < 1) return 'just now';
  if (diffMin < 60) return `${diffMin}m ago`;
  const diffH = Math.floor(diffMin / 60);
  if (diffH < 24) return `${diffH}h ago`;
  const diffD = Math.floor(diffH / 24);
  if (diffD === 1) return 'yesterday';
  if (diffD < 7) return `${diffD}d ago`;
  return d.toLocaleDateString('en-US', {
    month: 'short', day: 'numeric',
    ...(d.getFullYear() !== now.getFullYear() && { year: 'numeric' }),
  });
}

function esc(str) {
  if (str == null) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

async function copyText(text, btn, label) {
  try {
    await navigator.clipboard.writeText(text);
  } catch {
    const el = Object.assign(document.createElement('textarea'), { value: text });
    document.body.appendChild(el);
    el.select();
    document.execCommand('copy');
    el.remove();
  }
  if (!btn) return;
  const orig = btn.innerHTML;
  btn.innerHTML = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" style="width:11px;height:11px"><polyline points="20 6 9 17 4 12"/></svg>${label}`;
  setTimeout(() => { btn.innerHTML = orig; }, 1500);
}
