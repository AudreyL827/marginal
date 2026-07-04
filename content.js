chrome.runtime.onMessage.addListener((msg) => {
  if (msg.action === 'captureSelection') captureSelection();
});

function captureSelection() {
  const text = window.getSelection()?.toString().trim();
  if (!text) {
    showToast('Select some text first', 'info');
    return;
  }

  const quote = {
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    text,
    url: location.href,
    title: document.title,
    domain: location.hostname.replace(/^www\./, ''),
    author: extractAuthor(),
    savedAt: new Date().toISOString(),
    note: '',
    albums: [],
    citationFormat: 'apa',
  };

  chrome.runtime.sendMessage({ action: 'saveQuote', quote }, (res) => {
    if (res?.ok) showToast('Quote saved', 'success');
  });
}

function extractAuthor() {
  const metaSelectors = [
    'meta[name="author"]',
    'meta[property="article:author"]',
    'meta[name="creator"]',
  ];
  for (const sel of metaSelectors) {
    const val = document.querySelector(sel)?.content?.trim();
    if (val) return val;
  }

  const domSelectors = [
    '[rel="author"]', '[itemprop="author"]',
    '.author-name', '.byline__name', '.post-author',
    '[class*="byline"]', '[class*="author"]',
  ];
  for (const sel of domSelectors) {
    const el = document.querySelector(sel);
    const val = el?.textContent?.trim();
    if (val && val.length < 100) return val;
  }

  return null;
}

function showToast(message, type = 'success') {
  document.querySelector('.marginal-toast')?.remove();

  const toast = document.createElement('div');
  toast.className = `marginal-toast marginal-toast--${type}`;
  const icon = type === 'success' ? '✓' : 'ℹ';
  toast.innerHTML = `<span class="marginal-toast__icon">${icon}</span><span>${message}</span>`;
  document.body.appendChild(toast);

  requestAnimationFrame(() => toast.classList.add('marginal-toast--show'));
  setTimeout(() => {
    toast.classList.remove('marginal-toast--show');
    setTimeout(() => toast.remove(), 250);
  }, 2200);
}
