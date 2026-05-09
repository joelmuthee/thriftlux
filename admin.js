// ThriftLux Admin
const ADMIN_PASSWORD = 'thriftlux2026';
const API_BASE = 'https://thriftlux-api.stawisystems.workers.dev';
const ADMIN_TOKEN = atob('TGRCVjlCUEJzNTBrWXBzQjdNWUs1eDlUR1ZNNlh3bE5VUEMzTVRzN3BpUQ==');

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

// ====== API ======
async function apiUploadImage(base64, ext) {
  const res = await fetch(`${API_BASE}/api/image`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${ADMIN_TOKEN}` },
    body: JSON.stringify({ base64, ext }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || `Upload failed: ${res.status}`);
  }
  const data = await res.json();
  return `${API_BASE}${data.path}`;
}

async function apiPublish() {
  const res = await fetch(`${API_BASE}/api/bulk`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${ADMIN_TOKEN}` },
    body: JSON.stringify({ bags, settings }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || `Save failed: ${res.status}`);
  }
}

async function loadData() {
  const res = await fetch(`${API_BASE}/api/bags?_=${Date.now()}`);
  const json = await res.json();
  bags = json.bags || [];
  settings = json.settings || {};
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
      imagePath = await apiUploadImage(stagedImage.base64, stagedImage.ext);
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
      await apiPublish();
      showToast('Bag updated and live!');
    } else {
      if (!stagedImage) { showToast('Add a bag image.'); setSaving(false); return; }
      const id = 'bag_' + Date.now();
      bags.unshift({ id, name, description: desc, price, reel, sold, image: imagePath });
      await apiPublish();
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
    await apiPublish();
    renderList();
    showToast('Bag deleted and live.');
  } catch(err) {
    showToast('Sync failed: ' + err.message);
  }
}

async function toggleSold(id) {
  const bag = bags.find(b => b.id === id);
  if (!bag) return;

  // Unmarking sold — no buyer prompt
  if (bag.sold) {
    bag.sold = false;
    delete bag.soldTo;
    try {
      await apiPublish();
      renderList();
      showToast('Marked as available.');
    } catch(err) {
      bag.sold = true;
      showToast('Sync failed: ' + err.message);
    }
    return;
  }

  // Marking sold — open buyer capture modal
  openBuyerModal(bag);
}

// ====== BUYER CAPTURE MODAL ======
// Submits straight to the public GHL form endpoint — no paid Inbound Webhook needed.
// Form: ThriftLux - Buyer Capture (BWrG36c6p56ATDThPdN7)
const GHL_FORM_ID = 'BWrG36c6p56ATDThPdN7';
const GHL_LOCATION_ID = 'aTZHRdo8ius6WBzGQ5GD';
const GHL_SUBMIT_URL = 'https://backend.leadconnectorhq.com/forms/submit';

const buyerModal = document.getElementById('buyerModal');
const buyerName = document.getElementById('buyerName');
const buyerPhone = document.getElementById('buyerPhone');
const buyerNotes = document.getElementById('buyerNotes');
let pendingBag = null;

function openBuyerModal(bag) {
  pendingBag = bag;
  buyerName.value = '';
  buyerPhone.value = '';
  buyerNotes.value = '';
  document.getElementById('buyerModalTitle').textContent = `Mark as sold: ${bag.name}`;
  buyerModal.style.display = 'flex';
  buyerName.focus();
}

function closeBuyerModal() {
  buyerModal.style.display = 'none';
  pendingBag = null;
}

async function commitSold(withBuyer) {
  if (!pendingBag) return;
  const bag = pendingBag;
  bag.sold = true;
  if (withBuyer) {
    const name = buyerName.value.trim();
    const phone = buyerPhone.value.trim().replace(/[^0-9+]/g, '');
    const notes = buyerNotes.value.trim();
    if (!name && !phone) {
      showToast('Add a name or phone, or hit Skip.');
      return;
    }
    bag.soldTo = {
      name,
      phone,
      notes,
      soldAt: new Date().toISOString(),
    };
  }

  closeBuyerModal();
  try {
    await apiPublish();
    renderList();
    showToast(withBuyer ? 'SOLD. Buyer saved.' : 'Marked as SOLD.');
    if (withBuyer) sendBuyerToGHL(bag);
  } catch(err) {
    bag.sold = false;
    delete bag.soldTo;
    showToast('Sync failed: ' + err.message);
  }
}

async function sendBuyerToGHL(bag) {
  try {
    const fd = new FormData();
    fd.append('formData', JSON.stringify({
      first_name: bag.soldTo.name,
      phone: bag.soldTo.phone,
      multi_line_280v: [
        bag.soldTo.notes,
        `Bag: ${bag.name} (Ksh ${bag.price})`,
      ].filter(Boolean).join(' | '),
    }));
    fd.append('locationId', GHL_LOCATION_ID);
    fd.append('formId', GHL_FORM_ID);
    fd.append('eventData', JSON.stringify({
      source: 'thriftlux-admin',
      type: 'page-visit',
      domain: location.hostname,
    }));
    await fetch(GHL_SUBMIT_URL, { method: 'POST', body: fd });
  } catch(err) {
    console.warn('GHL submit failed (non-blocking):', err);
  }
}

document.getElementById('buyerSaveBtn').addEventListener('click', () => commitSold(true));
document.getElementById('buyerSkipBtn').addEventListener('click', () => commitSold(false));
document.getElementById('buyerCancelBtn').addEventListener('click', closeBuyerModal);
buyerModal.addEventListener('click', e => { if (e.target === buyerModal) closeBuyerModal(); });

// ====== LIST ======
function renderList() {
  const list = document.getElementById('adminList');
  document.getElementById('bagCount').textContent = bags.length;
  list.innerHTML = bags.map(b => {
    const buyer = b.soldTo
      ? `<div style="font-size:12px;color:#666;margin-top:4px;">Sold to ${escapeHtml(b.soldTo.name || 'unknown')}${b.soldTo.phone ? ' · ' + escapeHtml(b.soldTo.phone) : ''}</div>`
      : '';
    return `
    <div class="admin-card">
      <img src="${b.image}" alt="${escapeHtml(b.name)}">
      <div class="admin-card-body">
        <div class="admin-card-name">${escapeHtml(b.name)}</div>
        <div class="admin-card-price">Ksh ${Number(b.price).toLocaleString('en-KE')} ${b.sold ? '· <span style="color:#b00020">SOLD</span>' : ''}</div>
        ${buyer}
        <div class="admin-card-actions">
          <button onclick="editBag('${b.id}')">Edit</button>
          <button class="sold-toggle ${b.sold ? 'on' : ''}" onclick="toggleSold('${b.id}')">${b.sold ? 'Unmark sold' : 'Mark sold'}</button>
          <button class="danger" onclick="deleteBag('${b.id}')">Delete</button>
        </div>
      </div>
    </div>
  `;}).join('');
}

function escapeHtml(s) {
  return String(s).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
}

window.editBag = editBag;
window.deleteBag = deleteBag;
window.toggleSold = toggleSold;

async function init() {
  showToast('Loading bags…');
  await loadData();
  renderList();
}

checkAuth();
