// ChatRoom 666 - Background Service Worker
const ROOM_ID = '666';
let ws = null;
let myName = '';
let connected = false;
let reconnectTimer = null;
let pingInterval = null;
let messageHistory = [];
let onlineCount = 0;
let userStates = {};
let userListCache = [];
let userListWaiters = [];
let event_target = null;
// Message ids already read in any tab (shared for cross-tab unread sync).
let readIds = [];
chrome.storage.session.get('readIds', (r) => { if (r.readIds) readIds = r.readIds; });

// Connected ports for real-time push
const ports = new Set();

async function getServerUrl() {
  const result = await chrome.storage.sync.get('serverUrl');
  return result.serverUrl || 'https://simple-chatroom-pwa.963614893.workers.dev';
}

async function getUserName() {
  const result = await chrome.storage.sync.get('xchat_name');
  if (result.xchat_name) return result.xchat_name;
  const name = 'User' + Math.floor(Math.random() * 9000 + 1000);
  await chrome.storage.sync.set({ xchat_name: name });
  return name;
}

function closeSocket() {
  if (ws) {
    const oldWs = ws;
    ws = null;
    try {
      oldWs.onclose = null;
      oldWs.onerror = null;
      oldWs.onmessage = null;
      oldWs.onopen = null;
      if (oldWs.readyState === WebSocket.OPEN || oldWs.readyState === WebSocket.CONNECTING) {
        oldWs.close();
      }
    } catch (e) {}
  }
}

// Push state to all connected ports
function pushToPorts() {
  const state = {
    type: 'state',
    connected: connected,
    myName: myName,
    onlineCount: onlineCount,
    messageHistory: messageHistory.slice(-50)
  };
  for (const port of ports) {
    try { port.postMessage(state); } catch (e) {}
  }
}

// Push a single new message to all ports
function pushMessage(msg) {
  const data = { type: 'message', message: msg };
  for (const port of ports) {
    try { port.postMessage(data); } catch (e) {}
  }
}

// Push status/left events to all ports
function pushStatus(data) {
  for (const port of ports) {
    try { port.postMessage(data); } catch (e) {}
  }
}

async function connect() {
  if (ws && (ws.readyState === WebSocket.OPEN || ws.readyState === WebSocket.CONNECTING)) return;
  closeSocket();
  const serverUrl = await getServerUrl();
  myName = await getUserName();
  const wsUrl = serverUrl.replace(/^http/, 'ws') + '/ws?room=' + ROOM_ID;
  try {
    ws = new WebSocket(wsUrl);
    event_target = ws;
    ws.onopen = async () => {
      connected = true;
      await chrome.storage.session.set({ connected: true });
      ws.send(JSON.stringify({ type: 'join', roomId: ROOM_ID, name: myName }));
      startPing();
      broadcastStatus();
      pushToPorts();
    };
    ws.onmessage = (event) => {
      let data;
      try { data = JSON.parse(event.data); } catch (e) { return; }
      handleMessage(data);
    };
    ws.onclose = () => {
      if (ws === event_target) {
        connected = false;
        chrome.storage.session.set({ connected: false });
        stopPing();
        pushToPorts();
        scheduleReconnect();
      }
    };
    ws.onerror = () => {};
  } catch (e) {
    scheduleReconnect();
  }
}

function handleMessage(data) {
  switch (data.type) {
    case 'joined':
      messageHistory = data.history || [];
      onlineCount = data.onlineCount || 0;
      chrome.storage.session.set({ connected: true, onlineCount: onlineCount, messageHistory: messageHistory.slice(-50) });
      pushToPorts();
      break;
      case 'chat':
        // Server messages carry no stable id. Build a deterministic fingerprint
        // from name+text+time+img so the same message always maps to the same id,
        // enabling reliable de-duplication on the client.
        if (!data.id) {
          data.id = 'msg-' + (data.name || '') + '-' + (data.time || 0) + '-' +
                    (data.text || '').length + '-' + (data.img ? data.img.length : 0);
        }
        // Drop exact duplicates that the server may re-broadcast.
        if (messageHistory.some(function(m) { return m.id === data.id; })) break;
        messageHistory.push(data);
        if (messageHistory.length > 200) messageHistory = messageHistory.slice(-200);
        chrome.storage.session.set({ messageHistory: messageHistory.slice(-50) });
        pushMessage(data);
        break;
    case 'system':
      // Deterministic id from the message content so a re-broadcast of the same
      // join/leave notice is deduped instead of shown twice.
      const sysId = 'sys-' + (data.message || '') + '-' + (data.time || 0);
      if (messageHistory.some(function(m) { return m.id === sysId; })) break;
      const sysMsg = { type: 'chat', name: 'System', text: data.message, img: null, time: data.time, id: sysId };
      messageHistory.push(sysMsg);
      if (messageHistory.length > 200) messageHistory = messageHistory.slice(-200);
      chrome.storage.session.set({ messageHistory: messageHistory.slice(-50) });
      pushMessage(sysMsg);
      break;
    case 'onlineCount':
      onlineCount = data.count;
      chrome.storage.session.set({ onlineCount: data.count });
      pushToPorts();
      break;
    case 'userList':
      userListCache = data.names || [];
      onlineCount = userListCache.length;
      chrome.storage.session.set({ userList: userListCache, onlineCount: onlineCount });
      pushStatus({ type: 'onlineCount', count: onlineCount });
      flushUserListWaiters();
      break;
    case 'status':
      userStates[data.name] = { device: data.device, visible: data.visible };
      pushStatus({ type: 'status', name: data.name, device: data.device, visible: data.visible });
      break;
    case 'left':
      if (userStates[data.name]) userStates[data.name].visible = 'left';
      pushStatus({ type: 'left', name: data.name });
      break;
    case 'pong':
      break;
  }
}

async function sendChatMessage(text, img) {
  if (!ws || ws.readyState !== WebSocket.OPEN) return false;
  ws.send(JSON.stringify({ type: 'chat', text: text || '', img: img || null }));
  return true;
}

async function sendRename(newName) {
  if (!ws || ws.readyState !== WebSocket.OPEN) return;
  ws.send(JSON.stringify({ type: 'rename', name: newName }));
  myName = newName;
  await chrome.storage.sync.set({ xchat_name: newName });
  pushToPorts();
}

function flushUserListWaiters() {
  const waiters = userListWaiters.slice();
  userListWaiters = [];
  for (const cb of waiters) {
    try { cb(userListCache); } catch (e) {}
  }
}

function requestUserList() {
  if (ws && ws.readyState === WebSocket.OPEN) {
    ws.send(JSON.stringify({ type: 'list' }));
  }
}

function broadcastStatus() {
  if (ws && ws.readyState === WebSocket.OPEN) {
    ws.send(JSON.stringify({ type: 'status', name: myName, device: 'desktop', visible: true }));
  }
}

function sendStatus(visible) {
  if (ws && ws.readyState === WebSocket.OPEN) {
    ws.send(JSON.stringify({ type: 'status', name: myName, device: 'desktop', visible: !!visible }));
  }
}

function startPing() {
  stopPing();
  pingInterval = setInterval(() => {
    if (ws && ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify({ type: 'ping' }));
    }
  }, 3000);
}

function stopPing() {
  if (pingInterval) { clearInterval(pingInterval); pingInterval = null; }
}

function scheduleReconnect() {
  if (reconnectTimer) return;
  reconnectTimer = setTimeout(() => { reconnectTimer = null; connect(); }, 2000);
}

async function notifyContentScript(data) {
  try {
    const tabs = await chrome.tabs.query({});
    for (const tab of tabs) {
      if (tab.id !== undefined) {
        chrome.tabs.sendMessage(tab.id, { action: 'chatMessage', data: data }).catch(() => {});
      }
    }
  } catch (e) {}
}

// Port connection for real-time push
chrome.runtime.onConnect.addListener((port) => {
  if (port.name === 'chatroom666') {
    ports.add(port);
    // Send initial state
    try {
      port.postMessage({
        type: 'state',
        connected: connected,
        myName: myName,
        onlineCount: onlineCount,
        messageHistory: messageHistory.slice(-50)
      });
    } catch (e) {}
    port.onDisconnect.addListener(() => {
      ports.delete(port);
    });
  }
});

// Message listener
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  switch (message.action) {
    case 'connect':
      connect();
      sendResponse({ ok: true });
      break;
    case 'disconnect':
      closeSocket();
      connected = false;
      chrome.storage.session.set({ connected: false });
      sendResponse({ ok: true });
      break;
    case 'sendChat':
      sendChatMessage(message.text, message.img).then(ok => sendResponse({ ok }));
      return true;
    case 'rename':
      sendRename(message.name).then(() => sendResponse({ ok: true }));
      return true;
    case 'getUserList':
      (function() {
        let done = false;
        const respond = (names) => {
          if (done) return;
          done = true;
          sendResponse({ ok: true, names: names || userListCache });
        };
        const timer = setTimeout(() => respond(userListCache), 1500);
        userListWaiters.push((names) => { clearTimeout(timer); respond(names); });
        requestUserList();
      })();
      return true;
    case 'getStatus':
      sendResponse({ connected: connected, myName: myName, onlineCount: onlineCount, messageHistory: messageHistory.slice(-50) });
      break;
    case 'setStatus':
      sendStatus(message.visible);
      sendResponse({ ok: true });
      break;
    case 'getActiveTabBg':
      (async () => {
        try {
          const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
          if (!tab || !tab.id) { sendResponse({ rgb: null }); return; }
          const results = await chrome.scripting.executeScript({
            target: { tabId: tab.id },
            func: () => {
              function readBg(el) {
                if (!el) return null;
                var bg = getComputedStyle(el).backgroundColor;
                var m = bg && bg.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)/);
                if (m && !(bg.indexOf('rgba(0, 0, 0, 0)') === 0)) return [parseInt(m[1], 10), parseInt(m[2], 10), parseInt(m[3], 10)];
                return null;
              }
              return readBg(document.body) || readBg(document.documentElement) || null;
            }
          });
          var rgb = (results && results[0] && results[0].result) || null;
          sendResponse({ rgb: rgb });
        } catch (e) {
          sendResponse({ rgb: null });
        }
      })();
      return true;
    case 'setServerUrl':
      chrome.storage.sync.set({ serverUrl: message.url });
      closeSocket();
      connect();
      sendResponse({ ok: true });
      break;
    case 'getServerUrl':
      getServerUrl().then(url => sendResponse({ url }));
      return true;
    case 'contentJoin':
      connect();
      sendResponse({ ok: true, myName: myName });
      break;
    case 'contentSendChat':
      sendChatMessage(message.text, message.img).then(ok => sendResponse({ ok }));
      return true;
    case 'isRead':
      sendResponse({ read: readIds.indexOf(message.id) !== -1 });
      break;
    case 'markRead':
      (message.ids || []).forEach(id => {
        if (readIds.indexOf(id) === -1) readIds.push(id);
      });
      if (readIds.length > 200) readIds = readIds.slice(-200);
      var lastReadTime = Date.now();
      chrome.storage.session.set({ readIds: readIds.slice(), lastReadTime: lastReadTime });
      // Broadcast to all tabs so they clear their unread indicator.
      chrome.runtime.sendMessage({ action: 'readUpdate', ids: readIds.slice(), lastReadTime: lastReadTime }, function() {});
      sendResponse({ ok: true });
      break;
  }
});

chrome.runtime.onInstalled.addListener(() => { connect(); });
chrome.runtime.onStartup.addListener(() => { connect(); });
connect();

// Auto-clear chat history daily at 19:10
function scheduleDailyClear() {
  const now = new Date();
  const target = new Date(now);
  target.setHours(19, 10, 0, 0);
  
  // If today's 19:10 has passed, schedule for tomorrow
  if (target <= now) {
    target.setDate(target.getDate() + 1);
  }
  
  const delay = target - now;
  setTimeout(() => {
    messageHistory = [];
    chrome.storage.session.remove('messageHistory');
    pushToPorts();
    scheduleDailyClear(); // Schedule next day
  }, delay);
}
scheduleDailyClear();











