chrome.runtime.onInstalled.addListener(() => {
  chrome.sidePanel.setPanelBehavior({ openPanelOnActionClick: true });
});

chrome.commands.onCommand.addListener(async (command) => {
  if (command !== 'save-quote') return;
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  if (!tab?.id) return;
  try {
    await chrome.tabs.sendMessage(tab.id, { action: 'captureSelection' });
  } catch {
    // chrome:// pages have no content script
  }
});

chrome.runtime.onMessage.addListener((msg, _sender, respond) => {
  switch (msg.action) {
    case 'saveQuote':
      saveQuote(msg.quote).then(() => respond({ ok: true }));
      return true;
    case 'getQuotes':
      getStorage().then(({ quotes }) => respond({ quotes: quotes || [] }));
      return true;
    case 'getAlbums':
      getStorage().then(({ albums }) => respond({ albums: albums || [] }));
      return true;
    case 'deleteQuote':
      deleteQuote(msg.id).then(() => respond({ ok: true }));
      return true;
    case 'updateQuote':
      updateQuote(msg.id, msg.patch).then(() => respond({ ok: true }));
      return true;
    case 'createAlbum':
      createAlbum(msg.album).then(() => respond({ ok: true }));
      return true;
    case 'deleteAlbum':
      deleteAlbum(msg.id).then(() => respond({ ok: true }));
      return true;
  }
});

async function getStorage() {
  return chrome.storage.local.get(['quotes', 'albums']);
}

async function saveQuote(quote) {
  const { quotes = [] } = await getStorage();
  quotes.unshift(quote);
  await chrome.storage.local.set({ quotes });
}

async function deleteQuote(id) {
  const { quotes = [] } = await getStorage();
  await chrome.storage.local.set({ quotes: quotes.filter(q => q.id !== id) });
}

async function updateQuote(id, patch) {
  const { quotes = [] } = await getStorage();
  const idx = quotes.findIndex(q => q.id === id);
  if (idx !== -1) quotes[idx] = { ...quotes[idx], ...patch };
  await chrome.storage.local.set({ quotes });
}

async function createAlbum(album) {
  const { albums = [] } = await getStorage();
  albums.push(album);
  await chrome.storage.local.set({ albums });
}

async function deleteAlbum(id) {
  const { quotes = [], albums = [] } = await getStorage();
  await chrome.storage.local.set({
    albums: albums.filter(a => a.id !== id),
    quotes: quotes.map(q => ({ ...q, albums: (q.albums || []).filter(aid => aid !== id) })),
  });
}
