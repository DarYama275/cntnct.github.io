(() => {
  const statusEl = document.getElementById('catalog-status');
  const statsEl = document.getElementById('catalog-stats');
  const resultsEl = document.getElementById('catalog-results');
  const filtersEl = document.getElementById('chapter-filters');
  const searchEl = document.getElementById('catalog-search-input');

  let sections = [];
  let activeChapter = 'all';

  const escapeHtml = (value = '') =>
    String(value).replace(/[&<>"']/g, (char) => ({
      '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
    }[char]));

  const countAvailable = (section) => ({
    textbook: section.textbook?.available ? 1 : 0,
    diagrams: (section.diagrams || []).filter((item) => item.available !== false).length,
    quizzes: (section.keywords || []).filter((item) => item.quizId).length,
    calculations: (section.calculations || []).length,
    explanations: (section.explanations || []).length,
  });

  const searchableText = (section) => [
    section.id,
    section.title,
    section.chapterTitle,
    section.summary,
    ...(section.searchTerms || []),
    ...(section.keywords || []).flatMap((item) => [item.ja, item.en]),
    ...(section.diagrams || []).map((item) => item.title),
  ].filter(Boolean).join(' ').toLowerCase();

  const renderStats = (stats = {}) => {
    const items = [
      ['章', stats.chapters ?? 0],
      ['単元', stats.sections ?? 0],
      ['キーワード', stats.keywords ?? 0],
      ['直感クイズ', stats.introQuizzes ?? 0],
      ['動く図解', stats.diagrams ?? 0],
      ['計算問題', stats.calculations ?? 0],
      ['問題解説', stats.explanations ?? 0],
    ];
    statsEl.innerHTML = items.map(([label, value]) =>
      '<div class="catalog-stat"><strong>' + escapeHtml(value) + '</strong><span>' + escapeHtml(label) + '</span></div>'
    ).join('');
    statsEl.hidden = false;
  };

  const renderFilters = () => {
    const chapters = [...new Map(sections.map((section) => [
      section.chapterId,
      { id: section.chapterId, title: section.chapterTitle }
    ])).values()];

    const buttons = [{ id: 'all', title: 'すべて' }, ...chapters];
    filtersEl.innerHTML = buttons.map((chapter) =>
      '<button type="button" class="chapter-filter' + (chapter.id === activeChapter ? ' active' : '') +
      '" data-chapter="' + escapeHtml(chapter.id) + '">' +
      (chapter.id === 'all' ? 'すべて' : 'CH ' + escapeHtml(chapter.id) + ' · ' + escapeHtml(chapter.title)) +
      '</button>'
    ).join('');

    filtersEl.querySelectorAll('.chapter-filter').forEach((button) => {
      button.addEventListener('click', () => {
        activeChapter = button.dataset.chapter || 'all';
        renderFilters();
        renderSections();
      });
    });
  };

  const renderSections = () => {
    const query = (searchEl.value || '').trim().toLowerCase();
    const filtered = sections.filter((section) => {
      if (activeChapter !== 'all' && section.chapterId !== activeChapter) return false;
      if (query && !searchableText(section).includes(query)) return false;
      return true;
    });

    if (!filtered.length) {
      resultsEl.innerHTML = '<div class="catalog-empty">条件に合う教材が見つかりませんでした。</div>';
      return;
    }

    resultsEl.innerHTML = filtered.map((section) => {
      const counts = countAvailable(section);
      const keywords = (section.keywords || []).slice(0, 10);

      return '<article class="catalog-card">' +
        '<div class="catalog-card-head"><div>' +
          '<div class="catalog-id">SECTION ' + escapeHtml(section.id) + ' · ' + escapeHtml(section.chapterTitle) + '</div>' +
          '<h2>' + escapeHtml(section.title) + '</h2>' +
        '</div></div>' +
        (section.summary ? '<p class="catalog-summary">' + escapeHtml(section.summary) + '</p>' : '') +
        '<div class="catalog-content-grid">' +
          '<div class="catalog-content"><strong>教科書</strong><span>' + counts.textbook + ' セクション</span></div>' +
          '<div class="catalog-content"><strong>動く図解</strong><span>' + counts.diagrams + ' 件</span></div>' +
          '<div class="catalog-content"><strong>直感クイズ</strong><span>' + counts.quizzes + ' 件</span></div>' +
          '<div class="catalog-content"><strong>計算問題</strong><span>' + counts.calculations + ' 件</span></div>' +
          '<div class="catalog-content"><strong>問題解説</strong><span>' + counts.explanations + ' 件</span></div>' +
        '</div>' +
        (keywords.length ? '<div class="catalog-keywords">' + keywords.map((item) =>
          '<span class="catalog-keyword">' + escapeHtml(item.ja || item.en) + '</span>'
        ).join('') + '</div>' : '') +
      '</article>';
    }).join('');
  };

  searchEl.addEventListener('input', renderSections);

  fetch('./data/learning-content-index.json', { cache: 'no-store' })
    .then((response) => {
      if (!response.ok) throw new Error('教材索引を取得できませんでした');
      return response.json();
    })
    .then((data) => {
      sections = Array.isArray(data.sections) ? data.sections : [];
      renderStats(data.stats || {});
      renderFilters();
      renderSections();

      if (sections.length === 0) {
        statusEl.textContent = '教材カタログの初回同期待ちです。ViteReact側の同期PRが反映されると自動で表示されます。';
      } else {
        statusEl.textContent = 'ViteReactの教材索引から自動生成しています。現在 ' + sections.length + ' 単元を掲載中です。';
      }
    })
    .catch((error) => {
      console.error(error);
      statusEl.classList.add('error');
      statusEl.textContent = '教材データを読み込めませんでした。同期処理の完了後にもう一度お試しください。';
      resultsEl.innerHTML = '<div class="catalog-empty">教材カタログは現在準備中です。</div>';
    });
})();
