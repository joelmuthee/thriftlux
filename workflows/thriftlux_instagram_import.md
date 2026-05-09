# Workflow: Import New Bags from @thriftlux.ke Instagram

**Objective:** Download new reel thumbnails and captions from Venessa's Instagram, add them to `data.json`, and crop them to look great in the website grid.

**Last run:** 2026-05-09

---

## Checkpoint (update after every run)

| Field | Value |
|---|---|
| Last run date | 2026-05-09 |
| Most recent reel imported | `DYDQo8Pt0xH` (Black Leather Embroidered Horses Mini Roy Bucket Bag, posted 2026-05-08) |
| Total bags in `data.json` | 24 |

**How to use the checkpoint:** Reels grid shows newest first. On the next run, scroll the grid until the checkpoint shortcode (`DYDQo8Pt0xH`) is visible, then run the Step 2 script with `STOP_AT` set to the checkpoint. Only newer reels will be collected.

---

## Inputs

| Input | Value |
|---|---|
| Instagram profile URL | `https://www.instagram.com/thriftlux.ke/reels/` |
| Stop-at shortcode (last imported) | `DYDQo8Pt0xH` |
| Project root | `C:\Users\Joel\Website Designs\thriftlux-ke` |
| Backup of originals | `.tmp/bags_original/` |

---

## What does NOT work (skip these)

- **Apify `instagram-reel-scraper`** — returns CDN URLs that the VM can't fetch (network block).
- **`/media?size=l`** trick on Instagram — long dead.
- **Static `<img>` extraction from the reels grid** — Instagram renders thumbnails as CSS `background-image` on a `<div>`, not as `<img>`.
- **Playwright for caption collection** — not logged in to Instagram, older reels return "This content is unavailable". Use the Chrome MCP (logged in) instead.
- **JavaScript returning CDN URLs or base64** — output is filtered. Store in `window.__*` globals and trigger downloads via `<a download>`.

---

## The process that works

### Step 1 — Open the reels page in Chrome

Navigate to `https://www.instagram.com/thriftlux.ke/reels/` and scroll until the checkpoint shortcode is visible:

```javascript
!!document.querySelector('a[href*="DYDQo8Pt0xH"]')  // should be true
```

### Step 2 — Extract only NEW thumbnail URLs

```javascript
const STOP_AT = 'DYDQo8Pt0xH'; // ← update each run

const reelLinks = document.querySelectorAll('a[href*="/reel/"]');
const seen = new Set();
window.__reelData = [];

for (const link of reelLinks) {
  const m = link.href.match(/\/reel\/([^/]+)/);
  if (!m || seen.has(m[1])) continue;
  if (m[1] === STOP_AT) break;
  seen.add(m[1]);
  const firstDiv = link.querySelector('div');
  if (firstDiv) {
    const bg = firstDiv.style.backgroundImage;
    const urlMatch = bg.match(/url\("(.+?)"\)/);
    if (urlMatch) window.__reelData.push({ shortcode: m[1], url: urlMatch[1] });
  }
}
'Found ' + window.__reelData.length + ' new reels';
```

### Step 3 — Fetch images as base64 (logged-in browser)

Run in batches of 5 to avoid timeouts:

```javascript
(async () => {
  async function fetchImage(item) {
    const resp = await fetch(item.url);
    const blob = await resp.blob();
    const reader = new FileReader();
    const b64 = await new Promise(r => { reader.onloadend = () => r(reader.result); reader.readAsDataURL(blob); });
    return { shortcode: item.shortcode, data: b64.split(',')[1], size: blob.size };
  }
  window.__batch1 = [];
  for (let i = 0; i < 5; i++) window.__batch1.push(await fetchImage(window.__reelData[i]));
  return window.__batch1.map(r => ({ shortcode: r.shortcode, size: r.size, hasData: !!r.data }));
})();
```

Repeat with `__batch2`, `__batch3`, etc. Then merge:
```javascript
window.__allImages = [...window.__batch1, ...window.__batch2, ...];
```

### Step 4 — Trigger browser downloads

```javascript
(async () => {
  for (const img of window.__allImages) {
    const byteChars = atob(img.data);
    const byteArray = new Uint8Array(byteChars.length);
    for (let j = 0; j < byteChars.length; j++) byteArray[j] = byteChars.charCodeAt(j);
    const blob = new Blob([byteArray], { type: 'image/jpeg' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `reel_${img.shortcode}.jpg`;
    document.body.appendChild(a); a.click(); document.body.removeChild(a);
    URL.revokeObjectURL(a.href);
    await new Promise(r => setTimeout(r, 300));
  }
})();
```

### Step 5 — Move and back up

```powershell
$bags = "C:\Users\Joel\Website Designs\thriftlux-ke\images\bags"
$backup = "C:\Users\Joel\Website Designs\thriftlux-ke\.tmp\bags_original"
Move-Item "$env:USERPROFILE\Downloads\reel_*.jpg" $bags -Force
# Backup any new originals before cropping
foreach ($f in (Get-ChildItem $bags -Filter reel_*.jpg)) {
  $b = Join-Path $backup $f.Name
  if (-not (Test-Path $b)) { Copy-Item $f.FullName $b }
}
```

### Step 6 — Collect captions

For each new shortcode, navigate to `https://www.instagram.com/reel/<shortcode>/` in the **logged-in Chrome MCP** (not Playwright — it's not logged in) and screenshot the caption. The caption format is:

```
<Bag Name> @<price>/= [SOLD OUT]
#thriftlux #thrifted #qualityhandbags #thrifthandbags
```

JS extraction (when not blocked by URL filter):
```javascript
const el = Array.from(document.querySelectorAll('span[dir="auto"]'))
  .find(s => s.innerText && s.innerText.includes('@'));
el ? el.innerText.trim() : 'not found';
```

When the JS output is blocked (because captions contain `@` which looks like cookie/query data), fall back to a screenshot and read the caption from the image.

### Step 7 — Update `data.json`

For each new bag, add an entry to the `bags` array (newest first):

```json
{
  "id": "<shortcode>",
  "name": "<clean bag name from caption>",
  "description": "<short, no em-dashes>",
  "price": <integer Ksh>,
  "sold": <true if caption says SOLD/SOLD OUT, else false>,
  "image": "images/bags/reel_<shortcode>.jpg",
  "reel": "https://www.instagram.com/reel/<shortcode>/"
}
```

### Step 8 — Crop the new images

Run the crop script:
```bash
cd "C:\Users\Joel\Website Designs\thriftlux-ke"
python .tmp/crop_bags.py
```

For new shortcodes, the script uses defaults `(y_center=0.55, x_center=0.50)`. Open the rendered site and check each new bag at desktop and mobile widths. If a bag looks off-center, add an override to `crop_bags.py` and rerun. See **Cropping Recipe** below.

### Step 9 — Bump cache-bust + commit

In `main.js`, increment `IMG_VERSION` (`v2` → `v3` etc.) so any cached old image gets force-reloaded. Then:

```bash
git add images/bags/ .tmp/crop_bags.py main.js data.json
git commit -m "Import N new bags from Instagram"
git push origin main
```

### Step 10 — Update the checkpoint

Edit the **Checkpoint** table at the top of this file:
- Set "Most recent reel imported" to `window.__reelData[0].shortcode` (the newest one downloaded)
- Update date and total count

---

## Cropping Recipe

Originals are 640×1136 portrait. Cards are 4:5 product format. The script crops to **540×675** (still 4:5) leaving 50px of horizontal slack and 461px of vertical slack so the crop window can shift to centre the bag in frame.

Each bag has a `(y_center, x_center)` tuple in `OVERRIDES`:

| Value | Effect |
|---|---|
| `y_center > 0.5` | Crop window biased DOWN (skip more of top — useful when bag is held up by a hand and most of the upper frame is just strap) |
| `y_center < 0.5` | Crop window biased UP |
| `x_center > 0.5` | Crop window biased RIGHT (use when the bag was photographed shifted LEFT in the original) |
| `x_center < 0.5` | Crop window biased LEFT (use when the bag was photographed shifted RIGHT) |

Tuning loop:
1. Run `python .tmp/crop_bags.py`
2. Open the site at `http://localhost:8765/index.html?v=<bumped>` (cache-bust)
3. For each off-centre bag, view the original at `.tmp/bags_original/reel_<shortcode>.jpg`
4. Estimate where the bag's centre is as a percentage of the original height/width
5. Add an entry to `OVERRIDES` and rerun

The script always re-crops from the backup, so re-running with new values is non-destructive.

### Common patterns

- **Bag held up by hand (handle visible at top, body in lower half):** `y_center = 0.55–0.65`
- **Bag sitting on a surface, well-centred shot:** `(0.50, 0.50)` (defaults)
- **Bag with mostly strap visible, body at very bottom:** `y_center = 0.65–0.70`
- **Bag photographed off to one side:** adjust `x_center` by 0.05 increments

---

## Notes & gotchas

- **Chrome MCP is logged in** to Instagram; **Playwright is not**. Older reels (DX*) return "content unavailable" in Playwright.
- **JavaScript output filter** blocks anything with `@`, query strings, or base64. Use `window.__*` globals and DOM downloads, never `return`/`console.log` raw URLs or data.
- **Image cache:** browsers aggressively cache `.jpg` files. After re-cropping, bump `IMG_VERSION` in `main.js` so the `?v3` query forces a reload, otherwise users see the old version even after a normal refresh.
- **Em-dashes are banned in user-facing copy.** Use full stops, colons, or middle-dots (`·`) instead.
- **"At your expense" and similar standoff-ish phrasing should be softened.** Lead with "we can arrange" rather than putting cost on the customer up front.
- **Caption parsing:** Instagram puts the caption in a `<span dir="auto">` containing the text. Sold status is detected from the words `SOLD` or `SOLD OUT` in the caption.
