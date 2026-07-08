# Mission

SiteForge is an AI-powered website design and creation app that produces modern,
clean, professional HTML-based websites. It gathers what it needs through a guided
client interview, enriches that with data pulled from the client's existing web
presence (current website, Facebook page, Google Business Profile), then generates,
previews, and deploys a finished static site — all on Cloudflare infrastructure.

The whole product runs on one Cloudflare account for a single operator (Jeremy) in
v1. The operator onboards a client, hands them an interview link, reviews ingested
content, and ships a site. Multi-tenant operation is a later phase.

## Who it serves

- **Small businesses** — restaurants/cafes, professional services, health &
  wellness, home & trade services, retail shops.
- **Churches and ministries** — the interview and page defaults treat this as a
  first-class category (beliefs, ministries, give, visit).
- **Nonprofits** — mission, programs, impact, donate.
- **Personal brands / portfolios** — the lightest configuration.

These are people who need a real, fast, accessible website and do not have a web
team. The interview is written in their language, not a developer's.

## v1 success criteria

Concrete, measurable bars this version must hit:

1. **Under 30 minutes of client time** from the first interview question to a
   deployed preview site.
2. **Lighthouse 90+** on every generated site across Performance, Accessibility,
   Best Practices, and SEO. (Also: WCAG 2.1 AA, semantic HTML5, mobile-first,
   OpenGraph + JSON-LD, no heavy JS frameworks in client output.)
3. **Ingestion that actually works** — correctly extracts business name, contact
   info, hours, and at least 5 usable images from a typical existing site.
4. **Infrastructure under $10/month** at hobby scale, excluding Anthropic API
   usage. (This drives the Cloudflare-only stack and the cheap/smart model split.)
5. **One-command rebuild** — Jeremy can rebuild and redeploy any client site from
   stored state with a single command. Every generation input is persisted
   (`builds.spec_json`) so builds are reproducible.

## Non-negotiables

- Generated sites are semantic HTML5 + Tailwind + vanilla JS. No heavy client
  frameworks. Fast, dependency-light, accessible, SEO-ready.
- No lorem ipsum ever reaches a preview — every section gets real content.
- Scraped/ingested content is **always client-reviewed before publication**.
  Never scrape behind logins; respect robots.txt for third-party sites. This is a
  copyright and accuracy gate, enforced in the data model
  (`source_content.review_status`).
- Secrets live only in Wrangler secrets — never in code, committed env files, or docs.
- Escalate to Jeremy for any paid signup, spend beyond the Workers Paid plan
  (~$5/mo) + Anthropic usage, Facebook Graph app registration, or domain purchases.
