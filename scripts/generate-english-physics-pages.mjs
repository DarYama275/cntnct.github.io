import { mkdir, readdir, rm, writeFile } from 'node:fs/promises';
import path from 'node:path';

const BASE = 'https://containnect.com';
const escapeHtml = (value) => String(value ?? '').replace(/[&<>"']/g, (char) => ({
  '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
}[char]));
const compact = (value, limit = 320) => String(value ?? '').replace(/\s+/g, ' ').trim().slice(0, limit);
const styles = `<style>:root{color-scheme:dark}*{box-sizing:border-box}body{margin:0;background:#0a0a0f;color:#e8e8f0;font-family:system-ui,sans-serif;line-height:1.75}header,main,footer{max-width:880px;margin:auto;padding:1.5rem}h1{font-size:clamp(1.7rem,5vw,2.6rem)}h2{margin-top:2rem}a{color:#4af0c4}.muted{color:#b3b3c4}.cta{display:inline-block;padding:.65rem 1rem;background:#4af0c4;color:#07110e;border-radius:7px;text-decoration:none;font-weight:bold}footer{border-top:1px solid #303042}</style>`;

export function isEnglishTopicReady(section) {
  const en = section?.english;
  return Boolean(
    /^\d+(?:\.\d+)+$/.test(String(section?.id ?? '')) &&
    en?.metadataComplete === true &&
    typeof en.title === 'string' && en.title.trim() &&
    typeof en.summary === 'string' && en.summary.trim() &&
    typeof en.chapterTitle === 'string' && en.chapterTitle.trim()
  );
}

function makePage(section) {
  const en = section.english;
  const filename = section.id.replaceAll('.', '-') + '.html';
  const url = BASE + '/en/physics-topics/' + filename;
  const japaneseUrl = BASE + '/physics-topics/' + filename;
  const title = en.title + ' (' + section.id + ') | Interactive Physics Learning';
  const description = compact(en.summary + ' Explore high school physics concepts with interactive diagrams and practice in the Sawatte Oboeru Physics app.', 160);
  const keywords = [...new Set((section.keywords || []).map((item) => item.en?.trim()).filter(Boolean))];
  const keywordList = keywords.length
    ? '<ul>' + keywords.map((keyword) => '<li>' + escapeHtml(keyword) + '</li>').join('') + '</ul>'
    : '<p>Keywords will be added as translations become available.</p>';
  const diagramCount = (section.diagrams || []).filter((item) => item.available !== false).length;
  const hasQuizzes = (section.keywords || []).some((item) => item.quizId);
  const hasExercises = (section.calculations || []).length > 0;
  const cta = '<a class="cta" href="/physics.html">Explore the Physics App</a>';
  const data = {
    '@context': 'https://schema.org', '@type': 'LearningResource',
    name: en.title, url, description: en.summary, inLanguage: 'en',
    educationalLevel: 'High school',
    about: keywords,
    provider: { '@type': 'Organization', name: 'Containnect', url: BASE },
  };
  const body = '<p class="muted">' + escapeHtml(en.chapterTitle) +
    ' · SECTION ' + escapeHtml(section.id) + '</p>' +
    '<h1>' + escapeHtml(en.title) + '</h1><p>' + escapeHtml(en.summary) + '</p>' +
    '<h2>Key Concepts</h2>' + keywordList +
    '<h2>Learning Resources in the App</h2>' +
    '<ul><li>Interactive diagrams: ' + diagramCount + '</li>' +
    '<li>Concept quizzes: ' + (hasQuizzes ? 'Available' : 'Not listed') + '</li>' +
    '<li>Calculation exercises: ' + (hasExercises ? 'Available' : 'Not listed') + '</li></ul>' +
    '<p class="muted">This page provides an English overview of the topic. ' +
    'The full textbook and interactive diagram interfaces are not yet available in English.</p>' +
    '<p>' + cta + '</p>';
  const html = '<!doctype html>\n<html lang="en"><head><meta charset="utf-8">' +
    '<meta name="viewport" content="width=device-width,initial-scale=1">' +
    '<title>' + escapeHtml(title) + '</title>' +
    '<meta name="description" content="' + escapeHtml(description) + '">' +
    '<link rel="canonical" href="' + escapeHtml(url) + '">' +
    '<link rel="alternate" hreflang="ja" href="' + escapeHtml(japaneseUrl) + '">' +
    '<link rel="alternate" hreflang="en" href="' + escapeHtml(url) + '">' +
    '<meta property="og:type" content="article">' +
    '<meta property="og:title" content="' + escapeHtml(title) + '">' +
    '<meta property="og:description" content="' + escapeHtml(description) + '">' +
    '<meta property="og:url" content="' + escapeHtml(url) + '">' +
    styles + '<script type="application/ld+json">' +
    JSON.stringify(data).replace(/</g, '\\u003c') + '</script></head>' +
    '<body><header><nav><a href="/en/">Containnect</a> / ' +
    '<a href="/en/physics-topics/">Physics Topics</a> · ' +
    '<a lang="ja" href="' + escapeHtml(japaneseUrl) + '">日本語</a></nav></header>' +
    '<main>' + body + '</main><footer><a href="/en/">Containnect</a></footer>' +
    '</body></html>\n';
  return { filename, url, html, title: en.title };
}

export async function generateEnglishPhysicsPages(index, root) {
  const available = index.sections.filter(isEnglishTopicReady);
  // Never delete pages when syncing an older index without English metadata.
  if (!index.sections.some((item) => item.english)) {
    console.log('[English catalog] Awaiting English metadata from ViteReact; skipped.');
    return [];
  }
  const pages = available.map(makePage);
  const directory = path.join(root, 'en/physics-topics');
  await mkdir(directory, { recursive: true });
  for (const filename of await readdir(directory)) {
    if (/^\d+(?:-\d+)+\.html$/.test(filename) &&
        !pages.some((item) => item.filename === filename)) {
      await rm(path.join(directory, filename));
    }
  }
  for (const page of pages) {
    await writeFile(path.join(directory, page.filename), page.html, 'utf8');
  }
  const links = pages.map((page) => '<li><a href="./' + escapeHtml(page.filename) +
    '">' + escapeHtml(page.title) + '</a></li>').join('');
  const indexHtml = '<!doctype html>\n<html lang="en"><head><meta charset="utf-8">' +
    '<meta name="viewport" content="width=device-width,initial-scale=1">' +
    '<title>Physics Topics | Containnect</title>' +
    '<meta name="description" content="Explore high school physics topics, concepts and learning resources.">' +
    '<link rel="canonical" href="' + BASE + '/en/physics-topics/">' + styles +
    '</head><body><header><a href="/en/">Containnect</a></header>' +
    '<main><h1>Physics Topics</h1><p>Explore physics concepts in English. ' +
    'Interactive learning resources are available in the physics app.</p><ul>' +
    links + '</ul></main><footer><a href="/en/">Containnect</a></footer></body></html>\n';
  await writeFile(path.join(directory, 'index.html'), indexHtml, 'utf8');
  console.log('[English catalog] Generated ' + pages.length + ' topic pages.');
  return pages.map((page) => page.url);
}
