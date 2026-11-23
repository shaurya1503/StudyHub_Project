'use strict';
/* ---------- Setup ---------- */
const API = location.protocol === 'file:' ? 'http://localhost:5000/api' : '/api';
const BASE = API.replace('/api', '');
const SUBJECTS = {
  1: ['Programming for Problem Solving', 'Engineering Mathematics-I', 'Engineering Physics', 'Basic Electrical Engineering'],
  2: ['Engineering Mathematics-II', 'Engineering Chemistry', 'Engineering Graphics', 'Communication Skills'],
  3: ['Data Structures', 'Digital Electronics', 'Discrete Mathematics', 'Object Oriented Programming'],
  4: ['Operating Systems', 'Database Management Systems', 'Computer Networks', 'Design and Analysis of Algorithms'],
  5: ['Software Engineering', 'Theory of Computation', 'Web Technologies', 'Compiler Design'],
  6: ['Artificial Intelligence', 'Machine Learning', 'Computer Graphics', 'Cloud Computing'],
  7: ['Information Security', 'Data Mining', 'Elective-I', 'Project-I'],
  8: ['Elective-II', 'Elective-III', 'Project-II', 'Seminar']
};
let resources = [], posts = [];
let session = JSON.parse(localStorage.getItem('sh_session') || 'null'); // { token, user }

const $ = (id) => document.getElementById(id);
const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const allSubjects = () => [...new Set(Object.values(SUBJECTS).flat())];
const isAdmin = () => session && session.user.role === 'admin';
const can = (author) => session && author && (isAdmin() || String(author._id || author) === String(session.user.id));
const day = (d) => String(d).slice(0, 10);

async function api(path, opts = {}) {
  const headers = opts.body instanceof FormData ? {} : { 'Content-Type': 'application/json' };
  if (session) headers.Authorization = 'Bearer ' + session.token;
  const res = await fetch(API + path, { ...opts, headers });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    if (res.status === 401 && session) logout(); // token expired
    throw new Error(data.message || 'Something went wrong');
  }
  return data;
}

/* ---------- Navigation ---------- */
function showPage() {
  const id = (location.hash || '#home').slice(1);
  const target = document.getElementById(id) && document.getElementById(id).classList.contains('page') ? id : 'home';
  document.querySelectorAll('.page').forEach((p) => p.classList.toggle('active', p.id === target));
  window.scrollTo(0, 0);
  if (target === 'profile') loadProfile();
}
window.addEventListener('hashchange', showPage);

function updateUI() {
  $('navAuth').textContent = session ? 'Logout (' + session.user.name.split(' ')[0] + ')' : 'Login';
  $('uploadBox').hidden = !session; $('navProfile').hidden = !session;
  renderResources(); renderPosts();
}
function logout() { session = null; localStorage.removeItem('sh_session'); updateUI(); }
$('navAuth').addEventListener('click', (e) => { if (session) { e.preventDefault(); logout(); location.hash = '#home'; } });

/* ---------- Login / Register ---------- */
function setMsg(text, ok) { const m = $('authMsg'); m.textContent = text; m.className = 'msg ' + (ok ? 'ok' : 'err'); }
const emailOk = (e) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e);
function switchTab(login) {
  $('loginForm').hidden = !login; $('registerForm').hidden = login;
  $('tabLogin').classList.toggle('active', login); $('tabRegister').classList.toggle('active', !login);
  setMsg('', true);
}
$('tabLogin').onclick = () => switchTab(true);
$('tabRegister').onclick = () => switchTab(false);
async function authDone(data) {
  session = { token: data.token, user: data.user };
  localStorage.setItem('sh_session', JSON.stringify(session));
  setMsg('', true); updateUI(); location.hash = '#profile';
}
$('loginForm').addEventListener('submit', async (e) => {
  e.preventDefault();
  if (!emailOk($('lEmail').value.trim())) return setMsg('Enter a valid email address.', false);
  if ($('lPass').value.length < 6) return setMsg('Password must be at least 6 characters.', false);
  try { authDone(await api('/auth/login', { method: 'POST', body: JSON.stringify({ email: $('lEmail').value.trim(), password: $('lPass').value }) })); }
  catch (err) { setMsg(err.message, false); }
});
$('registerForm').addEventListener('submit', async (e) => {
  e.preventDefault();
  if ($('rName').value.trim().length < 2) return setMsg('Enter your full name.', false);
  if (!emailOk($('rEmail').value.trim())) return setMsg('Enter a valid email address.', false);
  if ($('rPass').value.length < 6) return setMsg('Password must be at least 6 characters.', false);
  if ($('rPass').value !== $('rPass2').value) return setMsg('Passwords do not match.', false);
  try {
    authDone(await api('/auth/register', { method: 'POST', body: JSON.stringify({
      name: $('rName').value.trim(), email: $('rEmail').value.trim(), password: $('rPass').value,
      course: $('rCourse').value.trim(), semester: Number($('rSem').value) }) }));
  } catch (err) { setMsg(err.message, false); }
});

/* ---------- Study Point ---------- */
function fillSelect(sel, first, items) {
  sel.innerHTML = (first ? '<option value="">' + first + '</option>' : '') + items.map(([v, t]) => '<option value="' + esc(v) + '">' + esc(t) + '</option>').join('');
}
async function loadResources() {
  const p = new URLSearchParams();
  if ($('q').value.trim()) p.set('q', $('q').value.trim());
  if ($('fSem').value) p.set('semester', $('fSem').value);
  if ($('fSub').value) p.set('subject', $('fSub').value);
  if ($('fType').value) p.set('type', $('fType').value);
  try { resources = await api('/resources?' + p); } catch (err) { $('count').textContent = 'Could not load resources: ' + err.message; return; }
  renderResources();
}
function renderResources() {
  $('count').textContent = resources.length + ' resource' + (resources.length === 1 ? '' : 's') + ' found';
  $('resList').innerHTML = resources.length ? resources.map((r) =>
    '<div class="card"><span class="tag">' + esc(r.resourceType) + '</span><span class="tag">Semester ' + r.semester + '</span>' +
    '<h3>' + esc(r.title) + '</h3><div class="meta">' + esc(r.subject) + '<br>Uploaded by ' + esc(r.uploadedBy ? r.uploadedBy.name : 'Unknown') + ' on ' + day(r.createdAt) + '</div>' +
    (r.description ? '<p>' + esc(r.description) + '</p>' : '') +
    '<div class="actions">' + (r.fileUrl ? '<a class="btn small" target="_blank" href="' + BASE + r.fileUrl + '">Download</a> ' : '') +
    (can(r.uploadedBy) ? '<button class="link" data-delres="' + r._id + '">Delete</button>' : '') + '</div></div>'
  ).join('') : '<p class="muted">No resources match your search.</p>';
}
async function refreshSubjects() {
  const sem = $('fSem').value, cur = $('fSub').value;
  let extra = []; try { extra = await api('/resources/subjects'); } catch (e) {}
  const list = [...new Set([...(sem ? SUBJECTS[sem] || [] : allSubjects()), ...extra])].sort();
  fillSelect($('fSub'), 'All subjects', list.map((s) => [s, s])); $('fSub').value = cur;
}
['q', 'fSub', 'fType'].forEach((id) => $(id).addEventListener('input', loadResources));
$('fSem').addEventListener('change', () => { refreshSubjects(); loadResources(); });
$('resList').addEventListener('click', async (e) => {
  const id = e.target.getAttribute('data-delres');
  if (!id || !confirm('Delete this resource?')) return;
  try { await api('/resources/' + id, { method: 'DELETE' }); loadResources(); } catch (err) { alert(err.message); }
});
$('uploadBox').addEventListener('submit', async (e) => {
  e.preventDefault();
  const fd = new FormData();
  fd.append('title', $('uTitle').value.trim()); fd.append('description', $('uDesc').value.trim());
  fd.append('semester', $('uSem').value); fd.append('subject', $('uSub').value.trim());
  fd.append('resourceType', $('uType').value); fd.append('file', $('uFile').files[0]);
  try { await api('/resources', { method: 'POST', body: fd }); $('uploadBox').reset(); alert('Uploaded!'); refreshSubjects(); loadResources(); }
  catch (err) { alert(err.message); }
});

/* ---------- Community ---------- */
async function loadPosts() {
  try { posts = await api('/posts'); } catch (err) { $('postList').innerHTML = '<p class="muted">Could not load posts: ' + esc(err.message) + '</p>'; return; }
  renderPosts();
}
function renderPosts() {
  const open = new Set([...document.querySelectorAll('.comments:not([hidden])')].map((el) => el.id));
  $('postList').innerHTML = posts.map((p) =>
    '<div class="card post"><span class="tag">' + esc(p.category) + '</span><span class="meta">' + esc(p.author ? p.author.name : 'Unknown') + ' · ' + day(p.createdAt) + '</span>' +
    '<p>' + esc(p.content) + '</p>' +
    '<div class="actions"><button class="link" data-toggle="' + p._id + '">' + p.comments.length + ' comment' + (p.comments.length === 1 ? '' : 's') + '</button>' +
    (can(p.author) ? ' <button class="link" data-editpost="' + p._id + '">Edit</button> <button class="link" data-delpost="' + p._id + '">Delete</button>' : '') + '</div>' +
    '<div class="comments" id="c' + p._id + '"' + (open.has('c' + p._id) ? '' : ' hidden') + '>' +
    p.comments.map((c) => '<p><b>' + esc(c.author ? c.author.name : 'Unknown') + ':</b> ' + esc(c.text) + (can(c.author) ? ' <button class="link" data-editc="' + c._id + '">Edit</button> <button class="link" data-delc="' + c._id + '">✕</button>' : '') + '</p>').join('') +
    '<form data-comment="' + p._id + '"><input placeholder="Write a comment" required><button class="btn small" type="submit">Send</button></form></div></div>'
  ).join('') || '<p class="muted">No posts yet. Be the first to post!</p>';
}
$('postList').addEventListener('click', async (e) => { // (old handler replaced below)
  return handlePostClick(e);
});
async function handlePostClick(e) {
  const a = (n) => e.target.getAttribute(n);
  try {
    if (a('data-toggle')) $('c' + a('data-toggle')).hidden = !$('c' + a('data-toggle')).hidden;
    else if (a('data-delpost')) { if (confirm('Delete this post?')) { await api('/posts/' + a('data-delpost'), { method: 'DELETE' }); loadPosts(); } }
    else if (a('data-delc')) { if (confirm('Delete this comment?')) { await api('/posts/comments/' + a('data-delc'), { method: 'DELETE' }); loadPosts(); } }
    else if (a('data-editpost')) {
      const old = posts.find((p) => p._id === a('data-editpost')); const v = prompt('Edit your post:', old.content);
      if (v && v.trim()) { await api('/posts/' + old._id, { method: 'PUT', body: JSON.stringify({ content: v.trim() }) }); loadPosts(); }
    } else if (a('data-editc')) {
      const all = posts.flatMap((p) => p.comments); const old = all.find((c) => c._id === a('data-editc')); const v = prompt('Edit your comment:', old.text);
      if (v && v.trim()) { await api('/posts/comments/' + old._id, { method: 'PUT', body: JSON.stringify({ text: v.trim() }) }); loadPosts(); }
    }
  } catch (err) { alert(err.message); }
}
$('postList').addEventListener('submit', async (e) => {
  e.preventDefault();
  const id = e.target.getAttribute('data-comment'); const input = e.target.querySelector('input');
  if (!input.value.trim()) return;
  try { await api('/posts/' + id + '/comments', { method: 'POST', body: JSON.stringify({ text: input.value.trim() }) }); await loadPosts(); $('c' + id).hidden = false; }
  catch (err) { alert(err.message === 'Login required' ? 'Please login first.' : err.message); }
});
$('postForm').addEventListener('submit', async (e) => {
  e.preventDefault();
  const content = $('postText').value.trim(); if (!content) return;
  try { await api('/posts', { method: 'POST', body: JSON.stringify({ content, category: $('postCat').value }) }); $('postText').value = ''; loadPosts(); }
  catch (err) { alert(err.message === 'Login required' ? 'Please login first.' : err.message); }
});

/* ---------- Profile / Dashboard ---------- */
async function loadProfile() {
  if (!session) { location.hash = '#auth'; return; }
  try {
    const d = await api('/auth/me');
    $('profileBox').innerHTML = '<div class="card"><h3>' + esc(d.user.name) + (d.user.role === 'admin' ? ' <span class="tag">Admin</span>' : '') + '</h3>' +
      '<div class="meta">' + esc(d.user.email) + '<br>' + esc(d.user.course || 'Course not set') + ' · Semester ' + (d.user.semester || '-') + '</div></div>' +
      '<div class="card stats"><div><b>' + d.resources.length + '</b>Uploads</div><div><b>' + d.posts + '</b>Posts</div><div><b>' + d.comments + '</b>Comments</div></div>' +
      '<div class="row"><a class="btn" href="#study">Study Point</a><a class="btn ghost" href="#community">Community</a></div>' +
      '<h3>My uploads</h3>' + (d.resources.length ? d.resources.map((r) =>
        '<div class="card"><span class="tag">' + esc(r.resourceType) + '</span><b>' + esc(r.title) + '</b><div class="meta">' + esc(r.subject) + ' · Sem ' + r.semester + ' · ' + day(r.createdAt) + '</div>' +
        '<button class="link" data-myres="' + r._id + '">Delete</button></div>').join('') : '<p class="muted">You have not uploaded anything yet.</p>');
  } catch (err) { $('profileBox').innerHTML = '<p class="muted">' + esc(err.message) + '</p>'; }
}
$('profileBox').addEventListener('click', async (e) => {
  const id = e.target.getAttribute('data-myres');
  if (!id || !confirm('Delete this upload?')) return;
  try { await api('/resources/' + id, { method: 'DELETE' }); loadProfile(); loadResources(); } catch (err) { alert(err.message); }
});

/* ---------- Init ---------- */
fillSelect($('fSem'), 'All semesters', [1, 2, 3, 4, 5, 6, 7, 8].map((s) => [s, 'Semester ' + s]));
fillSelect($('rSem'), '', [1, 2, 3, 4, 5, 6, 7, 8].map((s) => [s, String(s)]));
fillSelect($('uSem'), '', [1, 2, 3, 4, 5, 6, 7, 8].map((s) => [s, 'Semester ' + s]));
$('rSem').value = '3'; $('uSem').value = '3';
fillSelect($('subList'), '', allSubjects().map((s) => [s, s]));
refreshSubjects(); updateUI(); showPage(); loadResources(); loadPosts();
