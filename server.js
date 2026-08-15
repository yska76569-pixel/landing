const http = require("http");
const fs = require("fs");
const path = require("path");

const PORT = Number(process.env.PORT || 8080);
const indexPath = path.join(__dirname, "index.html");

function escapeHtml(value = "") {
  return String(value).replace(/[&<>"']/g, (ch) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#39;"
  })[ch]);
}

function safeText(name, fallback = "") {
  return escapeHtml(process.env[name] || fallback);
}

function safeUrl(name, fallback = "#") {
  const value = String(process.env[name] || fallback).trim();
  return escapeHtml(value || fallback);
}

function raw(name) {
  return process.env[name] || "";
}

function renderIndex() {
  let html = fs.readFileSync(indexPath, "utf8");

  const smartlink = String(process.env.SMARTLINK_URL || "").trim() || "#";

  const replacements = {
    SITE_TITLE: safeText("SITE_TITLE", "Click Here To watch"),
    BRAND_NAME: safeText("BRAND_NAME", "Horny Baby"),
    PAGE_HEADING: safeText("PAGE_HEADING", "New Cool Video Here"),

    IMAGE_1_URL: safeUrl("IMAGE_1_URL", "https://shinana.geetika.site/adsterrapic/1.jpg"),
    IMAGE_2_URL: safeUrl("IMAGE_2_URL", "https://shinana.geetika.site/adsterrapic/2.jpg"),
    IMAGE_3_URL: safeUrl("IMAGE_3_URL", "https://shinana.geetika.site/adsterrapic/3.jpg"),

    PLAY_1_URL: escapeHtml(String(process.env.PLAY_1_URL || "").trim() || smartlink),
    PLAY_2_URL: escapeHtml(String(process.env.PLAY_2_URL || "").trim() || smartlink),
    PLAY_3_URL: escapeHtml(String(process.env.PLAY_3_URL || "").trim() || smartlink),
    PLAY_BUTTON_TEXT: safeText("PLAY_BUTTON_TEXT", "Play"),

    HOME_URL: safeUrl("HOME_URL", "#"),
    ABOUT_URL: safeUrl("ABOUT_URL", "#"),
    SERVICES_URL: safeUrl("SERVICES_URL", "#"),
    CONTACT_URL: safeUrl("CONTACT_URL", "#"),

    FOOTER_YEAR: safeText("FOOTER_YEAR", "2026"),
    FOOTER_NAME: safeText("FOOTER_NAME", "THIS PERSON IS BRAND"),
    FOOTER_URL: safeUrl("FOOTER_URL", "#"),

    ADSTERRA_POPUNDER_CODE: raw("ADSTERRA_POPUNDER_CODE"),
    ADSTERRA_NATIVE_BANNER_CODE: raw("ADSTERRA_NATIVE_BANNER_CODE"),
    ADSTERRA_SOCIAL_BAR_CODE: raw("ADSTERRA_SOCIAL_BAR_CODE")
  };

  for (const [key, value] of Object.entries(replacements)) {
    html = html.split(`{{${key}}}`).join(value);
  }

  return html;
}

const server = http.createServer((req, res) => {
  const pathname = (req.url || "/").split("?")[0];

  if (pathname === "/health") {
    res.writeHead(200, { "Content-Type": "application/json; charset=utf-8" });
    return res.end(JSON.stringify({ ok: true }));
  }

  if (pathname === "/" || pathname.startsWith("/rev/")) {
    res.writeHead(200, {
      "Content-Type": "text/html; charset=utf-8",
      "Cache-Control": "no-store"
    });
    return res.end(renderIndex());
  }

  res.writeHead(404, { "Content-Type": "text/plain; charset=utf-8" });
  res.end("Not found");
});

server.listen(PORT, "0.0.0.0", () => {
  console.log(`Landing page running on port ${PORT}`);
});
