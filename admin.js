// ThriftLux Admin
const ADMIN_PASSWORD = 'thriftlux2026';
const GITHUB_REPO = 'joelmuthee/thriftlux';
const GITHUB_BRANCH = 'main';
const GITHUB_TOKEN = atob('Z2l0aHViX3BhdF8xMUI0Q1JGNkEwZ2FHOHBBTHpYbW93X1ZoQTNPS05DQkRLMVk5bXFHV3d5cUE1dUNzNXJrQjlqTWtSNG1WS05qcUdZVUhMS1RJUndtaFk1WTBn');

let bags = [];
let settings = {};
let editingId = null;
// stagedImage = { base64: '...pure base64...', ext: 'jpg', dataUrl: 'data:...' } | null
let stagedImage = null;

// ====== AUTH ======
const loginScreen = document.getElementById('loginScreen');
const dashboard = document.getElementById('dashboard');
const loginBtn = document.getElementById('loginBtn');
const loginPassword = document.getElementById('loginPassword');
const loginError = document.getElementById('loginError');

function checkAuth() {
  if (sessionStorage.getItem('thriftlux_auth') === '1') {
    loginScreen.style.display = 'none';
    dashboard.style.display = 'block';
    init();
  }
}
loginBtn.addEventListener('click', login);
loginPassword.addEventListener('keypress', e => { if (e.key === 'Enter') login(); });
function login() {
  if (loginPassword.value === ADMIN_PASSWORD) {
    sessionStorage.setItem('thriftlux_auth', '1');
    loginError.style.display = 'none';
    checkAuth();
  } else {
    loginError.style.display = 'block';
  }
}
document.getElementById('logoutBtn').addEventListener('click', () => {
  sessionStorage.removeItem('thriftlux_auth');
  location.reload();
});


// ====== GITHUB API ======
async function githubGet(path) {
  const res = await fetch(
    `https://api.github.com/repos/${GITHUB_REPO}/contents/${path}?ref=${GITHUB_BRANCH}`,
    { headers: { Authorization: `Bearer ${GITHUB_TOKEN}`, Accept: 'application/vnd.github+json' } }
  );
  if (!res.ok) throw new Error(`GitHub GET failed: ${res.status}`);
  return res.json();
}

async function githubPut(path, contentBase64, message, sha) {
  const body = { message, content: contentBase64, branch: GITHUB_BRANCH };
  if (sha) body.sha = sha;
  const res = await fetch(
    `https://api.github.com/repos/${GITHUB_REPO}/contents/${path}`,
    {
      method: 'PUT',
      headers: {
        Authorization: `Bearer ${GITHUB_TOKEN}`,
        'Content-Type': 'application/json',
        Accept: 'application/vnd.github+json'
      },
      body: JSON.stringify(body)
    }
  );
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.message || `GitHub PUT failed: ${res.status}`);
  }
  return res.json();
}

async function uploadImageToGitHub(base64, ext) {
  const filename = `images/bags/bag_${Date.now()}.${ext}`;
  let sha;
  try { sha = (await githubGet(filename)).sha; } catch(e) {}
  await githubPut(filename, base64, `Add bag image`, sha);
  return filename;
}

async function publishData(message = 'Update bag data') {
  const content = JSON.stringify({ bags, settings }, null, 2);
  // btoa requires latin1 — use encodeURIComponent + unescape for unicode safety
  const contentBase64 = btoa(unescape(encodeURIComponent(content)));
  let sha;
  try { sha = (await githubGet('data.json')).sha; } catch(e) {}
  await githubPut('data.json', contentBase64, message, sha);
}

// ====== DATA ======
async function loadData() {
  try {
    const res = await fetch(
      `https://raw.githubusercontent.com/${GITHUB_REPO}/${GITHUB_BRANCH}/data.json?_=${Date.now()}`
    );
    if (!res.ok) throw new Error('fetch failed');
    const json = await res.json();
    bags = json.bags || [];
    settings = json.settings || {};
    return;
  } catch(e) {}
  // Local fallback
  try {
    const res = await fetch(`data.json?_=${Date.now()}`);
    const json = await res.json();
    bags = json.bags || [];
    settings = json.settings || {};
  } catch(e) {}
}

// ====== TOAST ======
const toast = document.getElementById('toast');
function showToast(msg) {
  toast.textContent = msg;
  toast.classList.add('show');
  setTimeout(() => toast.classList.remove('show'), 2800);
}

function setSaving(on) {
  const btn = document.getElementById('saveBtn');
  btn.disabled = on;
  btn.textContent = on ? 'Publishing…' : 'Save bag';
}

// ====== FORM ======
const imageInput = document.getElementById('imageInput');
const imagePreview = document.getElementById('imagePreview');
const nameInput = document.getElementById('nameInput');
const descInput = document.getElementById('descInput');
const priceInput = document.getElementById('priceInput');
const reelInput = document.getElementById('reelInput');
const soldInput = document.getElementById('soldInput');
const editingIdField = document.getElementById('editingId');
const formTitle = document.getElementById('formTitle');
const cancelBtn = document.getElementById('cancelBtn');

imageInput.addEventListener('change', e => {
  const file = e.target.files[0];
  if (!file) return;
  const ext = (file.name.split('.').pop() || 'jpg').toLowerCase();
  const reader = new FileReader();
  reader.onload = () => {
    const dataUrl = reader.result;
    const base64 = dataUrl.split(',')[1];
    stagedImage = { base64, ext, dataUrl };
    imagePreview.innerHTML = `<img src="${dataUrl}" style="max-width:200px;border-radius:8px;">`;
  };
  reader.readAsDataURL(file);
});

document.getElementById('aiBtn').addEventListener('click', () => {
  const name = nameInput.value.trim();
  if (!name) { showToast('Type the bag name first.'); return; }
  descInput.value = generateDescription(name);
});

function generateDescription(name) {
  const lower = name.toLowerCase();
  const colors = { 'black':'sleek black', 'white':'crisp white', 'beige':'warm beige', 'brown':'rich brown', 'caramel':'warm caramel', 'grey':'soft grey', 'gray':'soft grey', 'blue':'deep blue', 'denim':'denim blue', 'green':'rich green', 'cream':'soft cream' };
  let color = '';
  for (const c in colors) if (lower.includes(c)) { color = colors[c]; break; }
  const mats = ['leather','suede','patent','canvas','denim','vegan leather'];
  let mat = mats.find(m => lower.includes(m)) || 'leather';
  const styles = ['crossbody','shoulder','tote','clutch','hobo','bucket','baguette','top handle','sling','chain'];
  let style = styles.find(s => lower.includes(s)) || 'handbag';
  const openers = [
    `Beautifully crafted ${color || 'designer'} ${mat} ${style} bag.`,
    `Elegant ${color || 'classic'} ${mat} ${style} silhouette.`,
    `A statement ${color || ''} ${mat} ${style} piece.`.replace(/\s+/g,' ')
  ];
  const middles = [
    `Quality reviewed and ready for its next chapter.`,
    `Hand-picked for ThriftLux. Clean lines and timeless appeal.`,
    `Pre-loved with care, photographed exactly as it is.`
  ];
  const closers = [
    `Tap Enquire to chat with Venessa on WhatsApp.`,
    `Drop-off in Nairobi CBD or arrange delivery.`,
    `One-of-one. Once it's gone, it's gone.`
  ];
  return [
    openers[Math.floor(Math.random() * openers.length)],
    middles[Math.floor(Math.random() * middles.length)],
    closers[Math.floor(Math.random() * closers.length)]
  ].join(' ');
}

document.getElementById('saveBtn').addEventListener('click', saveBag);
cancelBtn.addEventListener('click', resetForm);

async function saveBag() {
  const name = nameInput.value.trim();
  const price = parseInt(priceInput.value, 10);
  const desc = descInput.value.trim();
  const reel = reelInput.value.trim();
  const sold = soldInput.checked;

  if (!name) { showToast('Bag name is required.'); return; }
  if (!price || price < 0) { showToast('Enter a valid price.'); return; }

  setSaving(true);
  try {
    let imagePath = null;

    if (stagedImage) {
      showToast('Uploading image…');
      imagePath = await uploadImageToGitHub(stagedImage.base64, stagedImage.ext);
    }

    if (editingId) {
      const bag = bags.find(b => b.id === editingId);
      if (!bag) return;
      bag.name = name;
      bag.description = desc;
      bag.price = price;
      bag.reel = reel;
      bag.sold = sold;
      if (imagePath) bag.image = imagePath;
      await publishData('Update bag: ' + name);
      showToast('Bag updated and live!');
    } else {
      if (!stagedImage) { showToast('Add a bag image.'); setSaving(false); return; }
      const id = 'bag_' + Date.now();
      bags.unshift({ id, name, description: desc, price, reel, sold, image: imagePath });
      await publishData('Add bag: ' + name);
      showToast('Bag added and live!');
    }

    resetForm();
    renderList();
  } catch(err) {
    showToast('Sync failed: ' + err.message);
    console.error(err);
  } finally {
    setSaving(false);
  }
}

function resetForm() {
  editingId = null;
  editingIdField.value = '';
  nameInput.value = '';
  descInput.value = '';
  priceInput.value = '';
  reelInput.value = '';
  soldInput.checked = false;
  imageInput.value = '';
  imagePreview.innerHTML = '';
  stagedImage = null;
  formTitle.textContent = 'Add a new bag';
  cancelBtn.style.display = 'none';
}

function editBag(id) {
  const bag = bags.find(b => b.id === id);
  if (!bag) return;
  editingId = id;
  editingIdField.value = id;
  nameInput.value = bag.name;
  descInput.value = bag.description || '';
  priceInput.value = bag.price;
  reelInput.value = bag.reel || '';
  soldInput.checked = !!bag.sold;
  stagedImage = null;
  imagePreview.innerHTML = `<img src="${bag.image}" style="max-width:200px;border-radius:8px;">`;
  formTitle.textContent = 'Edit bag';
  cancelBtn.style.display = 'inline-block';
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

async function deleteBag(id) {
  if (!confirm('Delete this bag? This cannot be undone.')) return;
  bags = bags.filter(b => b.id !== id);
  try {
    await publishData('Delete bag');
    renderList();
    showToast('Bag deleted and live.');
  } catch(err) {
    showToast('Sync failed: ' + err.message);
  }
}

async function toggleSold(id) {
  const bag = bags.find(b => b.id === id);
  if (!bag) return;
  bag.sold = !bag.sold;
  try {
    await publishData(bag.sold ? 'Mark sold: ' + bag.name : 'Unmark sold: ' + bag.name);
    renderList();
    showToast(bag.sold ? 'Marked as SOLD.' : 'Marked as available.');
  } catch(err) {
    bag.sold = !bag.sold; // revert
    showToast('Sync failed: ' + err.message);
  }
}

// ====== LIST ======
function renderList() {
  const list = document.getElementById('adminList');
  document.getElementById('bagCount').textContent = bags.length;
  list.innerHTML = bags.map(b => `
    <div class="admin-card">
      <img src="${b.image}" alt="${escapeHtml(b.name)}">
      <div class="admin-card-body">
        <div class="admin-card-name">${escapeHtml(b.name)}</div>
        <div class="admin-card-price">Ksh ${Number(b.price).toLocaleString('en-KE')} ${b.sold ? '· <span style="color:#b00020">SOLD</span>' : ''}</div>
        <div class="admin-card-actions">
          <button onclick="editBag('${b.id}')">Edit</button>
          <button class="sold-toggle ${b.sold ? 'on' : ''}" onclick="toggleSold('${b.id}')">${b.sold ? 'Unmark sold' : 'Mark sold'}</button>
          <button class="danger" onclick="deleteBag('${b.id}')">Delete</button>
        </div>
      </div>
    </div>
  `).join('');
}

function escapeHtml(s) {
  return String(s).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
}

// expose to onclick handlers
window.editBag = editBag;
window.deleteBag = deleteBag;
window.toggleSold = toggleSold;

async function init() {
  showToast('Loading bags…');
  await loadData();
  renderList();
}

checkAuth();
