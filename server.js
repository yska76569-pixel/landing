const http = require("http");
const fs = require("fs");
const path = require("path");

const PORT = Number(process.env.PORT || 8080);
const ROOT = __dirname;
const INDEX = path.join(ROOT, "index.html");
const IMAGES = path.join(ROOT, "images");

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

function url(name, fallback = "#") {
  const value = String(process.env[name] || fallback).trim();
  return escapeHtml(value || fallback);
}

function raw(name) {
  return process.env[name] || "";
}

function renderPage() {
  let html = fs.readFileSync(INDEX, "utf8");

  const smartlink = String(process.env.SMARTLINK_URL || "").trim() || "#";

  const replacements = {
    SITE_TITLE: text("SITE_TITLE", "Click Here To Watch"),
    SITE_DESCRIPTION: text("SITE_DESCRIPTION", "Discover our latest featured videos. Tap any card to continue."),
    BRAND_NAME: text("BRAND_NAME", "Horny Baby"),
    PAGE_HEADING: text("PAGE_HEADING", "New Cool Video"),

    VIDEO_1_TITLE: text("VIDEO_1_TITLE", "Featured Video 01"),
    VIDEO_2_TITLE: text("VIDEO_2_TITLE", "Featured Video 02"),
    VIDEO_3_TITLE: text("VIDEO_3_TITLE", "Featured Video 03"),

    PLAY_1_URL: escapeHtml(String(process.env.PLAY_1_URL || "").trim() || smartlink),
    PLAY_2_URL: escapeHtml(String(process.env.PLAY_2_URL || "").trim() || smartlink),
    PLAY_3_URL: escapeHtml(String(process.env.PLAY_3_URL || "").trim() || smartlink),
    PLAY_BUTTON_TEXT: text("PLAY_BUTTON_TEXT", "Play"),

    HOME_URL: url("HOME_URL", "#"),
    ABOUT_URL: url("ABOUT_URL", "#"),
    SERVICES_URL: url("SERVICES_URL", "#"),
    CONTACT_URL: url("CONTACT_URL", "#"),

    FOOTER_YEAR: text("FOOTER_YEAR", "2026"),
    FOOTER_NAME: text("FOOTER_NAME", "THIS PERSON IS BRAND"),
    FOOTER_URL: url("FOOTER_URL", "#"),

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
    ".gif": "image/gif",
    ".svg": "image/svg+xml"
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
    return res.end(JSON.stringify({ ok: true }));
  }

  if (pathname.startsWith("/images/")) {
    if (serveImage(pathname, res)) return;
    res.writeHead(404, { "Content-Type": "text/plain; charset=utf-8" });
    return res.end("Image not found");
  }

  if (pathname === "/" || pathname.startsWith("/rev/")) {
    res.writeHead(200, {
      "Content-Type": "text/html; charset=utf-8",
      "Cache-Control": "no-store"
    });
    return res.end(renderPage());
  }

  res.writeHead(404, { "Content-Type": "text/plain; charset=utf-8" });
  res.end("Not found");
});

server.listen(PORT, "0.0.0.0", () => {
  console.log(`Landing page running on port ${PORT}`);
});
