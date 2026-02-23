#!/usr/bin/env node
// Script to convert icon.svg to icon.png (128x128)
// Requires: npm install -g sharp-cli  OR  npx @squoosh/cli
// Alternative: use online converter or Inkscape

const { execSync } = require("child_process");
const path = require("path");

const svgPath = path.join(__dirname, "icon.svg");
const pngPath = path.join(__dirname, "icon.png");

// Try sharp-cli
try {
  execSync(
    `npx sharp-cli --input "${svgPath}" --output "${pngPath}" resize 128 128`,
    { stdio: "inherit" },
  );
  console.log("✅ icon.png created with sharp-cli");
  process.exit(0);
} catch {}

// Try Inkscape
try {
  execSync(
    `inkscape --export-type=png --export-filename="${pngPath}" -w 128 -h 128 "${svgPath}"`,
    { stdio: "inherit" },
  );
  console.log("✅ icon.png created with Inkscape");
  process.exit(0);
} catch {}

// Try rsvg-convert
try {
  execSync(`rsvg-convert -w 128 -h 128 "${svgPath}" -o "${pngPath}"`, {
    stdio: "inherit",
  });
  console.log("✅ icon.png created with rsvg-convert");
  process.exit(0);
} catch {}

console.error(
  "❌ Could not create icon.png. Install Inkscape or rsvg-convert, then run this script again.",
);
console.error("   brew install librsvg  # macOS");
console.error("   sudo apt install librsvg2-bin  # Ubuntu");
