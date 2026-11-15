import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';

const script = readFileSync('physics-catalog.js', 'utf8');
const sample = {
  stats: { chapters: 1, sections: 1, keywords: 1, introQuizzes: 1, diagrams: 1, calculations: 1, explanations: 1 },
  sections: [{
    id: '2.4', chapterId: '2', chapterTitle: '力学',
    title: '運動量保存則', summary: '運動量の説明',
    english: { chapterTitle: 'Mechanics', title: 'Momentum Conservation',
      summary: 'Explore momentum and collisions.', metadataComplete: true },
    keywords: [{ ja: '運動量', en: 'momentum', quizId: 'momentumQuiz' }],
    textbook: { available: true },
    diagrams: [{ available: true }],
    calculations: [{}], explanations: [{}],
  }],
};

async function render(lang) {
  const nodes = new Map();
  for (const id of ['catalog-status', 'catalog-stats', 'catalog-results',
    'chapter-filters', 'catalog-search-input']) {
    nodes.set(id, {
      id, innerHTML: '', value: '', hidden: true, textContent: '',
      classList: { add() {} },
      addEventListener(name, handler) { this[name] = handler; },
      querySelectorAll() { return []; },
    });
  }
  const document = {
    documentElement: { lang },
    getElementById(id) { return nodes.get(id); },
  };
  vm.runInNewContext(script, {
    document, console,
    fetch: async (url) => {
      assert.equal(url, '/data/learning-content-index.json');
      return { ok: true, json: async () => sample };
    },
  });
  await new Promise((resolve) => setImmediate(resolve));
  return nodes;
}

test('Japanese and English share one catalog renderer and ID-based details', async () => {
  const ja = await render('ja');
  const en = await render('en');
  assert.match(ja.get('catalog-results').innerHTML, /運動量保存則/);
  assert.match(ja.get('catalog-results').innerHTML, /\/physics-topics\/2-4.html/);
  assert.match(en.get('catalog-results').innerHTML, /Momentum Conservation/);
  assert.match(en.get('catalog-results').innerHTML, /\/en\/physics-topics\/2-4.html/);
  assert.match(en.get('catalog-results').innerHTML, /Interactive Diagrams/);
  assert.doesNotMatch(en.get('catalog-results').innerHTML, /運動量保存則|運動量の説明/);
  assert.match(en.get('chapter-filters').innerHTML, /Mechanics/);
  assert.match(ja.get('chapter-filters').innerHTML, /力学/);
  const input = en.get('catalog-search-input');
  input.value = 'momentum';
  input.input();
  assert.match(en.get('catalog-results').innerHTML, /Momentum Conservation/);
  input.value = 'not present';
  input.input();
  assert.match(en.get('catalog-results').innerHTML, /No matching topics found/);
});

test('both catalog HTML files have the same layout and shared assets', () => {
  const ja = readFileSync('physics-catalog.html', 'utf8');
  const en = readFileSync('en/physics-catalog.html', 'utf8');
  for (const id of ['catalog-stats', 'catalog-search-input', 'chapter-filters', 'catalog-results']) {
    assert.match(ja, new RegExp('id="' + id + '"'));
    assert.match(en, new RegExp('id="' + id + '"'));
  }
  assert.match(ja, /src="physics-catalog.js"/);
  assert.match(en, /src="\.\.\/physics-catalog.js"/);
  assert.match(en, /href="\.\.\/physics-catalog.css"/);
  assert.match(en, /hreflang="ja"/);
  assert.match(ja, /hreflang="en"/);
});
