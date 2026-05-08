// ThriftLux Admin
// Change ADMIN_PASSWORD before deploying.
const ADMIN_PASSWORD = 'thriftlux2026';
const STORAGE_KEY = 'thriftlux_data';

let bags = [];
let settings = {};
let editingId = null;
let stagedImage = null; // base64 data url

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

// ====== DATA ======
async function loadData() {
  const local = localStorage.getItem(STORAGE_KEY);
  if (local) {
    try {
      const parsed = JSON.parse(local);
      bags = parsed.bags || [];
      settings = parsed.settings || {};
      return;
    } catch(e) {}
  }
  const res = await fetch('data.json');
  const json = await res.json();
  bags = json.bags || [];
  settings = json.settings || {};
  saveData();
}

function saveData() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify({ bags, settings }));
}

// ====== TOAST ======
const toast = document.getElementById('toast');
function showToast(msg) {
  toast.textContent = msg;
  toast.classList.add('show');
  setTimeout(() => toast.classList.remove('show'), 2400);
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
  const reader = new FileReader();
  reader.onload = () => {
    stagedImage = reader.result;
    imagePreview.innerHTML = `<img src="${stagedImage}" style="max-width:200px;border-radius:8px;">`;
  };
  reader.readAsDataURL(file);
});

document.getElementById('aiBtn').addEventListener('click', () => {
  const name = nameInput.value.trim();
  if (!name) { showToast('Type the bag name first.'); return; }
  descInput.value = generateDescription(name);
});

// Offline template-based description generator
function generateDescription(name) {
  const lower = name.toLowerCase();
  const phrases = [];
  // Color
  const colors = { 'black':'sleek black', 'white':'crisp white', 'beige':'warm beige', 'brown':'rich brown', 'caramel':'warm caramel', 'grey':'soft grey', 'gray':'soft grey', 'blue':'deep blue', 'denim':'denim blue', 'green':'rich green', 'cream':'soft cream' };
  let color = '';
  for (const c in colors) if (lower.includes(c)) { color = colors[c]; break; }
  // Material
  const mats = ['leather','suede','patent','canvas','denim','vegan leather'];
  let mat = mats.find(m => lower.includes(m)) || 'leather';
  // Style
  const styles = ['crossbody','shoulder','tote','clutch','hobo','bucket','baguette','top handle','sling','chain'];
  let style = styles.find(s => lower.includes(s)) || 'handbag';
  // Build
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
  return [openers[Math.floor(Math.random()*openers.length)], middles[Math.floor(Math.random()*middles.length)], closers[Math.floor(Math.random()*closers.length)]].join(' ');
}

document.getElementById('saveBtn').addEventListener('click', saveBag);
cancelBtn.addEventListener('click', resetForm);

function saveBag() {
  const name = nameInput.value.trim();
  const price = parseInt(priceInput.value, 10);
  const desc = descInput.value.trim();
  const reel = reelInput.value.trim();
  const sold = soldInput.checked;

  if (!name) { showToast('Bag name is required.'); return; }
  if (!price || price < 0) { showToast('Enter a valid price.'); return; }

  if (editingId) {
    const bag = bags.find(b => b.id === editingId);
    if (!bag) return;
    bag.name = name;
    bag.description = desc;
    bag.price = price;
    bag.reel = reel;
    bag.sold = sold;
    if (stagedImage) bag.image = stagedImage;
    showToast('Bag updated.');
  } else {
    if (!stagedImage) { showToast('Add a bag image.'); return; }
    const id = 'bag_' + Date.now();
    bags.unshift({ id, name, description: desc, price, reel, sold, image: stagedImage });
    showToast('Bag added.');
  }
  saveData();
  resetForm();
  renderList();
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

function deleteBag(id) {
  if (!confirm('Delete this bag? This cannot be undone.')) return;
  bags = bags.filter(b => b.id !== id);
  saveData();
  renderList();
  showToast('Bag deleted.');
}

function toggleSold(id) {
  const bag = bags.find(b => b.id === id);
  if (!bag) return;
  bag.sold = !bag.sold;
  saveData();
  renderList();
  showToast(bag.sold ? 'Marked as SOLD.' : 'Marked as available.');
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

// ====== EXPORT / IMPORT ======
document.getElementById('exportBtn').addEventListener('click', () => {
  const blob = new Blob([JSON.stringify({ bags, settings }, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = 'data.json';
  a.click();
  URL.revokeObjectURL(url);
  showToast('Exported. Replace data.json on your site.');
});

document.getElementById('importBtn').addEventListener('click', () => document.getElementById('importFile').click());
document.getElementById('importFile').addEventListener('change', e => {
  const file = e.target.files[0]; if (!file) return;
  const reader = new FileReader();
  reader.onload = () => {
    try {
      const json = JSON.parse(reader.result);
      bags = json.bags || []; settings = json.settings || {};
      saveData(); renderList(); showToast('Imported.');
    } catch(e) { showToast('Invalid JSON.'); }
  };
  reader.readAsText(file);
});

document.getElementById('resetBtn').addEventListener('click', async () => {
  if (!confirm('Reset to data.json? Your unsaved changes will be lost.')) return;
  localStorage.removeItem(STORAGE_KEY);
  await loadData();
  renderList();
  showToast('Reset.');
});

// expose to onclick
window.editBag = editBag;
window.deleteBag = deleteBag;
window.toggleSold = toggleSold;

async function init() {
  await loadData();
  renderList();
}

checkAuth();
