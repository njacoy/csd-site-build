'use strict';

/**
 * CSD Copy Build Script
 *
 * Reads structured markdown copy files and injects content into HTML pages.
 * Uses zero npm dependencies — Node.js built-ins only.
 *
 * Usage:
 *   node build.js           — build all pages
 *   node build.js home      — build homepage only
 *   node build.js services  — build services page only
 *   node build.js about     — build about page only
 *   node build.js careers   — build careers page only
 *
 * How it works:
 *   1. Markdown files use <!-- section: id --> ... <!-- /section --> delimiters
 *   2. HTML files use <!-- copy:id --> ... <!-- /copy:id --> markers
 *   3. This script reads the markdown sections and injects them into the HTML markers
 *   4. The HTML file is updated in-place; markers are preserved (idempotent)
 */

const fs   = require('fs');
const path = require('path');

const ROOT = __dirname;

const PAGES = [
  { name: 'home',     md: 'copy/home.md',     html: 'csd-homepage.html' },
  { name: 'services', md: 'copy/services.md',  html: 'services.html'    },
  { name: 'about',    md: 'copy/about.md',     html: 'about.html'       },
  { name: 'careers',  md: 'copy/careers.md',   html: 'careers.html'     },
];

/**
 * Parse all <!-- section: id --> ... <!-- /section --> blocks from a markdown file.
 * Returns a Map<id, content> where content is trimmed.
 */
function parseSections(mdText) {
  const sections = new Map();
  const regex = /<!-- section: ([\w-]+) -->([\s\S]*?)<!-- \/section -->/g;
  let match;
  while ((match = regex.exec(mdText)) !== null) {
    sections.set(match[1], match[2].trim());
  }
  return sections;
}

/**
 * Inject copy sections into HTML.
 * Finds <!-- copy:id --> ... <!-- /copy:id --> markers and replaces the content between them.
 * Returns { result: string, count: number }.
 */
function injectCopy(htmlText, sections) {
  let count = 0;
  const result = htmlText.replace(
    /<!-- copy:([\w-]+) -->[\s\S]*?<!-- \/copy:\1 -->/g,
    (fullMatch, id) => {
      if (sections.has(id)) {
        count++;
        return `<!-- copy:${id} -->${sections.get(id)}<!-- /copy:${id} -->`;
      } else {
        console.warn(`  ⚠  No section found for copy ID: "${id}" — leaving unchanged`);
        return fullMatch;
      }
    }
  );
  return { result, count };
}

/**
 * Build a single page: read markdown, parse sections, inject into HTML, write back.
 */
function buildPage(page) {
  const mdPath   = path.join(ROOT, page.md);
  const htmlPath = path.join(ROOT, page.html);

  if (!fs.existsSync(mdPath)) {
    console.log(`  –  Skipping "${page.name}": markdown not found (${page.md})`);
    return 0;
  }
  if (!fs.existsSync(htmlPath)) {
    console.log(`  –  Skipping "${page.name}": HTML not found (${page.html})`);
    return 0;
  }

  const mdText   = fs.readFileSync(mdPath,   'utf8');
  const htmlText = fs.readFileSync(htmlPath, 'utf8');

  const sections          = parseSections(mdText);
  const { result, count } = injectCopy(htmlText, sections);

  fs.writeFileSync(htmlPath, result, 'utf8');

  const noun = count === 1 ? 'section' : 'sections';
  console.log(`  ✓  ${page.name}: ${count} ${noun} injected → ${page.html}`);
  return count;
}

function main() {
  const arg   = process.argv[2];
  const pages = arg
    ? PAGES.filter(p => p.name === arg)
    : PAGES;

  if (arg && pages.length === 0) {
    const valid = PAGES.map(p => p.name).join(', ');
    console.error(`\nError: unknown page "${arg}". Valid names: ${valid}\n`);
    process.exit(1);
  }

  const label = pages.length === PAGES.length ? 'all pages' : `"${arg}"`;
  console.log(`\nBuilding ${label}...\n`);

  let total = 0;
  pages.forEach(page => { total += buildPage(page); });

  console.log(`\nDone. ${total} section${total !== 1 ? 's' : ''} injected total.\n`);
}

main();
