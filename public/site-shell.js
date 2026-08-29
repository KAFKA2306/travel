(() => {
  const BASE = '/travel';

  // Primary navigation is intentionally fixed. New content must belong to one
  // of these sections instead of creating another top-level navigation item.
  const primaryRoutes = [
    { id: 'map', path: `${BASE}/`, label: '地図' },
    { id: 'areas', path: `${BASE}/destinations/`, label: 'エリア' },
    { id: 'plans', path: `${BASE}/planner/`, label: '旅程' },
    { id: 'live', path: `${BASE}/guides/`, label: '当日情報' },
  ];

  const childRoutes = [
    { id: 'kansai-museums', path: `${BASE}/kansai-museums/`, label: '大阪・京都ミュージアム', parentId: 'areas' },
    { id: 'official', path: `${BASE}/official/`, label: '公式特集', parentId: 'areas' },
    { id: 'heat-escape', path: `${BASE}/heat-escape-2026/`, label: '猛暑回避10案', parentId: 'plans' },
    { id: 'kyushu-ferry', path: `${BASE}/kyushu-ferry-2026/`, label: '九州・さんふらわあ', parentId: 'plans' },
    { id: 'aso', path: `${BASE}/aso-2026/`, label: '阿蘇 Route Guide', parentId: 'plans' },
    { id: 'shenzhen', path: `${BASE}/shenzhen/`, label: '深圳 Route Lab', parentId: 'plans' },
    { id: 'sitemap', path: `${BASE}/sitemap/`, label: 'サイト構造', parentId: 'map' },
  ];

  const currentPath = location.pathname.endsWith('/') ? location.pathname : `${location.pathname}/`;
  const allRoutes = [...childRoutes, ...primaryRoutes];
  const activePage = allRoutes
    .filter((route) => currentPath.startsWith(route.path))
    .sort((a, b) => b.path.length - a.path.length)[0] || primaryRoutes[0];
  const activePrimary = primaryRoutes.find((route) => route.id === (activePage.parentId || activePage.id)) || primaryRoutes[0];

  document.body.classList.add(`ww-route-${activePage.id}`);

  const escapeHtml = (value) => String(value ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');

  const global = document.createElement('div');
  global.className = 'ww-global';
  global.innerHTML = `
    <a class="ww-skip" href="#ww-main">本文へ移動</a>
    <div class="ww-global-inner">
      <a class="ww-global-home" href="${BASE}/"><span>↗</span><span>wayweave</span></a>
      <button class="ww-menu-button" type="button" aria-expanded="false" aria-controls="ww-global-links">メニュー</button>
      <nav class="ww-global-links" id="ww-global-links" aria-label="Wayweave 全体ナビゲーション">
        ${primaryRoutes.map((route) => `<a href="${route.path}"${route.id === activePrimary.id ? ' aria-current="page"' : ''}>${route.label}</a>`).join('')}
      </nav>
    </div>`;
  document.body.prepend(global);

  const menuButton = global.querySelector('.ww-menu-button');
  const globalLinks = global.querySelector('.ww-global-links');
  const mobileQuery = window.matchMedia('(max-width: 760px)');

  const syncMenu = () => {
    if (mobileQuery.matches) {
      globalLinks.hidden = menuButton.getAttribute('aria-expanded') !== 'true';
    } else {
      globalLinks.hidden = false;
      menuButton.setAttribute('aria-expanded', 'false');
    }
  };

  menuButton.addEventListener('click', () => {
    const expanded = menuButton.getAttribute('aria-expanded') === 'true';
    menuButton.setAttribute('aria-expanded', String(!expanded));
    globalLinks.hidden = expanded;
  });

  globalLinks.addEventListener('click', (event) => {
    if (mobileQuery.matches && event.target.closest('a')) {
      menuButton.setAttribute('aria-expanded', 'false');
      globalLinks.hidden = true;
    }
  });

  mobileQuery.addEventListener('change', syncMenu);
  syncMenu();

  const main = document.querySelector('main') || document.getElementById('root');
  if (main && !main.id) main.id = 'ww-main';
  if (main && main.id !== 'ww-main') main.setAttribute('tabindex', '-1');

  if (currentPath !== `${BASE}/`) {
    const context = document.createElement('div');
    context.className = 'ww-context';
    const pageIsPrimary = !activePage.parentId;
    const parts = [
      `<a href="${BASE}/">地図</a>`,
      ...(activePrimary.id !== 'map' ? [`<span>›</span><a href="${activePrimary.path}">${escapeHtml(activePrimary.label)}</a>`] : []),
      ...(!pageIsPrimary ? [`<span>›</span><strong>${escapeHtml(activePage.label)}</strong>`] : []),
    ];
    context.innerHTML = parts.join('');
    global.insertAdjacentElement('afterend', context);
  }
})();
