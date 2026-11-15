(() => {
  const statusEl = document.getElementById('catalog-status');
  const statsEl = document.getElementById('catalog-stats');
  const resultsEl = document.getElementById('catalog-results');
  const filtersEl = document.getElementById('chapter-filters');
  const searchEl = document.getElementById('catalog-search-input');

  const isEnglish = document.documentElement.lang.toLowerCase().startsWith('en');
  const copy = isEnglish ? {
    stats: ['Chapters', 'Topics', 'Keywords', 'Concept Quizzes', 'Interactive Diagrams', 'Practice Problems', 'Exam Explanations'],
    all: 'All', empty: 'No matching topics found.',
    labels: ['Textbook', 'Interactive Diagrams', 'Concept Quizzes', 'Practice Problems', 'Exam Explanations'],
    units: ['section', 'items', 'items', 'items', 'items'],
    detail: 'View topic details',
    loading: 'Loading physics topics…',
    awaiting: 'The catalog is waiting for its first content sync.',
    current: (count) => 'Catalog synced with ViteReact. Showing ' + count + ' topics.',
    error: 'Could not load the catalog. Please try again later.',
    preparing: 'The catalog is not available yet.',
  } : {
    stats: ['章', '単元', 'キーワード', '直感クイズ', '動く図解', '計算問題', '問題解説'],
    all: 'すべて', empty: '条件に合う教材が見つかりませんでした。',
    labels: ['教科書', '動く図解', '直感クイズ', '計算問題', '問題解説'],
    units: ['セクション', '件', '件', '件', '件'],
    detail: '単元の詳細を見る',
    loading: '教材データを読み込んでいます…',
    awaiting: '教材カタログの初回同期待ちです。ViteReact側の同期PRが反映されると自動で表示されます。',
    current: (count) => 'ViteReactの教材索引から自動生成しています。現在 ' + count + ' 単元を掲載中です。',
    error: '教材データを読み込めませんでした。同期処理の完了後にもう一度お試しください。',
    preparing: '教材カタログは現在準備中です。',
  };
  const titleOf = (section) => isEnglish ? section.english?.title || '' : section.title;
  const chapterOf = (section) => isEnglish ? section.english?.chapterTitle || '' : section.chapterTitle;
  const summaryOf = (section) => isEnglish ? section.english?.summary || '' : section.summary;
  const visible = (section) => !isEnglish || (section.english?.metadataComplete && titleOf(section) && summaryOf(section) && chapterOf(section));

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
    section.english?.title,
    section.english?.chapterTitle,
    section.english?.summary,
    ...(section.searchTerms || []),
    ...(section.keywords || []).flatMap((item) => [item.ja, item.en]),
    ...(section.diagrams || []).map((item) => item.title),
  ].filter(Boolean).join(' ').toLowerCase();

  const renderStats = (stats = {}) => {
    const items = [
      stats.chapters ?? 0,
      isEnglish ? sections.length : (stats.sections ?? 0),
      isEnglish ? sections.reduce((n, section) => n + (section.keywords || []).filter((kw) => kw.en).length, 0) : (stats.keywords ?? 0),
      isEnglish ? sections.reduce((n, section) => n + (section.keywords || []).filter((kw) => kw.quizId).length, 0) : (stats.introQuizzes ?? 0),
      stats.diagrams ?? 0,
      stats.calculations ?? 0,
      stats.explanations ?? 0,
    ].map((count, index) => [copy.stats[index], count]);
    statsEl.innerHTML = items.map(([label, value]) =>
      '<div class="catalog-stat"><strong>' + escapeHtml(value) + '</strong><span>' + escapeHtml(label) + '</span></div>'
    ).join('');
    statsEl.hidden = false;
  };

  const renderFilters = () => {
    const chapters = [...new Map(sections.map((section) => [
      section.chapterId,
      { id: section.chapterId, title: chapterOf(section) }
    ])).values()];

    const buttons = [{ id: 'all', title: copy.all }, ...chapters];
    filtersEl.innerHTML = buttons.map((chapter) =>
      '<button type="button" class="chapter-filter' + (chapter.id === activeChapter ? ' active' : '') +
      '" data-chapter="' + escapeHtml(chapter.id) + '">' +
      (chapter.id === 'all' ? copy.all : 'CH ' + escapeHtml(chapter.id) + ' · ' + escapeHtml(chapter.title)) +
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
      resultsEl.innerHTML = '<div class="catalog-empty">' + copy.empty + '</div>';
      return;
    }

    resultsEl.innerHTML = filtered.map((section) => {
      const counts = countAvailable(section);
      const keywords = (section.keywords || []).filter((item) => !isEnglish || item.en).slice(0, 10);
      const detailUrl = (isEnglish ? '/en/physics-topics/' : '/physics-topics/') + section.id.replaceAll('.', '-') + '.html';

      return '<article class="catalog-card">' +
        '<div class="catalog-card-head"><div>' +
          '<div class="catalog-id">SECTION ' + escapeHtml(section.id) + ' · ' + escapeHtml(chapterOf(section)) + '</div>' +
          '<h2>' + escapeHtml(titleOf(section)) + '</h2>' +
        '</div></div>' +
        (summaryOf(section) ? '<p class="catalog-summary">' + escapeHtml(summaryOf(section)) + '</p>' : '') +
        '<div class="catalog-content-grid">' +
          [counts.textbook, counts.diagrams, counts.quizzes, counts.calculations, counts.explanations]
            .map((n, i) => '<div class="catalog-content"><strong>' + escapeHtml(copy.labels[i]) +
              '</strong><span>' + n + ' ' + escapeHtml(copy.units[i]) + '</span></div>').join('') +
        '</div>' +
        (keywords.length ? '<div class="catalog-keywords">' + keywords.map((item) =>
          '<span class="catalog-keyword">' + escapeHtml(isEnglish ? item.en : (item.ja || item.en)) + '</span>'
        ).join('') + '</div>' : '') +
        '<p class="catalog-detail-link"><a href="' + escapeHtml(detailUrl) + '">' + copy.detail + '</a></p>' +
      '</article>';
    }).join('');
  };

  searchEl.addEventListener('input', renderSections);

  fetch('/data/learning-content-index.json', { cache: 'no-store' })
    .then((response) => {
      if (!response.ok) throw new Error('Could not load catalog JSON');
      return response.json();
    })
    .then((data) => {
      sections = (Array.isArray(data.sections) ? data.sections : []).filter(visible);
      renderStats(data.stats || {});
      renderFilters();
      renderSections();

      if (sections.length === 0) {
        statusEl.textContent = copy.awaiting;
      } else {
        statusEl.textContent = copy.current(sections.length);
      }
    })
    .catch((error) => {
      console.error(error);
      statusEl.classList.add('error');
      statusEl.textContent = copy.error;
      resultsEl.innerHTML = '<div class="catalog-empty">' + copy.preparing + '</div>';
    });
})();
