// ChatRoom 666 - Content Script
// Floating button on web pages, hover to show chat panel. UI + features copied from popup.

(function() {
  'use strict';

  var myName = '';
  var pendingImg = '';
  var messageHistory = [];
  var renderedCount = 0;
  var port = null;
  var widgetEl = null;
  var toggleBtn = null;
  var userStates = {};
  var currentEmojiTab = 'basic';


  function $(id) { return document.getElementById(id); }
  function avatarLetter(name) { return name ? name.charAt(0).toUpperCase() : '?'; }
  function fmtTime(ts) { var d = new Date(ts); return ('0'+d.getHours()).slice(-2)+':'+('0'+d.getMinutes()).slice(-2); }
  function showToast(msg) { var t = $('cr666-error-toast'); if (!t) return; t.textContent = msg; t.style.display = 'block'; setTimeout(function(){ t.style.display = 'none'; }, 3000); }

  var dragging = false;
  var dragMoved = false;
  var dragOffX = 0;
  var dragOffY = 0;
  var hasUnread = false;

  // Reposition the chat widget relative to the toggle button's current location
  function positionWidget() {
    if (!widgetEl || !toggleBtn) return;
    var rect = toggleBtn.getBoundingClientRect();
    var winW = 380, winH = 540;
    var left = rect.left;
    var top = rect.top - winH - 12;
    if (top < 8) top = rect.bottom + 12;
    if (left + winW > window.innerWidth - 8) left = window.innerWidth - winW - 8;
    if (left < 8) left = 8;
    if (top + winH > window.innerHeight - 8) top = window.innerHeight - winH - 8;
    if (top < 8) top = 8;
    widgetEl.style.left = left + 'px';
    widgetEl.style.top = top + 'px';
    widgetEl.style.right = 'auto';
    widgetEl.style.bottom = 'auto';
  }

  function createToggleButton() {
    toggleBtn = document.createElement('div');
    toggleBtn.id = 'chatroom666-toggle';
    toggleBtn.style.cssText = 'position:fixed;bottom:20px;right:20px;width:44px;height:44px;border-radius:50%;background:rgba(128,128,128,.15);backdrop-filter:blur(12px) saturate(1.5);-webkit-backdrop-filter:blur(12px) saturate(1.5);color:var(--cr666-text);display:flex;align-items:center;justify-content:center;cursor:grab;z-index:2147483647;box-shadow:0 2px 10px rgba(0,0,0,.15);font-size:20px;font-weight:700;transition:transform .2s,background .2s;user-select:none;border:1px solid var(--cr666-border);' + getThemeVars();
    toggleBtn.textContent = '?';
    toggleBtn.title = 'ChatRoom 666 (drag to move)';

    // Double-click to open chat (drag does not trigger click)
    toggleBtn.addEventListener('dblclick', function(e) {
      e.preventDefault();
      if (dragMoved) { dragMoved = false; return; }
      showWidget();
    });
    toggleBtn.addEventListener('mouseenter', function() {
      if (dragging) return;
      toggleBtn.style.transform = 'scale(1.08)';
      toggleBtn.style.background = 'rgba(0,0,0,.08)';
    });
    toggleBtn.addEventListener('mouseleave', function() {
      if (dragging) return;
      toggleBtn.style.transform = 'scale(1)';
      toggleBtn.style.background = 'transparent';
    });

    // Drag to move
    toggleBtn.addEventListener('mousedown', function(e) {
      e.preventDefault();
      dragging = true;
      dragMoved = false;
      var rect = toggleBtn.getBoundingClientRect();
      dragOffX = e.clientX - rect.left;
      dragOffY = e.clientY - rect.top;
      toggleBtn.style.cursor = 'grabbing';
      toggleBtn.style.transition = 'none';
      document.body.style.userSelect = 'none';
    });

    document.addEventListener('mousemove', function(e) {
      if (!dragging) return;
      dragMoved = true;
      var size = 44;
      var left = e.clientX - dragOffX;
      var top = e.clientY - dragOffY;
      left = Math.max(0, Math.min(left, window.innerWidth - size));
      top = Math.max(0, Math.min(top, window.innerHeight - size));
      toggleBtn.style.left = left + 'px';
      toggleBtn.style.top = top + 'px';
      toggleBtn.style.right = 'auto';
      toggleBtn.style.bottom = 'auto';
      if (widgetEl && widgetEl.style.display !== 'none') positionWidget();
    });

    document.addEventListener('mouseup', function() {
      if (!dragging) return;
      dragging = false;
      toggleBtn.style.cursor = 'grab';
      toggleBtn.style.transition = 'transform .2s,background .2s';
      document.body.style.userSelect = '';
      if (widgetEl && widgetEl.style.display !== 'none') positionWidget();
    });

    document.body.appendChild(toggleBtn);
  }

  // Build the chat panel UI, copied from popup.html
  function buildPanelHTML() {
    return '' +
      '<div class="cr666-header">' +
        '<div class="cr666-user-bar" id="cr666-user-bar"></div>' +
      '</div>' +
      '<div class="cr666-messages" id="cr666-messages"></div>' +
      '<div class="cr666-emoji-panel" id="cr666-emoji-panel">' +
        '<div class="cr666-emoji-tabs" style="display:flex;gap:10px;margin-bottom:8px;align-items:center">' +
          '<span class="cr666-emoji-tab active" id="cr666-tab-basic" style="font-size:12px;color:#fff;background:#333;padding:3px 8px;border-radius:4px;cursor:pointer">Basic</span>' +
          '<span class="cr666-emoji-tab" id="cr666-tab-custom" style="font-size:12px;color:#888;padding:3px 8px;border-radius:4px;cursor:pointer">Custom</span>' +
          '<span id="cr666-emoji-add" style="margin-left:auto;font-size:18px;color:#888;cursor:pointer;padding:2px 8px">+</span>' +
        '</div>' +
        '<div id="cr666-emoji-recent" style="display:none;margin-bottom:8px;padding-bottom:8px;border-bottom:1px solid var(--cr666-border)">' +
          '<div style="font-size:11px;color:var(--cr666-faint);margin-bottom:6px">Recent</div>' +
          '<div id="cr666-emoji-recent-grid" style="display:grid;grid-template-columns:repeat(10,1fr);gap:2px"></div>' +
        '</div>' +
        '<div class="cr666-emoji-grid" id="cr666-emoji-grid"></div>' +
        '<input type="file" id="cr666-emoji-file-input" accept="image/*" style="display:none">' +
      '</div>' +
      '<div class="cr666-img-preview" id="cr666-img-preview" style="display:none"></div>' +
      '<div class="cr666-input-area">' +
        '<input type="text" id="cr666-msg-input" placeholder="Type a message..." maxlength="2000">' +
        '<button class="cr666-emoji-toggle" id="cr666-emoji-toggle" title="Emoji">&#128512;</button>' +
        '<button class="cr666-p-btn" id="cr666-p-btn" title="Send Image">P</button>' +
        '<input type="file" id="cr666-img-file-input" accept="image/*" style="display:none">' +
        '<button class="cr666-send-btn" id="cr666-send-btn">Send</button>' +
      '</div>' +
      '<div class="cr666-overlay" id="cr666-rename-overlay"><div class="cr666-modal-box"><h3>Rename <span class="cr666-close" id="cr666-rename-close">&times;</span></h3><input type="text" id="cr666-rename-input" placeholder="New name" maxlength="20"><button class="cr666-modal-btn" id="cr666-rename-save">Save</button></div></div>' +
      '<div class="cr666-error-toast" id="cr666-error-toast"></div>';
  }

  // Styles copied from popup.html, scoped under #chatroom666-widget to avoid leaking into the host page
  function buildPanelCSS() {
    var s = '#chatroom666-widget ';
    return [
      s + '{font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,sans-serif;background:transparent;color:var(--cr666-text);display:flex;flex-direction:column;overflow:hidden;border-radius:16px}',
      s + '::-webkit-scrollbar{width:5px}',
      s + '::-webkit-scrollbar-track{background:transparent}',
      s + '::-webkit-scrollbar-thumb{background:rgba(128,128,128,.3);border-radius:10px}',
      s + '::-webkit-scrollbar-thumb:hover{background:rgba(128,128,128,.5)}',
      s + '.cr666-header{background:rgba(128,128,128,.06);border-bottom:1px solid var(--cr666-border);padding:14px 18px;display:flex;align-items:center;justify-content:center;position:relative;flex-shrink:0}',
      s + '.cr666-user-bar{display:flex;align-items:center;justify-content:center;width:100%;padding:0 4px;gap:10px;flex-wrap:wrap}',
      s + '.cr666-user-bar .cr666-user-item{font-size:11px;font-weight:600;white-space:nowrap;padding:3px 10px;border-radius:12px;border:1px solid rgba(128,128,128,.25);background:rgba(128,128,128,.08);transition:color .3s ease,background .3s ease}',
      s + '.cr666-user-bar .cr666-user-item.online{color:#4ade80;background:rgba(74,222,128,.1);border-color:rgba(74,222,128,.3)}',
      s + '.cr666-user-bar .cr666-user-item.offline{color:#ef4444;background:rgba(239,68,68,.1);border-color:rgba(239,68,68,.3)}',
      s + '.cr666-header-actions{position:absolute;right:16px;display:flex;gap:6px}',
      s + '.cr666-header-actions button{padding:5px 12px;border:1px solid var(--cr666-border);border-radius:20px;background:transparent;color:var(--cr666-sub);cursor:pointer;font-size:11px;transition:all .25s ease}',
      s + '.cr666-header-actions button:hover{border-color:var(--cr666-sub);color:var(--cr666-text);background:rgba(128,128,128,.1);transform:translateY(-1px)}',
      s + '.cr666-messages{flex:1;overflow-y:auto;padding:16px;display:flex;flex-direction:column;gap:14px}',
      s + '.cr666-msg-row{display:flex;align-items:flex-start;gap:8px;max-width:85%;animation:cr666-fadeIn .2s ease}',
      '@keyframes cr666-fadeIn{from{opacity:0;transform:translateY(6px)}to{opacity:1;transform:none}}',
      s + '.cr666-msg-row.self{align-self:flex-end;flex-direction:row-reverse}',
      s + '.cr666-msg-row.other{align-self:flex-start}',
      s + '.cr666-avatar{width:32px;height:32px;border-radius:50%;flex-shrink:0;display:flex;align-items:center;justify-content:center;font-size:13px;font-weight:700;color:#fff;border:1px solid var(--cr666-border);box-shadow:0 2px 8px rgba(0,0,0,.15)}',
      s + '.cr666-msg-body{display:flex;flex-direction:column;gap:3px}',
      s + '.cr666-msg-row.self .cr666-msg-body{align-items:flex-end}',
      s + '.cr666-msg-row.other .cr666-msg-body{align-items:flex-start}',
      s + '.cr666-msg-line{display:flex;align-items:center;gap:6px}',
      s + '.cr666-msg-row.self .cr666-msg-line{flex-direction:row-reverse}',
      s + '.cr666-msg-name{font-size:11px;font-weight:600;color:var(--cr666-sub);white-space:nowrap}',
      s + '.cr666-msg-bubble{font-size:13px;line-height:1.5;word-break:break-word;padding:8px 12px;border-radius:12px;background:rgba(128,128,128,.08)}',
      s + '.cr666-msg-row.self .cr666-msg-bubble{color:var(--cr666-text);border-bottom-right-radius:4px}',
      s + '.cr666-msg-row.other .cr666-msg-bubble{color:var(--cr666-text);border-bottom-left-radius:4px}',
      s + '.cr666-msg-time{font-size:10px;color:var(--cr666-faint);padding:0 4px}',
      s + '.cr666-msg.system{align-self:center;color:var(--cr666-faint);font-size:11px;padding:4px 12px;background:rgba(128,128,128,.06);border-radius:12px}',
      s + '.cr666-emoji-panel{background:rgba(28,28,28,.85);border-top:1px solid rgba(255,255,255,.06);padding:12px 14px;max-height:160px;overflow-y:auto;flex-shrink:0;display:none}',
      s + '.cr666-emoji-grid{display:grid;grid-template-columns:repeat(10,1fr);gap:2px}',
      s + '.cr666-emoji-item{font-size:20px;cursor:pointer;padding:3px;text-align:center;border-radius:8px;transition:all .15s ease}',
      s + '.cr666-emoji-item:hover{background:rgba(128,128,128,.15);transform:scale(1.15)}',
      s + '.cr666-img-preview{background:rgba(28,28,28,.85);padding:10px 14px;border-top:1px solid rgba(255,255,255,.06);position:relative;flex-shrink:0}',
      s + '.cr666-img-preview img{max-height:100px;border-radius:12px;display:block;box-shadow:0 2px 12px rgba(0,0,0,.2)}',
      s + '.cr666-img-preview .cr666-remove-img{position:absolute;top:8px;right:10px;background:rgba(0,0,0,.6);color:#fff;border:none;width:22px;height:22px;border-radius:50%;cursor:pointer;font-size:12px;line-height:1;transition:all .2s}',
      s + '.cr666-img-preview .cr666-remove-img:hover{background:#ef4444;transform:scale(1.1)}',
      s + '.cr666-input-area{background:rgba(128,128,128,.06);border-top:1px solid var(--cr666-border);padding:12px 14px;display:flex;gap:8px;flex-shrink:0}',
      s + '.cr666-input-area input{flex:1;padding:11px 14px;border:1px solid var(--cr666-border);border-radius:20px;background:var(--cr666-input-bg);color:var(--cr666-text);font-size:13px;outline:none;transition:all .25s ease}',
      s + '.cr666-input-area input:focus{border-color:var(--cr666-sub);box-shadow:0 0 0 3px rgba(128,128,128,.1)}',
      s + '.cr666-p-btn{width:40px;height:40px;border:1px solid var(--cr666-border);border-radius:50%;background:var(--cr666-btn-bg);color:var(--cr666-btn-text);font-size:16px;font-weight:700;cursor:pointer;transition:all .25s ease;line-height:1;display:flex;align-items:center;justify-content:center}',
      s + '.cr666-p-btn:hover{border-color:var(--cr666-sub);color:var(--cr666-text);transform:translateY(-2px);box-shadow:0 4px 12px rgba(0,0,0,.15)}',
      s + '.cr666-emoji-toggle{width:40px;height:40px;border:1px solid var(--cr666-border);border-radius:50%;background:var(--cr666-btn-bg);color:var(--cr666-btn-text);font-size:18px;cursor:pointer;transition:all .25s ease;line-height:1;display:flex;align-items:center;justify-content:center}',
      s + '.cr666-emoji-toggle:hover{border-color:var(--cr666-sub);color:var(--cr666-text);transform:translateY(-2px);box-shadow:0 4px 12px rgba(0,0,0,.15)}',
      s + '.cr666-send-btn{padding:11px 18px;border:none;border-radius:20px;background:var(--cr666-btn-bg);color:var(--cr666-text);font-size:13px;font-weight:600;cursor:pointer;transition:all .25s ease}',
      s + '.cr666-send-btn:hover{opacity:.9;transform:translateY(-2px);box-shadow:0 4px 12px rgba(0,0,0,.15)}',
      s + '.cr666-overlay{position:absolute;top:0;left:0;right:0;bottom:0;background:var(--cr666-overlay-bg,rgba(0,0,0,.5));z-index:200;display:none;align-items:center;justify-content:center;border-radius:16px;overflow:hidden}',
      s + '.cr666-overlay.show{display:flex}',
      s + '.cr666-modal-box{box-sizing:border-box;background:rgba(28,28,28,.95);border:1px solid rgba(255,255,255,.1);border-radius:16px;padding:20px;width:85%;max-width:280px;max-height:60vh;display:flex;flex-direction:column;box-shadow:0 12px 48px rgba(0,0,0,.4)}',
      s + '.cr666-modal-box h3{font-size:14px;margin-bottom:14px;color:var(--cr666-sub);display:flex;justify-content:space-between;align-items:center}',
      s + '.cr666-modal-box .cr666-close{cursor:pointer;color:var(--cr666-sub);font-size:18px;line-height:1;transition:color .2s}',
      s + '.cr666-modal-box .cr666-close:hover{color:#ef4444}',
      s + '.cr666-modal-box input{width:100%;padding:10px 12px;border:1px solid var(--cr666-border);border-radius:8px;background:var(--cr666-input-bg);color:var(--cr666-text);font-size:13px;outline:none;margin-bottom:10px}',
      s + '.cr666-modal-box input:focus{border-color:var(--cr666-sub)}',
      s + '.cr666-modal-box .cr666-modal-btn{width:100%;padding:10px;border:none;border-radius:8px;background:var(--cr666-btn-bg);color:var(--cr666-text);font-size:13px;font-weight:600;cursor:pointer}',
      s + '.cr666-modal-box .cr666-modal-btn:hover{opacity:.85}',
      s + '.cr666-error-toast{position:absolute;top:16px;left:50%;transform:translateX(-50%);background:#ef4444;color:#fff;padding:8px 16px;border-radius:8px;font-size:12px;z-index:300;display:none}'
    ].join('\n');
  }

  // ---- Image preview ----
  function showImagePreview(src) {
    var overlay = document.createElement('div');
    overlay.id = 'cr666-img-preview-overlay';
    overlay.style.cssText = 'position:fixed;top:0;left:0;right:0;bottom:0;background:rgba(0,0,0,.85);z-index:2147483648;display:flex;align-items:center;justify-content:center;cursor:pointer;backdrop-filter:blur(8px);-webkit-backdrop-filter:blur(8px);';
    
    var img = document.createElement('img');
    img.src = src;
    img.style.cssText = 'max-width:70vw;max-height:70vh;border-radius:12px;box-shadow:0 20px 60px rgba(0,0,0,.5);object-fit:contain;';
    
    var closeBtn = document.createElement('div');
    closeBtn.textContent = '×';
    closeBtn.style.cssText = 'position:absolute;top:20px;right:24px;width:36px;height:36px;background:rgba(255,255,255,.15);color:#fff;border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:24px;cursor:pointer;transition:all .2s;backdrop-filter:blur(10px);-webkit-backdrop-filter:blur(10px);';
    closeBtn.onmouseenter = function() { closeBtn.style.background = 'rgba(239,68,68,.8)'; closeBtn.style.transform = 'scale(1.1)'; };
    closeBtn.onmouseleave = function() { closeBtn.style.background = 'rgba(255,255,255,.15)'; closeBtn.style.transform = 'scale(1)'; };
    
    overlay.appendChild(img);
    overlay.appendChild(closeBtn);
    document.body.appendChild(overlay);
    
    function closePreview() {
      overlay.remove();
      document.removeEventListener('keydown', escHandler);
    }
    
    function escHandler(e) {
      if (e.key === 'Escape') closePreview();
    }
    
    overlay.onclick = function(e) {
      if (e.target === overlay || e.target === img) closePreview();
    };
    closeBtn.onclick = function(e) {
      e.stopPropagation();
      closePreview();
    };
    document.addEventListener('keydown', escHandler);
  }

  // ---- Message rendering ----
  function appendMessage(msg) {
    var m = $('cr666-messages');
    if (!m) return;
    while (m.children.length > 100) { m.removeChild(m.firstChild); }
    var isSelf = msg.name === myName;
    var row = document.createElement('div');
    row.className = 'cr666-msg-row ' + (isSelf ? 'self' : 'other');
    row.setAttribute('data-msg-id', msg.id);
    var body = document.createElement('div'); body.className = 'cr666-msg-body';
    var line = document.createElement('div'); line.className = 'cr666-msg-line';
    var nm = document.createElement('span'); nm.className = 'cr666-msg-name'; nm.textContent = isSelf ? 'You' : msg.name;
    if (isSelf) { nm.style.cursor = 'pointer'; nm.title = 'Click to rename'; nm.onclick = function() { showRenameModal(); }; }
    line.appendChild(nm);
    var bub = document.createElement('div'); bub.className = 'cr666-msg-bubble';
if (msg.img) { bub.style.background = 'transparent'; bub.style.boxShadow = 'none'; var isWechatEmoji = msg.img.indexOf('/emojis/') === 0; var img = document.createElement('img');
      img.src = msg.img; 
      img.style.cssText = 'max-width:' + (isWechatEmoji ? '20px' : '180px') + ';max-height:' + (isWechatEmoji ? '20px' : '180px') + ';border-radius:12px;cursor:pointer;transition:transform .2s,box-shadow .2s;';
      img.onmouseenter = function() { img.style.transform = 'scale(1.03)'; img.style.boxShadow = '0 4px 16px rgba(0,0,0,.25)'; };
      img.onmouseleave = function() { img.style.transform = 'scale(1)'; img.style.boxShadow = 'none'; };
      img.onclick = function() { showImagePreview(msg.img); };
      bub.appendChild(img); 
    }
    else {
      if (isSingleEmoji(msg.text)) {
        // A message that is just one emoji: render it as a large Twemoji color image.
        bub.style.background = 'transparent';
        bub.appendChild(twemojiImg(msg.text, 16));
      } else { bub.textContent = msg.text; }
    }
    body.appendChild(line);
    body.appendChild(bub);
    var tm = document.createElement('div'); tm.className = 'cr666-msg-time'; tm.textContent = fmtTime(msg.time); body.appendChild(tm);
    row.appendChild(body); m.appendChild(row); m.scrollTop = m.scrollHeight;
  }

  function updateStatusDots() {
    var bar = $('cr666-user-bar');
    if (!bar) return;
    var now = Date.now();
    var names = Object.keys(userStates);
    var html = '';
    for (var i = 0; i < names.length; i++) {
      var n = names[i];
      if (n === myName) continue;
      var st = userStates[n];
      var v = st.visible === true;
      if (!v && st.leftAt && (now - st.leftAt > 600000)) continue;
      html += '<span class="cr666-user-item ' + (v ? 'online' : 'offline') + '">' + escapeHtml(n) + '</span>';
    }
    bar.innerHTML = html;
  }

  function escapeHtml(s) {
    return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  }

  setInterval(function() {
    if (widgetEl && widgetEl.style.display !== 'none') updateStatusDots();
  }, 60000);

  function appendSystem(text, msgId) {
    var m = $('cr666-messages');
    if (!m) return;
    var div = document.createElement('div'); div.className = 'cr666-msg system'; div.textContent = text;
    if (msgId) div.setAttribute('data-msg-id', msgId);
    m.appendChild(div); m.scrollTop = m.scrollHeight;
  }

  function renderAllMessages() {
    var m = $('cr666-messages');
    if (!m) return;
    m.innerHTML = ''; renderedCount = 0;
    messageHistory.forEach(function(msg) {
      if (msg.name === 'System') appendSystem(msg.text, msg.id); else appendMessage(msg);
      renderedCount++;
    });
    setTimeout(function() { m.scrollTop = m.scrollHeight; }, 50);
  }

  function renderNewMessages() {
    if (messageHistory.length <= renderedCount) return;
    for (var i = renderedCount; i < messageHistory.length; i++) {
      var msg = messageHistory[i];
      if (msg.name === 'System') appendSystem(msg.text, msg.id); else appendMessage(msg);
    }
    renderedCount = messageHistory.length;
  }

  // ---- Send ----
  function sendMessage() {
    var input = $('cr666-msg-input');
    var text = input.value.trim();
    var img = pendingImg;
    if (!text && !img) return;
    chrome.runtime.sendMessage({ action: 'sendChat', text: text, img: img || null }, function(resp) {
      if (resp && resp.ok) { input.value = ''; pendingImg = ''; var pv = $('cr666-img-preview'); pv.style.display = 'none'; pv.innerHTML = ''; }
      else { showToast('Failed to send - not connected'); }
    });
  }

  // ---- Recent emojis (persisted, max 10, most-recent first) ----
  function getRecentEmojis(cb) {
    chrome.storage.local.get('xchat_recent_emojis', function(res) {
      cb(res.xchat_recent_emojis || []);
    });
  }

  function pushRecentEmoji(emoji) {
    getRecentEmojis(function(list) {
      // Remove existing occurrence so re-use bumps it to the front.
      list = list.filter(function(e) { return e !== emoji; });
      list.unshift(emoji);
      if (list.length > 10) list = list.slice(0, 10);
      chrome.storage.local.set({ xchat_recent_emojis: list });
    });
  }

  // Render the "Recent" strip at the top of the emoji panel.
  function renderRecentEmojis() {
    var wrap = $('cr666-emoji-recent');
    var grid = $('cr666-emoji-recent-grid');
    if (!wrap || !grid) return;
    // Recent strip only shows on the WeChat (basic) tab, not the custom tab.
    if (currentEmojiTab !== 'basic') { wrap.style.display = 'none'; return; }
    getRecentEmojis(function(list) {
      grid.innerHTML = '';
      if (!list.length) { wrap.style.display = 'none'; return; }
      wrap.style.display = 'block';
      list.forEach(function(name) {
        var d = document.createElement('div'); d.className = 'cr666-emoji-item';
        var wechat = findWechatEmoji(name);
        var img = document.createElement('img');
        if (wechat) {
          img.src = wechatEmojiUrl(wechat);
        } else if (name.indexOf('data:image') === 0) {
          img.src = name;
        } else {
          img = twemojiImg(name, 28);
        }
        img.alt = name;
        img.style.cssText = 'width:26px;height:26px;object-fit:contain;display:inline-block;';
        d.appendChild(img);
        d.title = name;
        d.onclick = function() { sendEmoji(name); };
        grid.appendChild(d);
      });
    });
  }

  function sendEmoji(emoji) {
    var isImg = emoji.indexOf('data:image') === 0;
    var isWechat = !isImg && WECHAT_EMOJIS.some(function(e) { return e.name === emoji; });
    var img = isImg ? emoji : (isWechat ? wechatEmojiUrl(WECHAT_EMOJIS.find(function(e) { return e.name === emoji; })) : null);
    chrome.runtime.sendMessage({ action: 'sendChat', text: img ? '' : emoji, img: img }, function(resp) {
      if (resp && resp.ok) {
        pushRecentEmoji(emoji);
        renderRecentEmojis();
        $('cr666-emoji-panel').style.display = 'none';
      }
      else { showToast('Failed to send'); }
    });
  }

  // ---- Image ----
  function showImgPreview(dataUrl) {
    pendingImg = dataUrl; var pv = $('cr666-img-preview'); pv.innerHTML = '';
    var img = document.createElement('img'); img.src = dataUrl;
    var rm = document.createElement('button'); rm.className = 'cr666-remove-img'; rm.textContent = 'x';
    rm.onclick = function() { pendingImg = ''; pv.style.display = 'none'; pv.innerHTML = ''; };
    pv.appendChild(img); pv.appendChild(rm); pv.style.display = 'block';
  }

  function handleFileSelect(input) {
    var file = input.files && input.files[0]; if (!file) return;
    if (file.size > 2000000) { showToast('Image too large (max 2MB)'); input.value = ''; return; }
    var reader = new FileReader(); reader.onload = function(ev) { showImgPreview(ev.target.result); }; reader.readAsDataURL(file); input.value = '';
  }

  // ---- Rename ----
  function showRenameModal() { $('cr666-rename-input').value = myName; $('cr666-rename-overlay').classList.add('show'); }
  function doRename() {
    var newName = $('cr666-rename-input').value.trim();
    if (!newName) { showToast('Name cannot be empty'); return; }
    var oldName = myName;
    chrome.runtime.sendMessage({ action: 'rename', name: newName }, function() {
      myName = newName;
      if (oldName && userStates[oldName]) {
        userStates[newName] = userStates[oldName];
        delete userStates[oldName];
      }
      var msgs = document.querySelectorAll('.cr666-msg-name');
      for (var i = 0; i < msgs.length; i++) {
        if (msgs[i].textContent === 'You') { msgs[i].title = 'Click to rename'; }
      }
      updateStatusDots();
      $('cr666-rename-overlay').classList.remove('show');
    });
  }

  // ---- Emoji panel ----
  function toggleEmojiPanel() {
    var p = $('cr666-emoji-panel');
    if (p.style.display === 'none' || p.style.display === '') { p.style.display = 'block'; renderRecentEmojis(); renderEmojiGrid(); }
    else { p.style.display = 'none'; }
  }

  function getCustomEmojis(cb) {
    chrome.storage.local.get('xchat_custom_emojis', function(result) {
      cb(result.xchat_custom_emojis || []);
    });
  }

  function saveCustomEmojis(list) {
    chrome.storage.local.set({ xchat_custom_emojis: list }, function() {
      if (chrome.runtime.lastError) showToast('Storage full');
    });
  }

  function handleEmojiUpload(input) {
    var file = input.files && input.files[0];
    if (!file) return;
    if (file.size > 500000) { showToast('Image too large (max 500KB)'); input.value = ''; return; }
    var reader = new FileReader();
    reader.onload = function(ev) {
      var dataUrl = ev.target.result;
      var img = new Image();
      img.onload = function() {
        var canvas = document.createElement('canvas');
        var size = 64;
        canvas.width = size; canvas.height = size;
        var ctx = canvas.getContext('2d');
        var scale = Math.min(size / img.width, size / img.height);
        var w = img.width * scale, h = img.height * scale;
        ctx.drawImage(img, (size - w) / 2, (size - h) / 2, w, h);
        var small = canvas.toDataURL('image/png');
        getCustomEmojis(function(list) {
          list.push(small);
          saveCustomEmojis(list);
          renderEmojiGrid();
          showToast('Emoji added');
        });
      };
      img.src = dataUrl;
    };
    reader.readAsDataURL(file);
    input.value = '';
  }

  function deleteCustomEmoji(index) {
    getCustomEmojis(function(list) {
      list.splice(index, 1);
      saveCustomEmojis(list);
      renderEmojiGrid();
    });
  }

  function switchEmojiTab(tab) {
    currentEmojiTab = tab;
    var basicTab = $('cr666-tab-basic');
    var customTab = $('cr666-tab-custom');
    if (tab === 'basic') {
      basicTab.style.color = 'var(--cr666-text,#fff)'; basicTab.style.background = 'var(--cr666-btn-bg,#333)';
      customTab.style.color = 'var(--cr666-sub,#888)'; customTab.style.background = 'transparent';
    } else {
      customTab.style.color = 'var(--cr666-text,#fff)'; customTab.style.background = 'var(--cr666-btn-bg,#333)';
      basicTab.style.color = 'var(--cr666-sub,#888)'; basicTab.style.background = 'transparent';
    }
    renderRecentEmojis();
    renderEmojiGrid();
  }

  // True if the text is a single emoji (one or two code points, e.g. a ZWJ sequence).
  function isSingleEmoji(text) {
    if (!text) return false;
    var trimmed = text.trim();
    if (!trimmed) return false;
    var codePoints = Array.from(trimmed);
    if (codePoints.length > 2) return false;
    // Every code point must be in an emoji range (approximate common ranges).
    return codePoints.every(function(c) {
      var cp = c.codePointAt(0);
      return (cp >= 0x1F000 && cp <= 0x1FAFF) ||
             (cp >= 0x2600 && cp <= 0x27BF) ||
             (cp >= 0x2B00 && cp <= 0x2BFF) ||
             (cp >= 0x1F1E6 && cp <= 0x1F1FF) ||
             cp === 0x200D || cp === 0xFE0F || cp === 0x20E3;
    });
  }

  // Convert an emoji character to a Twemoji (color) image element. Twemoji gives a
  // unified, cute color style closer to WeChat's look than the OS default emoji.
  function twemojiImg(emoji, size) {
    var img = document.createElement('img');
    var codes = Array.from(emoji).map(function(c) {
      return c.codePointAt(0).toString(16);
    }).join('-');
    img.src = 'https://cdn.jsdelivr.net/gh/twitter/twemoji@14.0.2/assets/72x72/' + codes + '.png';
    img.style.cssText = 'width:' + size + 'px;height:' + size + 'px;object-fit:contain;display:inline-block;vertical-align:middle;';
    img.alt = emoji;
    img.onerror = function() {
      var span = document.createElement('span');
      span.textContent = emoji;
      span.style.cssText = 'font-size:' + size + 'px;vertical-align:middle;';
      img.parentNode.replaceChild(span, img);
    };
    return img;
  }

  // Resolve a WeChat emoji's local image to an extension URL the page can load.
  function wechatEmojiUrl(emoji) {
    return chrome.runtime.getURL(emoji.path);
  }

  // Find a WeChat emoji by its name (the name is what gets sent as the message text).
  function findWechatEmoji(name) {
    var list = (typeof WECHAT_EMOJIS !== 'undefined') ? WECHAT_EMOJIS : [];
    for (var i = 0; i < list.length; i++) {
      if (list[i].name === name) return list[i];
    }
    return null;
  }

  function renderEmojiGrid() {
    var grid = $('cr666-emoji-grid');
    if (!grid) return;
    grid.innerHTML = '';
    if (currentEmojiTab === 'basic') {
      var wechatList = (typeof WECHAT_EMOJIS !== 'undefined') ? WECHAT_EMOJIS : [];
      wechatList.forEach(function(e) {
        var d = document.createElement('div'); d.className = 'cr666-emoji-item';
        var img = document.createElement('img');
        img.src = wechatEmojiUrl(e);
        img.alt = e.name;
        img.style.cssText = 'width:26px;height:26px;object-fit:contain;display:inline-block;';
        d.appendChild(img);
        d.title = e.name;
        d.onclick = function() { sendEmoji(e.name); };
        grid.appendChild(d);
      });
    } else {
      getCustomEmojis(function(customs) {
        grid.innerHTML = '';
        if (!customs.length) {
          grid.innerHTML = '<div style="grid-column:1/-1;text-align:center;color:#666;font-size:12px;padding:16px 0">No custom emojis. Click + to upload.</div>';
        } else {
          customs.forEach(function(src, i) {
            var d = document.createElement('div'); d.className = 'cr666-emoji-item'; d.style.position = 'relative';
            var img = document.createElement('img'); img.src = src; img.style.cssText = 'width:32px;height:32px;object-fit:contain;border-radius:4px;';
            d.appendChild(img);
            d.onclick = function() { sendEmoji(src); };
            var del = document.createElement('span');
            del.style.cssText = 'position:absolute;top:0;right:0;font-size:10px;color:#ef4444;cursor:pointer;display:none';
            del.textContent = 'x';
            d.onmouseenter = function() { del.style.display = 'block'; };
            d.onmouseleave = function() { del.style.display = 'none'; };
            del.onclick = function(ev) { ev.stopPropagation(); deleteCustomEmoji(i); };
            d.appendChild(del);
            grid.appendChild(d);
          });
        }
      });
    }
  }

  // ---- Pull latest state (used when widget is first created) ----
  function refreshState() {
    chrome.runtime.sendMessage({ action: 'getStatus' }, function(resp) {
      if (!resp) return;
      myName = resp.myName || myName;
      messageHistory = resp.messageHistory || [];
      renderedCount = messageHistory.length;
      renderAllMessages();
    });
  }

  // ---- Real-time port ----
  function connectPort() {
    port = chrome.runtime.connect({ name: 'chatroom666' });
    port.onMessage.addListener(function(data) {
      if (data.type === 'state') {
        myName = data.myName || myName;
        var incoming = data.messageHistory || [];
        // state is only a bootstrap snapshot: use it to seed local history when we
        // have nothing yet. Real-time 'message' events handle incremental appends,
        // so we must NOT re-render here or we will duplicate messages.
        if (messageHistory.length === 0 && incoming.length > 0) {
          messageHistory = incoming;
          renderedCount = messageHistory.length;
          renderAllMessages();
        }
      } else if (data.type === 'status') {
        var prevLeftAt = (userStates[data.name] && userStates[data.name].leftAt) || 0;
        userStates[data.name] = { device: data.device, visible: data.visible, leftAt: data.visible ? 0 : (prevLeftAt || Date.now()) };
        updateStatusDots();
      } else if (data.type === 'left') {
        if (userStates[data.name]) {
          userStates[data.name].visible = false;
          if (!userStates[data.name].leftAt) userStates[data.name].leftAt = Date.now();
        }
        updateStatusDots();
      } else if (data.type === 'message') {
        var msgId = data.message.id;
        var alreadyExists = false;
        for (var i = messageHistory.length - 1; i >= 0; i--) {
          if (messageHistory[i].id === msgId) { alreadyExists = true; break; }
        }
        // Also check if already rendered in DOM
        if (!alreadyExists && widgetEl) {
          var renderedIds = widgetEl.querySelectorAll('[data-msg-id]');
          for (var j = 0; j < renderedIds.length; j++) {
            if (renderedIds[j].getAttribute('data-msg-id') === msgId) { alreadyExists = true; break; }
          }
        }
          if (!alreadyExists) {
            messageHistory.push(data.message);
            if (messageHistory.length > 200) messageHistory = messageHistory.slice(-200);
            if (data.message.name === 'System') appendSystem(data.message.text, data.message.id);
            else appendMessage(data.message);
            renderedCount = messageHistory.length;
            // Mark unread only for real chat messages (not System join/leave notices)
            // when the widget is not open (never created, or hidden) and the message
            // is not from self.
            var widgetHidden = !widgetEl || widgetEl.style.display === 'none';
            var isLeaveMsg = data.message.name === 'System' && data.message.text.indexOf('离开了房间') !== -1;
            if (widgetHidden && data.message.name !== myName && !isLeaveMsg) {
              markUnread(data.message);
            }
          }
      }
    });
    port.onDisconnect.addListener(function() {
      port = null;
      setTimeout(connectPort, 1000);
    });
  }

  // ---- Wire up events ----
  function bindEvents() {
    $('cr666-send-btn').addEventListener('click', sendMessage);
    $('cr666-msg-input').addEventListener('keydown', function(e) { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage(); } });
    // Clicking the input closes the emoji panel if it was left open without a pick.
    $('cr666-msg-input').addEventListener('click', function() {
      var p = $('cr666-emoji-panel');
      if (p && p.style.display !== 'none') p.style.display = 'none';
    });
    $('cr666-p-btn').addEventListener('click', function() { $('cr666-img-file-input').click(); });
    $('cr666-img-file-input').addEventListener('change', function() { handleFileSelect(this); });
    $('cr666-emoji-toggle').addEventListener('click', toggleEmojiPanel);
    // Clicking anywhere outside the emoji panel (and its toggle button) closes it.
    document.addEventListener('click', function(e) {
      var p = $('cr666-emoji-panel');
      if (!p || p.style.display === 'none') return;
      if (p.contains(e.target)) return;
      var toggle = $('cr666-emoji-toggle');
      if (toggle && toggle.contains(e.target)) return;
      p.style.display = 'none';
    });
    $('cr666-tab-basic').addEventListener('click', function() { switchEmojiTab('basic'); });
    $('cr666-tab-custom').addEventListener('click', function() { switchEmojiTab('custom'); });
    $('cr666-emoji-add').addEventListener('click', function() { $('cr666-emoji-file-input').click(); });
    $('cr666-emoji-file-input').addEventListener('change', function() { handleEmojiUpload(this); });
    $('cr666-rename-save').addEventListener('click', doRename);
    $('cr666-rename-close').addEventListener('click', function() { $('cr666-rename-overlay').classList.remove('show'); });
    $('cr666-rename-overlay').addEventListener('click', function(e) { if (e.target === this) this.classList.remove('show'); });
    $('cr666-msg-input').addEventListener('paste', function(e) {
      var items = e.clipboardData && e.clipboardData.items; if (!items) return;
      for (var i = 0; i < items.length; i++) {
        if (items[i].type.indexOf('image') === 0) {
          e.preventDefault();
          var file = items[i].getAsFile();
          var reader = new FileReader();
          reader.onload = function(ev) { if (ev.target.result.length > 2000000) { showToast('Image too large (max 2MB)'); return; } showImgPreview(ev.target.result); };
          reader.readAsDataURL(file);
          return;
        }
      }
    });
  }

  // Read the host page background color and return an rgba string with given alpha
  function getHostBgRgb() {
    var rgb = [26, 26, 26]; // fallback dark
    try {
      var el = document.body || document.documentElement;
      var cs = getComputedStyle(el);
      var bg = cs.backgroundColor;
      if (!bg || bg === 'transparent' || bg.indexOf('rgba(0, 0, 0, 0)') === 0) {
        bg = getComputedStyle(document.documentElement).backgroundColor;
      }
      var m = bg && bg.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)/);
      if (m) { rgb = [parseInt(m[1], 10), parseInt(m[2], 10), parseInt(m[3], 10)]; }
    } catch (e) {}
    return rgb;
  }

  function getHostBgColor(alpha) {
    var rgb = getHostBgRgb();
    return 'rgba(' + rgb[0] + ',' + rgb[1] + ',' + rgb[2] + ',' + alpha + ')';
  }

  // Pick a text/border palette that contrasts with the host page background.
  // Returns a CSS variable declaration string to apply on the widget root.
  function getThemeVars() {
    var rgb = getHostBgRgb();
    // Perceived brightness (0-255)
    var brightness = (0.299 * rgb[0] + 0.587 * rgb[1] + 0.114 * rgb[2]);
    var dark = brightness < 140; // dark bg -> light text, light bg -> dark text
    var t = dark ? {
      text: '#e0e0e0', sub: '#9a9a9a', faint: '#6a6a6a',
      border: 'rgba(255,255,255,.12)', inputBg: 'rgba(20,20,20,.5)',
      btnBg: 'rgba(28,28,28,.6)', btnText: '#cfcfcf', accent: '#4ade80',
      overlayBg: 'rgba(0,0,0,.45)'
    } : {
      text: '#1a1a1a', sub: '#4a4a4a', faint: '#777777',
      border: 'rgba(0,0,0,.1)', inputBg: 'rgba(255,255,255,.5)',
      btnBg: 'rgba(245,245,245,.7)', btnText: '#333333', accent: '#16a34a',
      overlayBg: 'rgba(255,255,255,.45)'
    };
    return '--cr666-text:' + t.text + ';' +
      '--cr666-sub:' + t.sub + ';' +
      '--cr666-faint:' + t.faint + ';' +
      '--cr666-border:' + t.border + ';' +
      '--cr666-input-bg:' + t.inputBg + ';' +
      '--cr666-btn-bg:' + t.btnBg + ';' +
      '--cr666-btn-text:' + t.btnText + ';' +
      '--cr666-accent:' + t.accent + ';' +
      '--cr666-overlay-bg:' + t.overlayBg + ';';
  }

  function createWidget() {
    widgetEl = document.createElement('div');
    widgetEl.id = 'chatroom666-widget';
    widgetEl.style.cssText = 'position:fixed;bottom:72px;right:20px;width:380px;height:540px;border-radius:16px;z-index:2147483647;display:none;box-shadow:0 8px 32px rgba(0,0,0,.3);overflow:hidden;backdrop-filter:blur(18px) saturate(1.6);-webkit-backdrop-filter:blur(18px) saturate(1.6);';
    widgetEl.style.background = getHostBgColor(0.55);
    widgetEl.style.cssText += getThemeVars();

    var styleEl = document.createElement('style');
    styleEl.id = 'chatroom666-style';
    styleEl.textContent = buildPanelCSS();
    widgetEl.appendChild(styleEl);

    var wrap = document.createElement('div');
    wrap.style.cssText = 'display:flex;flex-direction:column;flex:1;overflow:hidden;height:100%;';
    wrap.innerHTML = buildPanelHTML();
    widgetEl.appendChild(wrap);

    // Click outside to close
    document.addEventListener('click', function(e) {
      if (!widgetEl || widgetEl.style.display === 'none') return;
      if (widgetEl.contains(e.target) || (toggleBtn && toggleBtn.contains(e.target))) return;
      hideWidget();
    });

    document.body.appendChild(widgetEl);
    bindEvents();
    refreshState();
  }

  function showWidget() {
    if (!widgetEl) createWidget();
    widgetEl.style.display = 'block';
    positionWidget();
    clearUnread();
    refreshState();
    updateStatusDots();
    chrome.runtime.sendMessage({ action: 'setStatus', visible: true }, function() {});
  }

  function hideWidget() {
    if (widgetEl) widgetEl.style.display = 'none';
    if (toggleBtn) { toggleBtn.style.transform = 'scale(1)'; toggleBtn.style.background = 'transparent'; }
    // Close all sub-panels/modals so reopening the chat starts clean.
    var emojiPanel = $('cr666-emoji-panel'); if (emojiPanel) emojiPanel.style.display = 'none';
    var imgPreview = $('cr666-img-preview'); if (imgPreview) { imgPreview.style.display = 'none'; imgPreview.innerHTML = ''; }
    var renameOverlay = $('cr666-rename-overlay'); if (renameOverlay) renameOverlay.classList.remove('show');
    chrome.runtime.sendMessage({ action: 'setStatus', visible: false }, function() {});
  }

  // Shared "last read" timestamp across all tabs. When any tab views messages it
  // bumps this value; other tabs compare incoming message time against it to decide
  // whether to show the unread indicator, so reading in tab A also clears tab B.
  function markUnread(msg) {
    if (!toggleBtn) return;
    // Ask the background (which can access shared storage) whether this message id
    // was already read in another tab. chrome.storage.session is not accessible
    // from the content-script page context, so we go through the background.
    chrome.runtime.sendMessage({ action: 'isRead', id: msg.id }, function(resp) {
      if (resp && resp.read) return;
      hasUnread = true;
      toggleBtn.style.background = '#ef4444';
      toggleBtn.style.color = '#fff';
      toggleBtn.style.animation = 'cr666-blink 1s ease-in-out infinite';
      if (!document.getElementById('cr666-blink-style')) {
        var st = document.createElement('style');
        st.id = 'cr666-blink-style';
        st.textContent = '@keyframes cr666-blink{0%,100%{opacity:1}50%{opacity:.3}}';
        document.head.appendChild(st);
      }
      // Re-check a few times: another tab may mark this message as read after our
      // first check (message/read-update race across tabs). Clear once it's read.
      [400, 1000, 2000].forEach(function(delay) {
        setTimeout(function() {
          chrome.runtime.sendMessage({ action: 'isRead', id: msg.id }, function(r2) {
            if (r2 && r2.read && hasUnread) clearUnreadLocal();
          });
        }, delay);
      });
    });
  }

  function clearUnread() {
    hasUnread = false;
    if (toggleBtn) {
      toggleBtn.style.background = 'transparent';
      toggleBtn.style.color = '#000';
      toggleBtn.style.animation = 'none';
    }
    // Tell the background to mark all current messages as read (by id). The
    // background broadcasts the update to every tab so they clear their indicator.
    var ids = [];
    for (var i = 0; i < messageHistory.length; i++) {
      if (messageHistory[i].id) ids.push(messageHistory[i].id);
    }
    if (ids.length) chrome.runtime.sendMessage({ action: 'markRead', ids: ids }, function() {});
  }

  // When the background broadcasts a read update, clear our indicator if we have
  // no unread message left outside the read set.
  chrome.runtime.onMessage.addListener(function(message, sender, sendResponse) {
    if (message && message.action === 'readUpdate') {
      var lastReadTime = message.lastReadTime || 0;
      var hasUnreadMsg = false;
      for (var i = 0; i < messageHistory.length; i++) {
        var m = messageHistory[i];
        if (m.name === 'System' || m.name === myName) continue;
        if (m.time && m.time > lastReadTime) { hasUnreadMsg = true; break; }
      }
      if (!hasUnreadMsg && hasUnread) clearUnreadLocal();
    }
    return true;
  });

  function clearUnreadLocal() {
    hasUnread = false;
    if (toggleBtn) {
      toggleBtn.style.background = 'transparent';
      toggleBtn.style.color = '#000';
      toggleBtn.style.animation = 'none';
    }
  }

  // Show the toggle button on the page (does not auto-open the chat widget).
  function showToggle() {
    if (!toggleBtn) return;
    toggleBtn.style.display = 'flex';
  }

  // Hide the toggle button permanently (until the popup opens it again).
  function hideToggle() {
    if (widgetEl) widgetEl.style.display = 'none';
    if (toggleBtn) toggleBtn.style.display = 'none';
  }

  // Listen for the popup's open/close command to show or hide the toggle button.
  chrome.runtime.onMessage.addListener(function(message, sender, sendResponse) {
    if (message && message.action === 'setToggleVisible') {
      chrome.storage.local.set({ xchat_toggle_visible: !!message.visible });
      if (message.visible) showToggle();
      else hideToggle();
      sendResponse({ ok: true });
    }
    return true;
  });

  function init() {
    if (document.getElementById('chatroom666-toggle')) return;
    createToggleButton();
    connectPort();
    chrome.runtime.sendMessage({ action: 'contentJoin' }, function() {});

    // Restore persisted visibility: hidden stays hidden until the popup opens it.
    chrome.storage.local.get('xchat_toggle_visible', function(res) {
      if (res.xchat_toggle_visible === false) hideToggle();
    });

    // Keep toggle button in viewport on resize/zoom
    window.addEventListener('resize', function() {
      if (!toggleBtn) return;
      var rect = toggleBtn.getBoundingClientRect();
      var size = 44;
      var left = Math.max(8, Math.min(rect.left, window.innerWidth - size - 8));
      var top = Math.max(8, Math.min(rect.top, window.innerHeight - size - 8));
      toggleBtn.style.left = left + 'px';
      toggleBtn.style.top = top + 'px';
      toggleBtn.style.right = 'auto';
      toggleBtn.style.bottom = 'auto';
      if (widgetEl && widgetEl.style.display !== 'none') positionWidget();
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();





























