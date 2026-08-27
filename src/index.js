const HTML_PAGE = `<!DOCTYPE html>
<html lang="zh-CN">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width,initial-scale=1.0">
<title></title>
<style>
*{margin:0;padding:0;box-sizing:border-box}
body{font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,sans-serif;background:#111;color:#e0e0e0;height:100vh;display:flex;align-items:stretch;justify-content:center}
.card{background:#141414;width:100%;height:100vh;display:flex;flex-direction:column;overflow:hidden}
#login-page{flex:1;display:flex;flex-direction:column;align-items:center;justify-content:center;padding:30px;overflow-y:auto}
.login-card{width:100%;max-width:320px;margin:0 auto;text-align:center}
.login-card h1{font-size:28px;margin-bottom:30px;background:linear-gradient(135deg,#888,#666);-webkit-background-clip:text;-webkit-text-fill-color:transparent}
.login-card input{width:100%;padding:14px 16px;margin-bottom:14px;border:1px solid #444;border-radius:8px;background:#1c1c1c;color:#fff;font-size:16px;outline:none;transition:border-color .2s;text-align:center}
.login-card input:focus{border-color:#888}
.login-card .go-btn{width:100%;padding:14px;border:none;border-radius:8px;background:#555;color:#fff;font-size:16px;font-weight:600;cursor:pointer;transition:opacity .2s}
.login-card .go-btn:hover{opacity:.85}
.login-card .go-btn:disabled{opacity:.5;cursor:not-allowed}
#chat-page{display:none;flex:1;flex-direction:column;height:100%}
.chat-header{background:#1c1c1c;border-bottom:1px solid #2e2e2e;padding:14px 18px;display:flex;align-items:center;justify-content:center;position:relative}
.chat-header .room-info{display:flex;align-items:center;gap:10px}
.chat-header .room-id{font-size:16px;font-weight:700;color:#888}
.chat-header .online{font-size:12px;color:#888;cursor:pointer;text-decoration:underline dotted;transition:color .2s}
.chat-header .online:hover{color:#ccc}
.chat-header .online span{color:#4ade80}
.unread-badge{position:absolute;top:8px;left:50%;transform:translateX(-50%);background:#ef4444;color:#fff;font-size:11px;padding:2px 8px;border-radius:10px;font-weight:600}
.chat-header .home-btn{position:absolute;left:18px;padding:4px 12px;border:1px solid #444;border-radius:6px;background:transparent;color:#aaa;cursor:pointer;font-size:11px;transition:all .2s}
.chat-header .home-btn:hover{border-color:#888;color:#ccc}
.chat-header .actions{position:absolute;right:18px;display:flex;flex-direction:column;gap:6px}
.chat-header .actions button{padding:4px 12px;border:1px solid #444;border-radius:6px;background:transparent;color:#aaa;cursor:pointer;font-size:11px;transition:all .2s}
.chat-header .actions .rename-btn:hover{border-color:#888;color:#ccc}
.messages{flex:1;overflow-y:auto;padding:16px;display:flex;flex-direction:column;gap:14px}
.msg-row{display:flex;align-items:flex-start;gap:8px;max-width:85%;animation:fadeIn .15s ease}
@keyframes fadeIn{from{opacity:0;transform:translateY(4px)}to{opacity:1;transform:none}}
.msg-row.self{align-self:flex-end;flex-direction:row-reverse}
.msg-row.other{align-self:flex-start}
.avatar{width:34px;height:34px;border-radius:50%;flex-shrink:0;display:flex;align-items:center;justify-content:center;font-size:14px;font-weight:700;color:#fff;background:transparent;border:1px solid #444}
.msg-body{display:flex;flex-direction:column;gap:2px}
.msg-row.self .msg-body{align-items:flex-end}
.msg-row.other .msg-body{align-items:flex-start}
.msg-line{display:flex;align-items:center;gap:8px}
.msg-row.self .msg-line{flex-direction:row-reverse}
.msg-name{font-size:12px;font-weight:600;color:#888;white-space:nowrap}
.msg-dot{width:8px;height:8px;border-radius:50%;display:inline-block}
.msg-dot.green{background:#4ade80}
.msg-dot.red{background:#ef4444}
.msg-bubble{padding:9px 13px;border-radius:12px;font-size:14px;line-height:1.5;word-break:break-word;cursor:default}
.msg-row.self .msg-bubble{background:#3a3a3a;color:#fff;border-top-right-radius:4px}
.msg-row.other .msg-bubble{background:#2e2e2e;color:#e0e0e0;border-top-left-radius:4px}
.msg-time{font-size:10px;color:#555;opacity:0;transition:opacity .15s;height:12px}
.msg-row:hover .msg-time{opacity:1}
.msg.system{align-self:center;background:transparent;color:#666;font-size:12px;padding:2px}
.emoji-panel{background:#1c1c1c;border-top:1px solid #2e2e2e;padding:10px 14px;max-height:200px;overflow-y:auto}
.emoji-tabs{display:flex;gap:10px;margin-bottom:10px;align-items:center}
.emoji-tab{font-size:12px;color:#888;cursor:pointer;padding:4px 8px;border-radius:4px}
.emoji-tab.active{color:#fff;background:#333}
.emoji-add{margin-left:auto;font-size:18px;color:#888;cursor:pointer;padding:2px 8px}
.emoji-add:hover{color:#fff}
.emoji-grid{display:grid;grid-template-columns:repeat(10,1fr);gap:2px}
.emoji-item{font-size:20px;cursor:pointer;padding:2px;text-align:center;border-radius:4px;transition:background .15s}
.emoji-item:hover{background:#333}
.emoji-item img{width:32px;height:32px;object-fit:contain;border-radius:4px}
.img-preview{background:#1c1c1c;padding:10px 14px;border-top:1px solid #2e2e2e;position:relative}
.img-preview img{max-height:120px;border-radius:8px;display:block}
.img-preview .remove-img{position:absolute;top:6px;right:10px;background:rgba(0,0,0,.6);color:#fff;border:none;width:22px;height:22px;border-radius:50%;cursor:pointer;font-size:14px;line-height:1}
.img-viewer{position:fixed;top:0;left:0;right:0;bottom:0;background:rgba(0,0,0,.85);z-index:400;display:none;align-items:center;justify-content:center}
.img-viewer.show{display:flex}
.img-viewer img{width:70vw;height:70vh;object-fit:contain;border-radius:8px}
.img-viewer .close-viewer{position:absolute;top:20px;right:30px;color:#fff;font-size:36px;cursor:pointer;line-height:1;background:none;border:none}
.img-viewer .close-viewer:hover{color:#ef4444}
.input-area{background:#1c1c1c;border-top:1px solid #2e2e2e;padding:12px 14px;display:flex;gap:10px}
.input-area input{flex:1;padding:11px 14px;border:1px solid #444;border-radius:8px;background:#141414;color:#fff;font-size:14px;outline:none;transition:border-color .2s}
.input-area input:focus{border-color:#888}
.input-area .plus-btn{padding:11px 16px;border:1px solid #444;border-radius:8px;background:#1c1c1c;color:#aaa;font-size:20px;font-weight:600;cursor:pointer;transition:all .2s;line-height:1}
.input-area .plus-btn:hover{border-color:#888;color:#fff}
.input-area button{padding:11px 20px;border:none;border-radius:8px;background:#555;color:#fff;font-size:14px;font-weight:600;cursor:pointer;transition:opacity .2s}
.input-area button:hover{opacity:.85}
.overlay{position:fixed;top:0;left:0;right:0;bottom:0;background:rgba(0,0,0,.6);z-index:200;display:none;align-items:center;justify-content:center}
.overlay.show{display:flex}
.modal-box{background:#1c1c1c;border:1px solid #2e2e2e;border-radius:12px;padding:20px;width:90%;max-width:320px;max-height:70vh;display:flex;flex-direction:column;box-shadow:0 10px 40px rgba(0,0,0,.6)}
.modal-box h3{font-size:15px;margin-bottom:14px;color:#888;display:flex;justify-content:space-between;align-items:center}
.modal-box .close{cursor:pointer;color:#888;font-size:18px;line-height:1}
.modal-box .close:hover{color:#ef4444}
.modal-box input{width:100%;padding:11px 14px;border:1px solid #444;border-radius:8px;background:#141414;color:#fff;font-size:14px;outline:none;margin-bottom:12px}
.modal-box input:focus{border-color:#888}
.modal-box .modal-btn{width:100%;padding:11px;border:none;border-radius:8px;background:#555;color:#fff;font-size:14px;font-weight:600;cursor:pointer}
.modal-box .modal-btn:hover{opacity:.85}
.userlist-items{overflow-y:auto;display:flex;flex-direction:column;gap:8px}
.userlist-item{display:flex;align-items:center;gap:10px;padding:6px 8px;border-radius:8px;background:#141414}
.userlist-item .avatar{width:30px;height:30px;font-size:13px}
.userlist-item .uname{font-size:14px;color:#e0e0e0}
.error-toast{position:fixed;top:20px;left:50%;transform:translateX(-50%);background:#ef4444;color:#fff;padding:10px 20px;border-radius:8px;font-size:14px;z-index:300;display:none}
</style>
</head>
<body>
<div class="card">
<div id="login-page">
<div class="login-card">
<input type="text" id="room-input" placeholder="输入房间号" maxlength="20" inputmode="numeric" pattern="[0-9]*">
<button class="go-btn" id="join-btn" onclick="joinFromInput()">加入</button>
</div>
</div>
<div id="chat-page">
<div class="chat-header">
<button class="home-btn" onclick="goHome()">← 主页</button>
<div class="room-info">
<span class="room-id" id="header-room-id"></span>
<span class="online" id="online-btn" onclick="showOnlineUsers()">在线 <span id="online-count">0</span> 人</span>
<span class="unread-badge" id="unread-badge" style="display:none"></span>
</div>
<div class="actions">
<button class="rename-btn" onclick="showRenameModal()">修改昵称</button>
</div>
</div>
<div class="messages" id="messages"></div>
<div class="emoji-panel" id="emoji-panel" style="display:none">
<div class="emoji-tabs">
<span class="emoji-tab active" onclick="showEmojiTab('basic')">基础</span>
<span class="emoji-tab" onclick="showEmojiTab('custom')">自定义</span>
<span class="emoji-add" onclick="document.getElementById('emoji-file-input').click()">+</span>
</div>
<div class="emoji-grid" id="emoji-grid"></div>
</div>
<input type="file" id="emoji-file-input" accept="image/*" style="display:none" onchange="handleEmojiUpload(this)">
<div class="img-preview" id="img-preview" style="display:none"></div>
<div class="input-area">
<input type="text" id="msg-input" placeholder="输入消息或粘贴图片..." maxlength="2000">
<button class="plus-btn" id="emoji-btn" onclick="toggleEmojiPanel()">😊</button>
<button class="plus-btn" id="plus-btn" onclick="document.getElementById('img-file-input').click()">图片</button>
<input type="file" id="img-file-input" accept="image/*" style="display:none" onchange="handleFileSelect(this)">
<button id="send-btn" onclick="sendMessage()">发送</button>
</div>
</div>
</div>
<div class="overlay" id="userlist-overlay" onclick="if(event.target===this)closeOverlay('userlist-overlay')"><div class="modal-box"><h3>在线用户 <span class="close" onclick="closeOverlay('userlist-overlay')">&times;</span></h3><div class="userlist-items" id="userlist-items"></div></div></div>
<div class="overlay" id="rename-overlay" onclick="if(event.target===this)closeOverlay('rename-overlay')"><div class="modal-box"><h3>修改昵称 <span class="close" onclick="closeOverlay('rename-overlay')">&times;</span></h3><input type="text" id="rename-input" placeholder="新昵称" maxlength="20"><button class="modal-btn" onclick="doRename()">保存</button></div></div>

<div class="img-viewer" id="img-viewer" onclick="if(event.target===this)closeImgViewer()"><button class="close-viewer" onclick="closeImgViewer()">&times;</button><img id="img-viewer-img" src=""></div>
<div class="error-toast" id="error-toast"></div>
<script>
var ws=null,myName='',currentRoomId='',lastActivity=Date.now(),unreadCount=0,pendingImg='';
var userStates={};
var hiddenSince=0;
function avatarLetter(name){return name?name.charAt(0).toUpperCase():'?'}
function joinFromInput(){
var roomId=document.getElementById('room-input').value.trim();
if(!roomId){showToast('请输入房间号');return}
joinRoom(roomId)
}
document.getElementById('room-input').addEventListener('keydown',function(e){if(e.key==='Enter')joinFromInput()});
document.getElementById('room-input').addEventListener('input',function(e){e.target.value=e.target.value.replace(/[^0-9]/g,'')});
document.getElementById('msg-input').addEventListener('keydown',function(e){if(e.key==='Enter'&&!e.shiftKey){e.preventDefault();sendMessage()}});
function showImgPreview(dataUrl){
pendingImg=dataUrl;
var pv=document.getElementById('img-preview');
pv.innerHTML='';
var img=document.createElement('img');img.src=dataUrl;
var rm=document.createElement('button');rm.className='remove-img';rm.textContent='×';rm.onclick=function(){pendingImg='';pv.style.display='none';pv.innerHTML=''};
pv.appendChild(img);pv.appendChild(rm);pv.style.display='block';
}
function handleFileSelect(input){
var file=input.files&&input.files[0];
if(!file)return;
if(file.size>2000000){showToast('图片太大，请压缩后发送');input.value='';return}
var reader=new FileReader();
reader.onload=function(ev){showImgPreview(ev.target.result)};
reader.readAsDataURL(file);
input.value='';
}
document.getElementById('msg-input').addEventListener('paste',function(e){
var items=e.clipboardData&&e.clipboardData.items;
if(!items)return;
for(var i=0;i<items.length;i++){
if(items[i].type.indexOf('image')===0){
e.preventDefault();
var file=items[i].getAsFile();
var reader=new FileReader();
reader.onload=function(ev){
if(ev.target.result.length>2000000){showToast('图片太大，请压缩后发送');return}
showImgPreview(ev.target.result);
};
reader.readAsDataURL(file);
return;
}
}
});
function joinRoom(roomId){
roomId=String(roomId).trim();
if(!roomId){showToast('请输入房间号');return}
var savedName='';try{savedName=localStorage.getItem('xchat_name')||''}catch(e){}
myName=savedName||('用户'+Math.floor(Math.random()*9000+1000));
doJoin(roomId)
}
function doJoin(roomId){
currentRoomId=roomId;
var protocol=location.protocol==='https:'?'wss:':'ws:';
ws=new WebSocket(protocol+'//'+location.host+'/ws?room='+encodeURIComponent(roomId));
var joinBtn=document.getElementById('join-btn');
joinBtn.disabled=true;joinBtn.textContent='连接中...';
ws.onopen=function(){ws.send(JSON.stringify({type:'join',roomId:roomId,name:myName}))};
ws.onmessage=function(ev){handleMessage(JSON.parse(ev.data))};
ws.onclose=function(){joinBtn.disabled=false;joinBtn.textContent='加入';if(currentRoomId){setTimeout(function(){if(currentRoomId)doJoin(currentRoomId)},1000)}};
ws.onerror=function(){joinBtn.disabled=false;joinBtn.textContent='加入';showToast('连接失败，请重试')}
}
function handleMessage(d){
if(d.type==='joined'){
document.getElementById('login-page').style.display='none';
document.getElementById('chat-page').style.display='flex';
document.getElementById('header-room-id').textContent='房间: '+d.roomId;
document.getElementById('online-count').textContent=d.onlineCount;
var m=document.getElementById('messages');m.innerHTML='';
d.history.forEach(function(msg){appendMessage(msg)});
appendSystem('你加入了房间 #'+d.roomId);
document.getElementById('msg-input').focus();
sendStatus();
try{history.replaceState(null,'','/'+d.roomId)}catch(e){}
try{localStorage.setItem('xchat_lastroom',d.roomId)}catch(e){}
}else if(d.type==='chat'){appendMessage(d);if(document.hidden){unreadCount++;updateUnreadBadge()}}
else if(d.type==='system'){appendSystem(d.message)}
else if(d.type==='onlineCount'){document.getElementById('online-count').textContent=d.count}
else if(d.type==='userList'){renderUserList(d.names)}
else if(d.type==='status'){userStates[d.name]={device:d.device,visible:d.visible};updateStatusDisplay()}
else if(d.type==='left'){if(userStates[d.name])userStates[d.name].visible='left';updateStatusDisplay()}
else if(d.type==='error'){showToast(d.message)}
}
function appendMessage(msg){
var m=document.getElementById('messages');
var isSelf=msg.name===myName;
var row=document.createElement('div');
row.className='msg-row '+(isSelf?'self':'other');
var av=document.createElement('div');av.className='avatar';av.textContent=avatarLetter(msg.name);
row.appendChild(av);
var body=document.createElement('div');body.className='msg-body';
var line=document.createElement('div');line.className='msg-line';
var nm=document.createElement('span');nm.className='msg-name';nm.textContent=isSelf?'我':msg.name;line.appendChild(nm);
var dot=document.createElement('span');dot.className='msg-dot '+(isSelf?'green':(userStates[msg.name]&&userStates[msg.name].visible?'green':'red'));dot.id='dot-'+(isSelf?'self':msg.name);line.appendChild(dot);
body.appendChild(line);
var bub=document.createElement('div');bub.className='msg-bubble';
if(msg.img){var img=document.createElement('img');img.src=msg.img;img.style.maxWidth='200px';img.style.maxHeight='200px';img.style.borderRadius='8px';img.style.cursor='pointer';img.onclick=function(){openImgViewer(msg.img)};bub.appendChild(img)}
else{bub.textContent=msg.text}
body.appendChild(bub);
var tm=document.createElement('div');tm.className='msg-time';tm.textContent=fmtTime(msg.time);body.appendChild(tm);
row.appendChild(body);m.appendChild(row);m.scrollTop=m.scrollHeight
}
function appendSystem(text){
var m=document.getElementById('messages');
var div=document.createElement('div');div.className='msg system';div.textContent=text;
m.appendChild(div);m.scrollTop=m.scrollHeight
}
function sendMessage(){
var input=document.getElementById('msg-input');
var text=input.value.trim();
var img=pendingImg;
if(!text&&!img)return;
if(!ws||ws.readyState!==1)return;
ws.send(JSON.stringify({type:'chat',text:text,img:img||null}));
input.value='';pendingImg='';
var pv=document.getElementById('img-preview');pv.style.display='none';pv.innerHTML='';
lastActivity=Date.now()
}
function goHome(){
if(ws&&ws.readyState===1)ws.send(JSON.stringify({type:'leave'}));
if(ws)ws.close();currentRoomId='';
try{history.replaceState(null,'','/')}catch(e){}
document.getElementById('chat-page').style.display='none';
document.getElementById('login-page').style.display='flex';
var jb=document.getElementById('join-btn');jb.disabled=false;jb.textContent='加入'
}
function showOnlineUsers(){if(ws&&ws.readyState===1)ws.send(JSON.stringify({type:'list'}))}
function closeOverlay(id){document.getElementById(id).classList.remove('show')}
function renderUserList(names){
var box=document.getElementById('userlist-items');box.innerHTML='';
if(!names||!names.length){box.innerHTML='<div style="color:#666;font-size:13px;text-align:center;padding:10px">暂无用户</div>'}
else{names.forEach(function(n){var item=document.createElement('div');item.className='userlist-item';var av=document.createElement('div');av.className='avatar';av.textContent=avatarLetter(n);var un=document.createElement('span');un.className='uname';un.textContent=n;item.appendChild(av);item.appendChild(un);box.appendChild(item)})}
document.getElementById('userlist-overlay').classList.add('show')
}
function showRenameModal(){
document.getElementById('rename-input').value=myName;
document.getElementById('rename-overlay').classList.add('show')
}
function doRename(){
var newName=document.getElementById('rename-input').value.trim();
if(!newName){showToast('昵称不能为空');return}
if(ws&&ws.readyState===1)ws.send(JSON.stringify({type:'rename',name:newName}));
myName=newName;
try{localStorage.setItem('xchat_name',newName)}catch(e){}
closeOverlay('rename-overlay')
}
function fmtTime(ts){var d=new Date(ts);return('0'+d.getHours()).slice(-2)+':'+('0'+d.getMinutes()).slice(-2)}
function updateUnreadBadge(){
var b=document.getElementById('unread-badge');
if(unreadCount>0){b.textContent=unreadCount+' 条新消息';b.style.display='block'}
else{b.style.display='none'}
}
function sendStatus(forceLeft){
if(ws&&ws.readyState===1){
var vis=forceLeft?'left':(!document.hidden);
ws.send(JSON.stringify({type:'status',name:myName,device:/Android|iPhone|iPad|iPod/i.test(navigator.userAgent)?'mobile':'desktop',visible:vis}))
}
}
function updateStatusDisplay(){
var names=Object.keys(userStates);
names.forEach(function(n){
var el=document.getElementById('dot-'+n);
if(el){
var v=userStates[n].visible;
var color=v===true?'green':'red';
el.className='msg-dot '+color
}
});
}
function openImgViewer(src){
document.getElementById('img-viewer-img').src=src;
document.getElementById('img-viewer').classList.add('show')
}
function closeImgViewer(){
document.getElementById('img-viewer').classList.remove('show')
}
document.addEventListener('keydown',function(e){
if(e.key==='Escape')closeImgViewer()
});
var BASIC_EMOJIS=['😀','😄','😂','🤣','😊','😍','🥰','😘','😜','🤪','🤔','🤗','🤫','😎','🥳','😇','🥺','😢','😭','😤','😡','🤯','😱','🫠','🤡','💀','👻','🤖','💩','❤️','🧡','💛','💚','💙','💘','💜','🖤','💕','💝','💖','💓','💗','👍','👎','👊','✊','🤛','🤜','👏','🙌','👐','🤲','🙏','✌️','🤞','🤟','🤘','👌','🤌','🤏','💪','👋','🤚','🖐️','🖖','🖕','👀','👁','👂','👃','👄','👅','👆','👇','👈','👉','👊','👋','👌','👍','👎','👏','👐','👑','👒','👓','👔','👕','👖','👗','👘','👙','👚','👛','👜','👝','👞','👟','👠','👡','👢','👣','👤','👥','👦','👧','👨','👩','👪','👫','👬','👭','👮','👯','👰','👱','👲','👳','👴','👵','👶','👷','👸','👹','👺','👻','👼','👽','👾','👿','💀','💁','💂','💃','💄','💅','💆','💇','💈','💉','💊','💋','💌','💍','💎','💏','💐','💑','💒','💓','💔','💕','💖','💗','💘','💙','💚','💛','💜','💝','💞','💟','💠','💡','💢','💣','💤','💥','💦','💧','💨','💩','💪','💫','💬','💭','💮','💯','💰','💱','💲','💳','💴','💵','💶','💷','💸','💹','💺','💻','💼','💽','💾','💿','📀','📁','📂','📃','📄','📅','📆','📇','📈','📉','📊','📋','📌','📍','📎','📏','📐','📑','📒','📓','📔','📕','📖','📗','📘','📙','📚','📛','📜','📝','📞','📟','📠','📡','📢','📣','📤','📥','📦','📧','📨','📩','📪','📫','📬','📭','📮','📯','📰','📱','📲','📳','📴','📵','📶','📷','📸','📹','📺','📻','📼','📽','📾','📿'];
var currentEmojiTab='basic';
function toggleEmojiPanel(){
var p=document.getElementById('emoji-panel');
p.style.display=p.style.display==='none'?'block':'none';
if(p.style.display==='block')renderEmojiGrid()
}
function showEmojiTab(tab){
currentEmojiTab=tab;
var tabs=document.querySelectorAll('.emoji-tab');
tabs.forEach(function(t){t.classList.remove('active')});
tabs[tab==='basic'?0:1].classList.add('active');
renderEmojiGrid()
}
function renderEmojiGrid(){
var grid=document.getElementById('emoji-grid');
grid.innerHTML='';
if(currentEmojiTab==='basic'){
BASIC_EMOJIS.forEach(function(e){
var d=document.createElement('div');d.className='emoji-item';d.textContent=e;
d.onclick=function(){insertEmoji(e)};
grid.appendChild(d)
})
}else{
var customs=getCustomEmojis();
if(!customs.length){
grid.innerHTML='<div style="grid-column:1/-1;text-align:center;color:#666;font-size:13px;padding:20px 0">暂无自定义表情，点右上角 + 上传</div>'
}else{
customs.forEach(function(src,i){
var d=document.createElement('div');d.className='emoji-item';
var img=document.createElement('img');img.src=src;
d.appendChild(img);
d.onclick=function(){insertEmoji(src)};
var del=document.createElement('span');del.style.cssText='position:absolute;top:0;right:0;font-size:10px;color:#ef4444;cursor:pointer;display:none';del.textContent='×';
d.style.position='relative';
d.onmouseenter=function(){del.style.display='block'};
d.onmouseleave=function(){del.style.display='none'};
del.onclick=function(ev){ev.stopPropagation();deleteCustomEmoji(i)};
d.appendChild(del);
grid.appendChild(d)
})
}
}
}
function insertEmoji(val){
if(!ws||ws.readyState!==1)return;
var isImg=val.indexOf('data:image')===0;
ws.send(JSON.stringify({type:'chat',text:isImg?'':val,img:isImg?val:null}));
document.getElementById('emoji-panel').style.display='none';
lastActivity=Date.now()
}
function getCustomEmojis(){
try{return JSON.parse(localStorage.getItem('xchat_custom_emojis')||'[]')}catch(e){return[]}
}
function saveCustomEmojis(list){
try{localStorage.setItem('xchat_custom_emojis',JSON.stringify(list))}catch(e){showToast('存储空间不足，无法保存表情')}
}
function handleEmojiUpload(input){
var file=input.files&&input.files[0];
if(!file)return;
if(file.size>500000){showToast('表情图片不能超过500KB');input.value='';return}
var reader=new FileReader();
reader.onload=function(ev){
var dataUrl=ev.target.result;
var img=new Image();
img.onload=function(){
var canvas=document.createElement('canvas');
var size=64;
canvas.width=size;canvas.height=size;
var ctx=canvas.getContext('2d');
var scale=Math.min(size/img.width,size/img.height);
var w=img.width*scale,h=img.height*scale;
ctx.drawImage(img,(size-w)/2,(size-h)/2,w,h);
var small=canvas.toDataURL('image/png');
var list=getCustomEmojis();
list.push(small);
saveCustomEmojis(list);
renderEmojiGrid();
showToast('表情已添加')
};
img.src=dataUrl;
};
reader.readAsDataURL(file);
input.value='';
}
function deleteCustomEmoji(index){
var list=getCustomEmojis();
list.splice(index,1);
saveCustomEmojis(list);
renderEmojiGrid()
}
function showToast(msg){var t=document.getElementById('error-toast');t.textContent=msg;t.style.display='block';setTimeout(function(){t.style.display='none'},3000)}
window.addEventListener('load',function(){
try{var last=localStorage.getItem('xchat_lastroom');if(last)document.getElementById('room-input').value=last}catch(e){}
var path=location.pathname.replace('/','').trim();
if(path&&/^[0-9]+$/.test(path)){
document.getElementById('login-page').style.display='none';
document.getElementById('chat-page').style.display='flex';
document.getElementById('header-room-id').textContent='房间: '+path;
joinRoom(path)
}
});
var heartbeatWorker=null;
function startHeartbeat(){
if(heartbeatWorker)return;
var code='setInterval(function(){postMessage(1)},3000)';
var blob=new Blob([code],{type:'application/javascript'});
heartbeatWorker=new Worker(URL.createObjectURL(blob));
heartbeatWorker.onmessage=function(){
if(ws&&ws.readyState===1)ws.send(JSON.stringify({type:'ping'}));
};
}
startHeartbeat();
document.addEventListener('visibilitychange',function(){
if(currentRoomId){
if(document.hidden){
hiddenSince=Date.now();
sendStatus();
}else{
if(hiddenSince&&Date.now()-hiddenSince>1800000){sendStatus(true)}
hiddenSince=0;
sendStatus();
lastActivity=Date.now();
unreadCount=0;updateUnreadBadge();
if(ws&&ws.readyState===1){ws.send(JSON.stringify({type:'ping'}))}
else if(ws&&ws.readyState===0){ws.close()}
}
}
});
setInterval(function(){
if(document.hidden&&currentRoomId&&hiddenSince&&Date.now()-hiddenSince>1800000){
sendStatus(true);
hiddenSince=0;
}
},60000);
</script>
</body>
</html>`;

export class ChatRoom {
  constructor(state, env) {
    this.state = state;
    this.env = env;
    this.ctx = state.storage;
    this.db = state.storage.sqlite;
    this.clients = new Set();
    this.messages = [];
    this.initDb();
  }

  initDb() {
    this.db.exec('CREATE TABLE IF NOT EXISTS messages (id TEXT PRIMARY KEY, time INTEGER NOT NULL, data TEXT NOT NULL)');
    this.db.exec('CREATE INDEX IF NOT EXISTS idx_messages_time ON messages(time)');
  }

  // 加载最近 24 小时的消息（逐条存，按时间升序）
  async loadState() {
    const cutoff = Date.now() - 86400000;
    const rows = this.db.prepare('SELECT data FROM messages WHERE time >= ? ORDER BY time ASC').bind(cutoff).all();
    this.messages = rows.map(r => JSON.parse(r.data));
  }

  // 持久化一条新消息，并清理 24 小时前的旧消息
  persistMessage(msg) {
    this.db.prepare('INSERT OR REPLACE INTO messages (id, time, data) VALUES (?, ?, ?)').run(msg.id, msg.time, JSON.stringify(msg));
    const cutoff = Date.now() - 86400000;
    this.db.prepare('DELETE FROM messages WHERE time < ?').run(cutoff);
  }

  touch() {
    // 房间永远存活，无需记录活跃时间
  }

  isExpired() {
    // 取消房间过期，永远存活
    return false;
  }

  async fetch(request) {
    const url = new URL(request.url);
    if (url.pathname === '/ws') {
      return this.handleWebSocket(request);
    }
    await this.loadState();
    if (this.isExpired()) {
      return new Response(NOT_FOUND_PAGE, {
        status: 404,
        headers: { 'content-type': 'text/html; charset=utf-8' }
      });
    }
    this.touch();
    return new Response(HTML_PAGE, {
      headers: { 'content-type': 'text/html; charset=utf-8' }
    });
  }

  handleWebSocket(request) {
    const pair = new WebSocketPair();
    const client = pair[0];
    const server = pair[1];
    this.clients.add(server);
    server.accept();
    this.loadState();

    server.addEventListener('message', (event) => {
      let data;
      try { data = JSON.parse(event.data); } catch { return; }

      if (data.type === 'join') {
        this.touch();
        const roomId = String(data.roomId || 'default').trim().slice(0, 32);
        const name = String(data.name || '匿名').trim().slice(0, 20) || '匿名';
        server._roomName = name;
        this.sendTo(server, {
          type: 'joined',
          roomId: roomId,
          name: name,
          history: this.messages.slice(-50),
          onlineCount: this.clients.size
        });
        this.broadcast({ type: 'system', message: name + ' 加入了房间', time: Date.now() }, server);
        this.updateOnline();
      }

      if (data.type === 'ping') {
        this.touch();
        this.sendTo(server, { type: 'pong', time: Date.now() });
      }

      if (data.type === 'chat') {
        const text = String(data.text || '').trim().slice(0, 2000);
        const img = data.img ? String(data.img).slice(0, 2000000) : null;
        if (!text && !img) return;
        const msg = {
          type: 'chat',
          name: server._roomName || '匿名',
          text: text,
          img: img,
          time: Date.now(),
          id: crypto.randomUUID()
        };
        this.persistMessage(msg);
        this.messages.push(msg);
        this.broadcast(msg);
      }

      if (data.type === 'rename') {
        const newName = String(data.name || '').trim().slice(0, 20);
        if (newName) {
          const oldName = server._roomName;
          server._roomName = newName;
          this.broadcast({ type: 'system', message: oldName + ' 改名为 ' + newName, time: Date.now() });
        }
      }

      if (data.type === 'status') {
        const name = String(data.name || server._roomName || '').slice(0, 20);
        const device = data.device === 'mobile' ? 'mobile' : 'desktop';
        const visible = !!data.visible;
        this.broadcast({ type: 'status', name: name, device: device, visible: visible });
      }

      if (data.type === 'list') {
        const names = [];
        for (const c of this.clients) {
          if (c._roomName) names.push(c._roomName);
        }
        this.sendTo(server, { type: 'userList', names: names });
      }

      if (data.type === 'leave') {
        this.removeClient(server);
      }
    });

    server.addEventListener('close', () => this.removeClient(server));
    server.addEventListener('error', () => this.removeClient(server));

    return new Response(null, { status: 101, webSocket: client });
  }

  sendTo(ws, data) {
    try { ws.send(JSON.stringify(data)); } catch {}
  }

  broadcast(msg, exclude) {
    const json = JSON.stringify(msg);
    for (const c of this.clients) {
      if (c !== exclude) { try { c.send(json); } catch {} }
    }
  }

  updateOnline() {
    const json = JSON.stringify({ type: 'onlineCount', count: this.clients.size });
    for (const c of this.clients) { try { c.send(json); } catch {} }
  }

  removeClient(server) {
    const name = server._roomName;
    this.clients.delete(server);
    if (name) {
      this.broadcast({ type: 'system', message: name + ' 离开了房间', time: Date.now() }, server);
      this.broadcast({ type: 'left', name: name });
    }
    this.updateOnline();
  }
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    if (url.pathname === '/health') {
      return Response.json({ status: 'ok' });
    }

    if (url.pathname === '/ws') {
      const roomId = url.searchParams.get('room') || 'default';
      const safeRoom = roomId.replace(/[^a-zA-Z0-9_-]/g, '_').slice(0, 32) || 'default';
      const stub = env.ROOM.idFromName(safeRoom);
      const room = env.ROOM.get(stub);
      return room.fetch(request);
    }

    return new Response(HTML_PAGE, {
      headers: { 'content-type': 'text/html; charset=utf-8' }
    });
  }
};
