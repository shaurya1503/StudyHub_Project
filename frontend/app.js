'use strict';
/* StudyHub frontend – talks to the backend API (Node.js + Express + MongoDB) */
const ORIGIN = location.protocol === 'file:' ? 'http://localhost:5000' : '';
const API = ORIGIN + '/api';
const SUBJECTS = {
  3: ['Data Structures', 'Digital Electronics', 'Discrete Mathematics', 'Object Oriented Programming'],
  4: ['Operating Systems', 'Database Management Systems', 'Computer Networks', 'Design and Analysis of Algorithms'],
  5: ['Software Engineering', 'Theory of Computation', 'Web Technologies', 'Compiler Design']
};

/* ---------- Helpers ---------- */
const $ = (id) => document.getElementById(id);
const esc = (s) => String(s == null ? '' : s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const day = (iso) => (iso ? String(iso).slice(0, 10) : '');
const allSubjects = () => [...new Set(Object.values(SUBJECTS).flat())];
function say(id, text, ok) { const m = $(id); m.textContent = text || ''; m.className = 'msg ' + (ok ? 'ok' : 'err'); }
function fillSelect(sel, first, items) {
  sel.innerHTML = (first ? '<option value="">' + first + '</option>' : '') + items.map(([v, t]) => '<option value="' + esc(v) + '">' + esc(t) + '</option>').join('');
}

/* ---------- Session ---------- */
let token = localStorage.getItem('sh_token');
let user = JSON.parse(localStorage.getItem('sh_user') || 'null');
const isAdmin = () => user && user.role === 'admin';
function setSession(t, u) {
  token = t; user = u;
  if (t) { localStorage.setItem('sh_token', t); localStorage.setItem('sh_user', JSON.stringify(u)); }
  else { localStorage.removeItem('sh_token'); localStorage.removeItem('sh_user'); }
  renderUser(); loadResources(); renderPosts();
}
function renderUser() {
  $('navUser').innerHTML = user
    ? '<span>Hi, ' + esc(user.name) + (isAdmin() ? ' (Admin)' : '') + '</span><button id="logoutBtn" class="btn small">Logout</button>'
    : '<a href="#auth" class="btn small">Login</a>';
  $('uploadForm').hidden = !user; $('uploadHint').hidden = !!user;
}
document.addEventListener('click', (e) => { if (e.target.id === 'logoutBtn') { setSession(null, null); location.hash = '#home'; } });

/* ---------- API helper ---------- */
async function api(path, opts = {}) {
  const headers = {};
  if (token) headers.Authorization = 'Bearer ' + token;
  let body = opts.body;
  if (body && !(body instanceof FormData)) { headers['Content-Type'] = 'application/json'; body = JSON.stringify(body); }
  let res;
  try { res = await fetch(API + path, { method: opts.method || 'GET', headers, body }); }
  catch (e) { throw new Error('Cannot reach the server. Is the backend running?'); }
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    if (res.status === 401 && token && /token/i.test(data.message || '')) setSession(null, null);
    throw new Error(data.message || 'Request failed');
  }
  return data;
}

/* ---------- Page navigation (hash based) ---------- */
function showPage() {
  const id = (location.hash || '#home').slice(1);
  const el = document.getElementById(id);
  const target = el && el.classList.contains('page') ? id : 'home';
  document.querySelectorAll('.page').forEach((p) => p.classList.toggle('active', p.id === target));
  window.scrollTo(0, 0);
}
window.addEventListener('hashchange', showPage);

/* ---------- Login / Register ---------- */
const emailOk = (e) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e);
function switchTab(login) {
  $('loginForm').hidden = !login; $('registerForm').hidden = login;
  $('tabLogin').classList.toggle('active', login); $('tabRegister').classList.toggle('active', !login);
  say('authMsg', '');
}
$('tabLogin').onclick = () => switchTab(true);
$('tabRegister').onclick = () => switchTab(false);
$('loginForm').addEventListener('submit', async (e) => {
  e.preventDefault();
  const email = $('lEmail').value.trim(), password = $('lPass').value;
  if (!emailOk(email)) return say('authMsg', 'Enter a valid email address.');
  if (password.length < 6) return say('authMsg', 'Password must be at least 6 characters.');
  try {
    const d = await api('/auth/login', { method: 'POST', body: { email, password } });
    say('authMsg', 'Login successful.', true); setSession(d.token, d.user); location.hash = '#study';
  } catch (err) { say('authMsg', err.message); }
});
$('registerForm').addEventListener('submit', async (e) => {
  e.preventDefault();
  const name = $('rName').value.trim(), email = $('rEmail').value.trim(), password = $('rPass').value;
  if (name.length < 2) return say('authMsg', 'Enter your full name.');
  if (!emailOk(email)) return say('authMsg', 'Enter a valid email address.');
  if (password.length < 6) return say('authMsg', 'Password must be at least 6 characters.');
  if (password !== $('rPass2').value) return say('authMsg', 'Passwords do not match.');
  try {
    const d = await api('/auth/register', { method: 'POST', body: { name, email, password, course: $('rCourse').value.trim(), semester: Number($('rSem').value) } });
    say('authMsg', 'Account created.', true); setSession(d.token, d.user); location.hash = '#study';
  } catch (err) { say('authMsg', err.message); }
});

/* ---------- Study Point ---------- */
async function loadResources() {
  const p = new URLSearchParams();
  if ($('q').value.trim()) p.set('q', $('q').value.trim());
  if ($('fSem').value) p.set('semester', $('fSem').value);
  if ($('fSub').value) p.set('subject', $('fSub').value);
  if ($('fType').value) p.set('type', $('fType').value);
  $('count').textContent = 'Loading...';
  try {
    const list = await api('/resources?' + p.toString());
    $('count').textContent = list.length + ' resource' + (list.length === 1 ? '' : 's') + ' found';
    $('resList').innerHTML = list.length ? list.map((r) =>
      '<div class="card"><span class="tag">' + esc(r.resourceType) + '</span><span class="tag">Semester ' + esc(r.semester) + '</span>' +
      '<h3>' + esc(r.title) + '</h3><div class="meta">' + esc(r.subject) + '<br>Uploaded by ' + esc(r.uploadedBy ? r.uploadedBy.name : 'Unknown') + ' on ' + day(r.createdAt) + '</div>' +
      '<div class="actions">' +
      (r.fileUrl ? '<a class="btn small" target="_blank" rel="noopener" href="' + ORIGIN + esc(r.fileUrl) + '">Download</a>' : '') +
      (isAdmin() ? '<button class="btn small danger" data-del-res="' + esc(r._id) + '">Delete</button>' : '') +
      '</div></div>').join('') : '<p class="muted">No resources match your search.</p>';
  } catch (err) { $('count').textContent = ''; $('resList').innerHTML = '<p class="msg err">' + esc(err.message) + '</p>'; }
}
function refreshFilterSubjects() {
  const sem = $('fSem').value;
  fillSelect($('fSub'), 'All subjects', (sem ? SUBJECTS[sem] || [] : allSubjects()).map((s) => [s, s]));
}
let timer;
$('q').addEventListener('input', () => { clearTimeout(timer); timer = setTimeout(loadResources, 300); });
['fSub', 'fType'].forEach((id) => $(id).addEventListener('change', loadResources));
$('fSem').addEventListener('change', () => { refreshFilterSubjects(); loadResources(); });
$('resList').addEventListener('click', async (e) => {
  const id = e.target.getAttribute('data-del-res');
  if (!id || !confirm('Delete this resource?')) return;
  try { await api('/resources/' + id, { method: 'DELETE' }); loadResources(); } catch (err) { alert(err.message); }
});

/* upload form */
function refreshUploadSubjects() { fillSelect($('uSub'), '', (SUBJECTS[$('uSem').value] || []).map((s) => [s, s])); }
$('uSem').addEventListener('change', refreshUploadSubjects);
$('uploadForm').addEventListener('submit', async (e) => {
  e.preventDefault();
  const file = $('uFile').files[0];
  if (!$('uTitle').value.trim()) return say('uploadMsg', 'Enter a title.');
  if (!file) return say('uploadMsg', 'Choose a file to upload.');
  const fd = new FormData();
  fd.append('title', $('uTitle').value.trim()); fd.append('semester', $('uSem').value);
  fd.append('subject', $('uSub').value); fd.append('resourceType', $('uType').value); fd.append('file', file);
  try {
    await api('/resources', { method: 'POST', body: fd });
    say('uploadMsg', 'Uploaded successfully.', true);
    $('uTitle').value = ''; $('uFile').value = ''; loadResources();
  } catch (err) { say('uploadMsg', err.message); }
});

/* ---------- Community ---------- */
let posts = [];
const openComments = new Set();
async function loadPosts() {
  try { posts = await api('/posts'); renderPosts(); }
  catch (err) { $('postList').innerHTML = '<p class="msg err">' + esc(err.message) + '</p>'; }
}
function renderPosts() {
  if (!posts.length) { $('postList').innerHTML = '<p class="muted">No posts yet. Be the first to post.</p>'; return; }
  $('postList').innerHTML = posts.map((p) =>
    '<div class="card post"><span class="tag">' + esc(p.category) + '</span><span class="meta">' + esc(p.author ? p.author.name : 'Unknown') + ' · ' + day(p.createdAt) + '</span>' +
    '<p>' + esc(p.content) + '</p>' +
    '<div class="actions"><button class="link" data-toggle="' + esc(p._id) + '">' + p.comments.length + ' comment' + (p.comments.length === 1 ? '' : 's') + '</button>' +
    (isAdmin() ? '<button class="btn small danger" data-del-post="' + esc(p._id) + '">Delete</button>' : '') + '</div>' +
    '<div class="comments" ' + (openComments.has(p._id) ? '' : 'hidden') + ' id="c' + esc(p._id) + '">' +
    p.comments.map((c) => '<p><b>' + esc(c.author ? c.author.name : 'Unknown') + ':</b> ' + esc(c.text) + '</p>').join('') +
    (user ? '<form data-comment="' + esc(p._id) + '"><input placeholder="Write a comment" required><button class="btn small" type="submit">Send</button></form>' : '<p class="muted">Login to comment.</p>') +
    '</div></div>').join('');
}
$('postList').addEventListener('click', async (e) => {
  const t = e.target.getAttribute('data-toggle');
  if (t) { openComments.has(t) ? openComments.delete(t) : openComments.add(t); renderPosts(); return; }
  const d = e.target.getAttribute('data-del-post');
  if (d && confirm('Delete this post?')) { try { await api('/posts/' + d, { method: 'DELETE' }); loadPosts(); } catch (err) { alert(err.message); } }
});
$('postList').addEventListener('submit', async (e) => {
  e.preventDefault();
  const id = e.target.getAttribute('data-comment'); const input = e.target.querySelector('input');
  if (!input.value.trim()) return;
  try { await api('/posts/' + id + '/comments', { method: 'POST', body: { text: input.value.trim() } }); openComments.add(id); loadPosts(); }
  catch (err) { alert(err.message); }
});
$('postForm').addEventListener('submit', async (e) => {
  e.preventDefault();
  if (!user) return say('postMsg', 'Please login to post.');
  const content = $('postText').value.trim(); if (!content) return say('postMsg', 'Write something first.');
  try { await api('/posts', { method: 'POST', body: { content, category: $('postCat').value } }); $('postText').value = ''; say('postMsg', ''); loadPosts(); }
  catch (err) { say('postMsg', err.message); }
});

/* ---------- Init ---------- */
fillSelect($('fSem'), 'All semesters', Object.keys(SUBJECTS).map((s) => [s, 'Semester ' + s]));
fillSelect($('uSem'), '', Object.keys(SUBJECTS).map((s) => [s, 'Semester ' + s]));
fillSelect($('rSem'), '', [1, 2, 3, 4, 5, 6, 7, 8].map((s) => [s, String(s)]));
$('rSem').value = '3';
refreshFilterSubjects(); refreshUploadSubjects(); renderUser(); showPage();
loadResources(); loadPosts();
