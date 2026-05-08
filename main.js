// ThriftLux frontend gallery
(async function() {
  const gallery = document.getElementById('gallery');
  const filterMeta = document.getElementById('filterMeta');
  let bags = [];
  let settings = {};
  let currentFilter = 'all';

  // Load data: prefer localStorage (admin edits) else data.json
  async function loadData() {
    const local = localStorage.getItem('thriftlux_data');
    if (local) {
      try {
        const parsed = JSON.parse(local);
        bags = parsed.bags || [];
        settings = parsed.settings || {};
        return;
      } catch(e) { console.warn('localStorage parse failed', e); }
    }
    try {
      const res = await fetch('data.json');
      const json = await res.json();
      bags = json.bags || [];
      settings = json.settings || {};
    } catch(e) {
      console.error('Failed to load data.json', e);
      bags = [];
    }
  }

  function fmtPrice(n) {
    return 'Ksh ' + Number(n).toLocaleString('en-KE');
  }

  function whatsappLink(bag) {
    const phone = (settings.whatsappNumber || '254705044940');
    const msg = `Hi Venessa! I'd like to enquire about the *${bag.name}* (Ksh ${bag.price}) on ThriftLux.\n\nLink: ${bag.reel}`;
    return `https://wa.me/${phone}?text=${encodeURIComponent(msg)}`;
  }

  function render() {
    const filtered = bags.filter(b => {
      if (currentFilter === 'all') return true;
      if (currentFilter === 'sold') return b.sold;
      if (currentFilter === 'available') return !b.sold;
      return true;
    });

    filterMeta.textContent = `${filtered.length} ${filtered.length === 1 ? 'bag' : 'bags'} · ${bags.filter(b => !b.sold).length} available`;

    gallery.innerHTML = filtered.map(bag => `
      <article class="card ${bag.sold ? 'sold' : ''}">
        <div class="card-img-wrap" data-action="zoom" data-id="${bag.id}">
          <img class="card-img" src="${bag.image}" alt="${escapeHtml(bag.name)}" loading="lazy">
          ${bag.sold ? '<span class="badge-sold">Sold</span>' : ''}
        </div>
        <div class="card-body">
          <h3 class="card-title">${escapeHtml(bag.name)}</h3>
          <p class="card-desc">${escapeHtml(bag.description || '')}</p>
          <div class="card-price-row">
            <span class="card-price">${fmtPrice(bag.price)} <small>· drop-off CBD</small></span>
          </div>
          <div class="card-actions">
            <a class="btn-card" href="${bag.reel}" target="_blank" rel="noopener">360° View</a>
            <a class="btn-card primary" href="${whatsappLink(bag)}" target="_blank" rel="noopener" ${bag.sold ? 'aria-disabled="true"' : ''}>
              ${bag.sold ? 'Sold out' : 'Enquire'}
            </a>
          </div>
        </div>
      </article>
    `).join('');
  }

  function escapeHtml(s) {
    return String(s).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  }

  // Filter pills
  document.querySelectorAll('.pill').forEach(p => {
    p.addEventListener('click', () => {
      document.querySelectorAll('.pill').forEach(x => x.classList.remove('active'));
      p.classList.add('active');
      currentFilter = p.dataset.filter;
      render();
    });
  });

  // Lightbox
  const lightbox = document.getElementById('lightbox');
  const lightboxImg = document.getElementById('lightboxImg');
  const lightboxCap = document.getElementById('lightboxCaption');
  const lightboxClose = document.getElementById('lightboxClose');

  gallery.addEventListener('click', e => {
    const wrap = e.target.closest('[data-action="zoom"]');
    if (!wrap) return;
    const id = wrap.dataset.id;
    const bag = bags.find(b => b.id === id);
    if (!bag) return;
    lightboxImg.src = bag.image;
    lightboxImg.alt = bag.name;
    lightboxCap.textContent = `${bag.name} · ${fmtPrice(bag.price)}${bag.sold ? ' · SOLD' : ''}`;
    lightbox.classList.add('open');
    lightbox.setAttribute('aria-hidden', 'false');
  });
  function closeLightbox() {
    lightbox.classList.remove('open');
    lightbox.setAttribute('aria-hidden', 'true');
  }
  lightboxClose.addEventListener('click', closeLightbox);
  lightbox.addEventListener('click', e => { if (e.target === lightbox) closeLightbox(); });
  document.addEventListener('keydown', e => { if (e.key === 'Escape') closeLightbox(); });

  // Mobile nav
  const navToggle = document.getElementById('navToggle');
  const navLinks = document.getElementById('navLinks');
  navToggle?.addEventListener('click', () => navLinks.classList.toggle('open'));
  navLinks?.querySelectorAll('a').forEach(a => a.addEventListener('click', () => navLinks.classList.remove('open')));

  // Year
  document.getElementById('year').textContent = new Date().getFullYear();

  await loadData();
  render();
})();
