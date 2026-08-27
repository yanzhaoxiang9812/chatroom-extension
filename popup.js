// Xchat popup - simple open/close toggle for the page chat button.
function updateUI(visible) {
  var btn = document.getElementById('toggle-btn');
  var dot = document.getElementById('status-dot');
  var text = document.getElementById('status-text');
  if (visible) {
    btn.textContent = 'Close';
    btn.className = 'toggle-btn close';
    dot.className = 'dot on';
    text.textContent = 'Visible';
  } else {
    btn.textContent = 'Open';
    btn.className = 'toggle-btn open';
    dot.className = 'dot';
    text.textContent = 'Hidden';
  }
}

function sendToggle(visible) {
  // Send to all tabs so the active page shows/hides the chat button.
  chrome.tabs.query({}, function(tabs) {
    (tabs || []).forEach(function(tab) {
      chrome.tabs.sendMessage(tab.id, { action: 'setToggleVisible', visible: visible }, function() {
        // Ignore "no receiver" errors for tabs without the content script.
      });
    });
  });
  chrome.storage.local.set({ xchat_toggle_visible: visible });
  updateUI(visible);
}

document.addEventListener('DOMContentLoaded', function() {
  chrome.storage.local.get('xchat_toggle_visible', function(res) {
    updateUI(res.xchat_toggle_visible !== false);
  });
  document.getElementById('toggle-btn').addEventListener('click', function() {
    var btn = this;
    var currentlyVisible = btn.textContent === 'Close';
    sendToggle(!currentlyVisible);
  });
});
