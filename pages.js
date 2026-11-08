'use strict';
/*
 * AliasDock GitHub Pages DEMO (no backend, no SMTP, no public email addresses).
 * Data is intentionally kept in THIS BROWSER only. Do not store real email here.
 */
(() => {
  const DOMAIN = 'aliasdock.test';
  const STORE_KEY = 'aliasdock.pages.demo.v3';
  const $ = (id) => document.getElementById(id);
  const state = { aliases: [], messages: [], currentAlias: null, currentView: 'all', selected: null, search: '' };
  let toastTimer;

  function elm(tag, className, text) {
    const node = document.createElement(tag);
    if (className) node.className = className;
    if (text !== undefined) node.textContent = String(text);
    return node;
  }
  function notify(message, error = false) {
    const node = $('toast');
    node.textContent = message;
    node.className = 'toast show' + (error ? ' error' : '');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => node.className = 'toast', 4000);
  }
  function load() {
    try {
      const saved = JSON.parse(localStorage.getItem(STORE_KEY) || '{}');
      if (Array.isArray(saved.aliases) && Array.isArray(saved.messages)) {
        state.aliases = saved.aliases.filter(a => a && typeof a.id === 'string' && typeof a.local === 'string').slice(0, 200);
        state.messages = saved.messages.filter(m => m && typeof m.id === 'string' && typeof m.aliasId === 'string').slice(0, 500);
      }
    } catch { /* localStorage may be blocked; UI still works during current visit. */ }
  }
  function save() {
    try { localStorage.setItem(STORE_KEY, JSON.stringify({aliases: state.aliases, messages: state.messages})); }
    catch { notify('Browser-Speicher nicht verfügbar. Daten bleiben nur bis zum Neuladen.', true); }
  }
  function randomId() {
    if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') return crypto.randomUUID();
    return String(Date.now()) + '-' + Math.random().toString(36).slice(2);
  }
  function randomLocal() {
    const chars = 'abcdefghjkmnpqrstuvwxyz23456789';
    const b = new Uint8Array(9);
    if (typeof crypto !== 'undefined' && typeof crypto.getRandomValues === 'function') crypto.getRandomValues(b);
    else for (let i = 0; i < b.length; i++) b[i] = Math.floor(Math.random() * 256);
    return 'demo-' + Array.from(b, n => chars[n % chars.length]).join('');
  }
  function address(a) { return a.local + '@' + DOMAIN; }
  function counts(a) { return state.messages.filter(m => m.aliasId === a.id).length; }
  function fmtTime(ms) {
    try { return new Date(ms).toLocaleString('de-DE', {day:'2-digit', month:'2-digit', hour:'2-digit', minute:'2-digit'}); }
    catch { return ''; }
  }
  function initial(text) { return (text.trim().slice(0, 1) || '?').toUpperCase(); }
  function filteredMessages() {
    const q = state.search.toLocaleLowerCase('de-DE');
    return state.messages.filter(m => (!state.currentAlias || m.aliasId === state.currentAlias) &&
      (state.currentView !== 'unread' || !m.read) &&
      (!q || [m.subject, m.sender, m.body, state.aliases.find(a => a.id === m.aliasId)?.local || ''].join(' ').toLocaleLowerCase('de-DE').includes(q)))
      .sort((a, b) => b.at - a.at);
  }
  function renderStats() {
    $('stat-active').textContent = state.aliases.filter(a => a.active).length;
    $('stat-messages').textContent = state.messages.length;
    $('stat-unread').textContent = state.messages.filter(m => !m.read).length;
    $('nav-all-count').textContent = state.messages.length;
    $('nav-unread-count').textContent = state.messages.filter(m => !m.read).length;
  }
  function renderAliases() {
    const root = $('alias-nav'); root.replaceChildren();
    if (!state.aliases.length) {
      const empty = elm('p', 'alias-placeholder', 'Noch keine Demo-Adressen');
      empty.style.cssText = 'padding:10px 14px;color:#93a7b9;font-size:11px';
      root.append(empty);
    }
    for (const a of state.aliases) {
      const button = elm('button', 'alias-item' + (state.currentAlias === a.id ? ' selected' : ''));
      button.type = 'button';
      button.append(elm('span', 'alias-bullet' + (a.active ? '' : ' off')), elm('span', 'alias-name', a.local), elm('span', 'alias-count', counts(a)));
      button.title = address(a);
      button.addEventListener('click', () => {
        state.currentAlias = state.currentAlias === a.id ? null : a.id;
        state.selected = null; render();
      });
      root.append(button);
    }
  }
  function renderMessages() {
    const list = filteredMessages();
    $('list-count').textContent = list.length;
    $('filter-desc').textContent = state.currentView === 'unread' ? 'Ungelesene Testnachrichten' : 'Simulierte Nachrichten – keine echte Zustellung';
    const root = $('message-list'); root.replaceChildren();
    if (!list.length) {
      const holder = elm('div', 'empty-list');
      holder.append(elm('div', 'empty-illustration', '✉'), elm('strong', '', 'Keine Testnachrichten vorhanden.'),
        elm('p', '', 'Erstelle eine Beispieladresse und klicke auf „Testnachricht simulieren“.'));
      root.append(holder);
    }
    for (const msg of list) {
      const a = state.aliases.find(item => item.id === msg.aliasId);
      const button = elm('button', 'message-row' + (msg.read ? '' : ' unread') + (state.selected === msg.id ? ' selected' : ''));
      button.type = 'button';
      const body = elm('span', 'message-core');
      const meta = elm('span', 'message-meta');
      meta.append(elm('span', 'message-sender', msg.sender), elm('span', 'message-date', fmtTime(msg.at)));
      body.append(meta, elm('div', 'message-subject', msg.subject),
        elm('div', 'message-preview', msg.body.slice(0, 110)), elm('span', 'message-tag', a ? address(a) : 'Demo-Adresse entfernt'));
      button.append(elm('span', 'sender-avatar', initial(msg.sender)), body);
      button.addEventListener('click', () => openMessage(msg.id));
      root.append(button);
    }
    $('load-more').hidden = true;
  }
  function renderDetail() {
    const root = $('message-detail'); root.replaceChildren();
    const msg = state.messages.find(m => m.id === state.selected);
    if (!msg) {
      const wrap = elm('div', 'detail-empty');
      wrap.append(elm('div', 'empty-icon', '✉'), elm('strong', '', 'Ein ruhiger Demo-Posteingang.'),
        elm('span', '', 'Wähle eine simulierte Nachricht aus, um sie zu lesen.'));
      root.append(wrap);
      return;
    }
    const a = state.aliases.find(item => item.id === msg.aliasId);
    const article = elm('article', 'open-message');
    const actions = elm('div', 'detail-actions');
    const del = elm('button', 'delete-button', 'Löschen'); del.type = 'button';
    del.addEventListener('click', () => {
      if (!confirm('Diese Testnachricht löschen?')) return;
      state.messages = state.messages.filter(m => m.id !== msg.id);
      state.selected = null; save(); render(); notify('Testnachricht gelöscht.');
    });
    actions.append(elm('span', 'detail-label', 'SIMULIERTE NACHRICHT'), del);
    const sender = elm('div', 'detail-sender');
    const senderInfo = elm('div', 'detail-sender-info');
    senderInfo.append(elm('strong', '', msg.sender), elm('small', '', 'An: ' + (a ? address(a) : 'Gelöschte Demo-Adresse')));
    sender.append(elm('span', 'sender-avatar', initial(msg.sender)), senderInfo, elm('span', 'detail-date', fmtTime(msg.at)));
    article.append(actions, elm('h2', 'detail-subject', msg.subject), sender, elm('div', 'detail-body', msg.body));
    root.append(article);
  }
  function render() {
    renderStats(); renderAliases(); renderMessages(); renderDetail();
    $('nav-inbox').classList.toggle('active', state.currentView === 'all');
    $('nav-unread').classList.toggle('active', state.currentView === 'unread');
    $('breadcrumb-page').textContent = state.currentAlias ? 'BEISPIELADRESSE' : (state.currentView === 'unread' ? 'UNGELESEN' : 'POSTEINGANG');
    $('page-title').textContent = state.currentView === 'unread' ? 'Ungelesene Testnachrichten.' : 'Dein Demo-Posteingang.';
  }
  function openMessage(id) {
    state.selected = id;
    const m = state.messages.find(x => x.id === id);
    if (m && !m.read) { m.read = true; save(); }
    render();
  }
  function modalOpen() { $('alias-local').value = ''; $('create-dialog').showModal(); $('alias-local').focus(); }
  function createAlias(ev) {
    ev.preventDefault();
    const requested = $('alias-local').value.trim().toLowerCase();
    if (requested && !/^[a-z0-9][a-z0-9._-]{2,29}$/.test(requested)) {
      notify('Erlaubt: 3–30 Zeichen, Buchstaben/Zahlen/Punkt/Unterstrich/Bindestrich.', true); return;
    }
    let local = requested || randomLocal();
    if (state.aliases.some(a => a.local === local)) { notify('Diese Beispieladresse existiert bereits.', true); return; }
    if (state.aliases.length >= 200) { notify('Maximal 200 Demo-Adressen pro Browser.', true); return; }
    state.aliases.unshift({id: randomId(), local, active:true});
    save(); render(); $('create-dialog').close(); notify('Beispieladresse erstellt: ' + local + '@' + DOMAIN);
  }
  async function clipboard(text) {
    try { await navigator.clipboard.writeText(text); notify('Kopiert: ' + text); }
    catch { window.prompt('Adresse zum Kopieren:', text); }
  }
  function renderManage() {
    const root = $('manage-list'); root.replaceChildren();
    if (!state.aliases.length) { root.append(elm('p', '', 'Noch keine Beispieladressen vorhanden.')); return; }
    for (const a of state.aliases) {
      const wrap = elm('div', 'manage-row');
      const info = elm('div', 'manage-row-info');
      info.append(elm('strong', '', address(a)), elm('small', '', `${counts(a)} Demo-Nachrichten · ${a.active ? 'Aktiv' : 'Pausiert'}`));
      const copy = elm('button', '', 'Kopieren'); copy.type = 'button';
      copy.addEventListener('click', () => clipboard(address(a)));
      const toggle = elm('button', '', a.active ? 'Pausieren' : 'Aktivieren'); toggle.type = 'button';
      toggle.addEventListener('click', () => { a.active = !a.active; save(); render(); renderManage(); notify('Beispieladresse aktualisiert.'); });
      const del = elm('button', 'danger-link', 'Löschen'); del.type = 'button';
      del.addEventListener('click', () => {
        if (!confirm(`Beispieladresse ${address(a)} und deren Testnachrichten löschen?`)) return;
        state.aliases = state.aliases.filter(x => x.id !== a.id);
        state.messages = state.messages.filter(m => m.aliasId !== a.id);
        if (state.currentAlias === a.id) state.currentAlias = null;
        if (!state.messages.some(m => m.id === state.selected)) state.selected = null;
        save(); render(); renderManage(); notify('Beispieladresse gelöscht.');
      });
      wrap.append(elm('span', 'alias-bullet' + (a.active ? '' : ' off')), info, copy, toggle, del);
      root.append(wrap);
    }
  }
  function sendSimulated() {
    const active = state.aliases.filter(a => a.active);
    if (!active.length) { notify('Erstelle zuerst eine aktive Beispieladresse.', true); return; }
    const target = active.find(a => a.id === state.currentAlias) || active[0];
    const num = state.messages.length + 1;
    const newMail = {
      id: randomId(), aliasId: target.id, at: Date.now(), read: false,
      sender: 'AliasDock Demo', subject: `Testnachricht #${num}`,
      body: `Dies ist eine lokal simulierte Testnachricht für ${address(target)}.\n\nSie wurde ausschließlich durch den JavaScript-Code in deinem Browser erzeugt. Es wurde keine echte E-Mail verschickt und kein SMTP-Server kontaktiert.\n\nFür den echten Empfang musst du die separate Serverversion bereitstellen und eine dir gehörende Domain konfigurieren.`
    };
    state.messages.unshift(newMail);
    state.currentView = 'all'; state.currentAlias = target.id; state.selected = newMail.id;
    save(); render(); notify('Simulierte Nachricht hinzugefügt – keine echte E-Mail.');
  }
  function resetDemo() {
    if (!confirm('Alle Beispieladressen und Testnachrichten in diesem Browser löschen?')) return;
    state.aliases = []; state.messages = []; state.currentAlias = null; state.currentView = 'all'; state.selected = null;
    save(); render(); notify('Demo zurückgesetzt.');
  }
  function bind() {
    $('create-button').addEventListener('click', modalOpen);
    $('sidebar-create').addEventListener('click', modalOpen);
    $('create-form').addEventListener('submit', createAlias);
    $('close-create').addEventListener('click', () => $('create-dialog').close());
    $('cancel-create').addEventListener('click', () => $('create-dialog').close());
    $('manage-aliases').addEventListener('click', () => { renderManage(); $('manage-dialog').showModal(); });
    $('close-manage').addEventListener('click', () => $('manage-dialog').close());
    $('done-manage').addEventListener('click', () => $('manage-dialog').close());
    $('manage-create').addEventListener('click', () => { $('manage-dialog').close(); modalOpen(); });
    $('nav-inbox').addEventListener('click', () => { state.currentView='all'; state.selected=null; render(); });
    $('nav-unread').addEventListener('click', () => { state.currentView='unread'; state.selected=null; render(); });
    $('mail-search').addEventListener('input', (ev) => { state.search = ev.target.value.trim(); renderMessages(); });
    $('demo-send-button').addEventListener('click', sendSimulated);
    $('refresh-button').addEventListener('click', () => { load(); render(); notify('Lokale Demo aktualisiert.'); });
    $('logout-button').addEventListener('click', resetDemo);
  }
  try { load(); bind(); render(); }
  catch (error) {
    const title = $('delivery-title'), message = $('delivery-description');
    if (title && message) { title.textContent = 'Ein Fehler ist aufgetreten'; message.textContent = 'Bitte aktualisiere die Seite. Die Demo hat keinen Zugriff auf echte E-Mails.'; }
    console.error('AliasDock demo error:', error);
  }
})();
