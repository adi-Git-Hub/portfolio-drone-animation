const fs = require("fs");
const path = require("path");
const ejs = require("ejs");
const { portfolio } = require("./server.js");

console.log("Generating static site for GitHub Pages...");

// 1. Render index.ejs to index.html
const templatePath = path.join(__dirname, "views", "index.ejs");
const template = fs.readFileSync(templatePath, "utf-8");

const html = ejs.render(template, { portfolio }, { views: [path.join(__dirname, "views")] });
fs.writeFileSync(path.join(__dirname, "index.html"), html, "utf-8");
console.log("✓ index.html written to root");

// 2. Ensure root has all required static assets for direct GitHub Pages serving
const filesToCopy = [
  { src: path.join(__dirname, "public", "styles.css"), dest: path.join(__dirname, "styles.css") },
  { src: path.join(__dirname, "public", "app.js"), dest: path.join(__dirname, "app.js") },
  { src: path.join(__dirname, "public", "drone-scene.js"), dest: path.join(__dirname, "drone-scene.js") },
];

filesToCopy.forEach(({ src, dest }) => {
  if (fs.existsSync(src)) {
    fs.copyFileSync(src, dest);
    console.log(`✓ Copied ${path.basename(dest)} to root`);
  }
});

// 3. Create .nojekyll for GitHub Pages
fs.writeFileSync(path.join(__dirname, ".nojekyll"), "", "utf-8");
console.log("✓ Created .nojekyll");

console.log("Static build completed successfully!");
