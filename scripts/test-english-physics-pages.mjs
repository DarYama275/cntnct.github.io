import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, readFile, rm } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { generateEnglishPhysicsPages, isEnglishTopicReady } from './generate-english-physics-pages.mjs';

const section = {
  id: '3.2',
  english: {
    title: 'Wave Equations and Superposition',
    summary: 'Explore how waves overlap.',
    chapterTitle: 'Oscillations and Waves',
    metadataComplete: true,
    textbookTranslated: false,
  },
  keywords: [{ ja: '波の重ね合わせ', en: 'wave superposition', quizId: 'waveQuiz' }],
  diagrams: [{ id: 'SomeDiagram', title: '波の図解', available: true }],
  calculations: [],
};

test('do not publish English pages from incomplete metadata', () => {
  assert.equal(isEnglishTopicReady(section), true);
  assert.equal(isEnglishTopicReady({ ...section, english: { ...section.english, metadataComplete: false } }), false);
});

test('generate English HTML without leaking Japanese labels or claiming full translation', async () => {
  const root = await mkdtemp(path.join(os.tmpdir(), 'physics-en-'));
  try {
    const urls = await generateEnglishPhysicsPages({ sections: [section] }, root);
    assert.deepEqual(urls, ['https://containnect.com/en/physics-topics/3-2.html']);
    const html = await readFile(path.join(root, 'en/physics-topics/3-2.html'), 'utf8');
    assert.match(html, /<html lang="en">/);
    assert.match(html, /hreflang="ja"/);
    assert.match(html, /hreflang="en"/);
    assert.match(html, /Wave Equations and Superposition/);
    assert.match(html, /not yet available in English/);
    assert.doesNotMatch(html, /波の図解/);
    const index = await readFile(path.join(root, 'en/physics-topics/index.html'), 'utf8');
    assert.match(index, /Wave Equations and Superposition/);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});
