const http = require("http");
const fs = require("fs");
const path = require("path");

const PORT = Number(process.env.PORT || 8080);
const ROOT = __dirname;
const INDEX = path.join(ROOT, "index.html");
const IMAGES = path.join(ROOT, "images");

const MAX_IMAGES = 15;
const SUPPORTED_EXTENSIONS = [".jpg", ".jpeg", ".png", ".webp", ".gif"];

function escapeHtml(value = "") {
  return String(value).replace(/[&<>"']/g, (ch) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#39;"
  })[ch]);
}

function text(name, fallback = "") {
  return escapeHtml(process.env[name] || fallback);
}

function raw(name) {
  return process.env[name] || "";
}

function getCurrentBaseUrl(req) {
  const proto = String(req.headers["x-forwarded-proto"] || "https").split(",")[0].trim();
  const host = String(req.headers["x-forwarded-host"] || req.headers.host || "").split(",")[0].trim();
  return `${proto}://${host}`;
}

function findExistingImage(number) {
  for (const ext of SUPPORTED_EXTENSIONS) {
    const filename = `${number}${ext}`;
    const filePath = path.join(IMAGES, filename);
    if (fs.existsSync(filePath) && fs.statSync(filePath).isFile()) {
      return filename;
    }
  }
  return null;
}

function getAvailableImages() {
  const found = [];
  for (let i = 1; i <= MAX_IMAGES; i++) {
    const filename = findExistingImage(i);
    if (filename) {
      found.push({ number: i, filename });
    }
  }
  return found;
}

function getVideoTitle(number) {
  return text(`VIDEO_${number}_TITLE`, `Featured Video ${String(number).padStart(2, "0")}`);
}

function getVideoViews(number) {
  // Optional manual override from Railway:
  // VIDEO_1_VIEWS=7.8M
  const manual = String(process.env[`VIDEO_${number}_VIEWS`] || "").trim();
  if (manual) return escapeHtml(manual);

  // Stable "random-looking" value from 1.2M to 9.9M.
  // The same card keeps the same view count across refreshes.
  const seed = (number * 73 + 41) % 88; // 0..87
  const value = 1.2 + (seed / 10);
  const clamped = Math.min(value, 9.9);
  return `${clamped.toFixed(1)}M`;
}

function getVideoLabel(index) {
  const labels = ["Featured", "Popular", "New"];
  return labels[index % labels.length];
}

function buildVideoCards(images, smartlink) {
  return images.map((img, index) => {
    const title = getVideoTitle(img.number);
    const views = getVideoViews(img.number);
    const label = getVideoLabel(index);
    const imageUrl = `/images/${encodeURIComponent(img.filename)}`;

    return `
                <div class="col-lg-4 col-md-6">
                    <article class="video-card">
                        <a href="${escapeHtml(smartlink)}" rel="nofollow sponsored">
                            <div class="thumb-wrap">
                                <img src="${imageUrl}" alt="${title}">
                                <div class="play-overlay">
                                    <div class="play-circle">
                                        <i class="fa-solid fa-play"></i>
                                    </div>
                                </div>
                            </div>
                        </a>

                        <div class="card-content">
                            <div class="video-label">${label}</div>

                            <a href="${escapeHtml(smartlink)}" rel="nofollow sponsored">
                                <h3 class="video-title">${title}</h3>
                            </a>

                            <a href="${escapeHtml(smartlink)}"
                               rel="nofollow sponsored"
                               class="video-meta d-block">
                                <i class="fa-regular fa-circle-play"></i> Watch now
                                <span style="margin:0 7px;opacity:.55;">•</span>
                                <i class="fa-regular fa-eye"></i> ${views} views
                            </a>

                            <a href="${escapeHtml(smartlink)}"
                               rel="nofollow sponsored"
                               class="btn-watch">
                                <i class="fa-solid fa-play"></i>
                                ${text("PLAY_BUTTON_TEXT", "Play")}
                            </a>
                        </div>
                    </article>
                </div>`;
  }).join("\n");
}

function renderPage(req, pathname) {
  let html = fs.readFileSync(INDEX, "utf8");

  const smartlink = String(process.env.SMARTLINK_URL || "").trim() || "#";
  const currentUrl = `${getCurrentBaseUrl(req)}${pathname}`;
  const images = getAvailableImages();

  const replacements = {
    SITE_TITLE: text("SITE_TITLE", "Click Here To Watch"),
    SITE_DESCRIPTION: text("SITE_DESCRIPTION", "Discover our latest featured videos. Tap any card to continue."),
    BRAND_NAME: text("BRAND_NAME", "Horny Baby"),
    PAGE_HEADING: text("PAGE_HEADING", "New Cool Video"),

    PREVIEW_TITLE: text("PREVIEW_TITLE", process.env.SITE_TITLE || "Click Here To Watch"),
    PREVIEW_DESCRIPTION: text("PREVIEW_DESCRIPTION", process.env.SITE_DESCRIPTION || "Discover our latest featured videos."),
    CURRENT_URL: escapeHtml(currentUrl),

    SMARTLINK_URL: escapeHtml(smartlink),

    VIDEO_CARDS: buildVideoCards(images, smartlink),
    VIDEO_COUNT_TEXT: `${images.length} featured item${images.length === 1 ? "" : "s"}`,

    PLAY_BUTTON_TEXT: text("PLAY_BUTTON_TEXT", "Play"),

    FOOTER_YEAR: text("FOOTER_YEAR", "2026"),
    FOOTER_NAME: text("FOOTER_NAME", "THIS PERSON IS BRAND"),

    ADSTERRA_POPUNDER_CODE: raw("ADSTERRA_POPUNDER_CODE"),
    ADSTERRA_NATIVE_BANNER_CODE: raw("ADSTERRA_NATIVE_BANNER_CODE"),
    ADSTERRA_SOCIAL_BAR_CODE: raw("ADSTERRA_SOCIAL_BAR_CODE")
  };

  for (const [key, value] of Object.entries(replacements)) {
    html = html.split(`{{${key}}}`).join(value);
  }

  return html;
}

function serveImage(pathname, res) {
  const filename = pathname.replace("/images/", "");
  if (!filename || filename.includes("/") || filename.includes("\\") || filename.includes("..")) {
    return false;
  }

  const filePath = path.join(IMAGES, filename);
  if (!fs.existsSync(filePath) || !fs.statSync(filePath).isFile()) {
    return false;
  }

  const ext = path.extname(filePath).toLowerCase();
  const types = {
    ".jpg": "image/jpeg",
    ".jpeg": "image/jpeg",
    ".png": "image/png",
    ".webp": "image/webp",
    ".gif": "image/gif"
  };

  res.writeHead(200, {
    "Content-Type": types[ext] || "application/octet-stream",
    "Cache-Control": "public, max-age=3600"
  });
  fs.createReadStream(filePath).pipe(res);
  return true;
}

const server = http.createServer((req, res) => {
  const pathname = decodeURIComponent((req.url || "/").split("?")[0]);

  if (pathname === "/health") {
    res.writeHead(200, { "Content-Type": "application/json; charset=utf-8" });
    return res.end(JSON.stringify({
      ok: true,
      images: getAvailableImages().map(x => x.filename)
    }));
  }

  if (pathname.startsWith("/images/")) {
    if (serveImage(pathname, res)) return;
    res.writeHead(404, { "Content-Type": "text/plain; charset=utf-8" });
    return res.end("Image not found");
  }

  if (pathname === "/" || /^\/rev\/[A-Za-z0-9_-]+\/?$/.test(pathname)) {
    res.writeHead(200, {
      "Content-Type": "text/html; charset=utf-8",
      "Cache-Control": "no-store"
    });
    return res.end(renderPage(req, pathname));
  }

  res.writeHead(404, { "Content-Type": "text/plain; charset=utf-8" });
  res.end("Not found");
});

server.listen(PORT, "0.0.0.0", () => {
  console.log(`Landing page running on port ${PORT}`);
  console.log("Detected images:", getAvailableImages().map(x => x.filename).join(", ") || "none");
});
