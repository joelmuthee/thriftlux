# Client provisioning

## `new-client.sh`

Spin up a new WhatsApp catalog site (clone of ThriftLux) in ~30 seconds.

### Usage

From the root of the `thriftlux-ke` repo (which is your template):

```bash
./tools/new-client.sh <slug> <whatsapp_no_plus> "<Business Name>"
```

**Example:**

```bash
./tools/new-client.sh mamambogabakery 254712345678 "Mama Mboga Bakery"
```

### What it does

1. Copies this entire repo into a sibling directory (`../mamambogabakery/`)
2. Strips ThriftLux's bags, history, and CNAME
3. Generates a fresh admin password and admin token
4. Creates a brand-new Cloudflare Worker named `<slug>-api`
5. Creates a brand-new KV namespace
6. Sets the admin token as a Worker secret (never in source code)
7. Deploys the Worker
8. Rewrites `admin.js` / `main.js` / `index.html` with the new values
9. Seeds the Worker's KV with an empty catalog
10. Initialises a fresh git repo

### What you still do manually

1. Push to GitHub (`gh repo create` or manual)
2. Enable GitHub Pages in repo settings
3. (Optional) Point a custom domain
4. Replace the logo / favicon
5. Send the admin URL + password to the client

### Pre-requisites

You only need to set these up **once on your machine**:

- Node.js + npx
- Python 3
- `curl`, `git`, `bash`
- `npx wrangler login` (authenticates with Cloudflare)
- `gh auth login` (optional — for repo creation)

### Pricing model

Cloudflare Worker free tier = 100k requests/day. A small Nairobi business catalog won't come close. So infra cost per client is ~Ksh 0/month.

The only ongoing cost is the domain (~Ksh 1500/year for `.co.ke`, free if you use the GitHub Pages subdomain).

Charge whatever the market bears — Ksh 15-25k setup is reasonable.
