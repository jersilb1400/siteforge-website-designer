// Development-only HTML fixture: a realistic small-business page used to verify
// the ingestion pipeline (render -> extract -> R2 -> source_content) locally in
// `wrangler dev`. Contains the signals the extractor looks for: OG/meta tags,
// theme color, headings, contact details, social links, and images.

export const SAMPLE_BUSINESS_HTML = `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <title>Maplewood Family Dental — Gentle Care in Rivertown</title>
  <meta name="description" content="Maplewood Family Dental offers gentle, modern dentistry for the whole family in Rivertown. New patients welcome." />
  <meta name="theme-color" content="#0f766e" />
  <meta property="og:title" content="Maplewood Family Dental" />
  <meta property="og:description" content="Gentle, modern dentistry for the whole family." />
  <meta property="og:image" content="/images/office.jpg" />
  <style>
    :root { --brand: #0f766e; --accent: #f59e0b; }
    body { color: #1f2937; background: #ffffff; }
    .cta { background: #0f766e; color: #fff; }
    .badge { background: #f59e0b; }
  </style>
</head>
<body style="font-family: system-ui;">
  <header>
    <h1>Maplewood Family Dental</h1>
    <p>Gentle care for every generation of your family.</p>
  </header>
  <main>
    <section>
      <h2>Welcome to Maplewood</h2>
      <p>For over fifteen years, Maplewood Family Dental has served Rivertown with gentle,
         modern dentistry. From routine cleanings to same-day crowns, our team makes every
         visit comfortable. New patients are always welcome.</p>
    </section>
    <section>
      <h2>Visit Us</h2>
      <address>
        <p>221 Maplewood Avenue, Rivertown, OH 44001</p>
        <p>Call us: (555) 314-2700</p>
        <p>Email: <a href="mailto:hello@maplewooddental.example">hello@maplewooddental.example</a></p>
      </address>
      <p>Hours: Mon-Thu 8am-5pm, Fri 8am-1pm</p>
    </section>
    <section>
      <h2>Our Office</h2>
      <img src="/__fixtures/img/office.png" alt="Maplewood Family Dental reception area" />
      <img src="/__fixtures/img/team.png" alt="The Maplewood dental team" />
      <img src="/__fixtures/img/chair.png" alt="A modern treatment room" />
    </section>
  </main>
  <footer>
    <a href="https://facebook.com/maplewooddental">Facebook</a>
    <a href="https://instagram.com/maplewooddental">Instagram</a>
    <a href="https://g.page/maplewood-dental">Google</a>
  </footer>
</body>
</html>`;
