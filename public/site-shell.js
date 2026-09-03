(() => {
  const BASE = '/travel';
  const STRUCTURE_URL = `${BASE}/data/site-ontology.json`;

  const relatedStyles = document.createElement('link');
  relatedStyles.rel = 'stylesheet';
  relatedStyles.href = `${BASE}/related-links.css`;
  document.head.append(relatedStyles);

  const escapeHtml = (value) => String(value ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');

  const currentPath = location.pathname.endsWith('/') ? location.pathname : `${location.pathname}/`;
  const mobileQuery = window.matchMedia('(max-width: 760px)');

  async function loadStructure() {
    const response = await fetch(STRUCTURE_URL, { cache: 'no-cache' });
    if (!response.ok) throw new Error(`site structure HTTP ${response.status}`);
    const structure = await response.json();
    if (!Array.isArray(structure.views) || !Array.isArray(structure.navigation?.primary)) {
      throw new Error('site structure is missing views or primary navigation');
    }
    return structure;
  }

  function render(structure) {
    const routes = structure.views;
    const routeById = new Map(routes.map((route) => [route.id, route]));
    if (routeById.size !== routes.length) throw new Error('site structure contains duplicate view ids');

    const primaryRoutes = structure.navigation.primary.map((id) => {
      const route = routeById.get(id);
      if (!route) throw new Error(`primary route is unresolved: ${id}`);
      return route;
    });

    const activePage = routes
      .filter((route) => currentPath.startsWith(route.path))
      .sort((a, b) => b.path.length - a.path.length)[0] || routeById.get('map');
    if (!activePage) throw new Error(`current route is unresolved: ${currentPath}`);

    const activePrimary = routeById.get(activePage.parentId || activePage.id) || routeById.get('map');
    if (!activePrimary) throw new Error(`primary parent is unresolved: ${activePage.parentId || activePage.id}`);

    document.body.classList.add(`ww-route-${activePage.id}`);

    const navLabel = (route) => route.id === 'map' ? '地図' : route.label;
    const global = document.createElement('div');
    global.className = 'ww-global';
    global.innerHTML = `
      <a class="ww-skip" href="#ww-main">本文へ移動</a>
      <div class="ww-global-inner">
        <a class="ww-global-home" href="${BASE}/"><span>↗</span><span>wayweave</span></a>
        <button class="ww-menu-button" type="button" aria-expanded="false" aria-controls="ww-global-links">メニュー</button>
        <nav class="ww-global-links" id="ww-global-links" aria-label="Wayweave 全体ナビゲーション">
          ${primaryRoutes.map((route) => `<a href="${route.path}"${route.id === activePrimary.id ? ' aria-current="page"' : ''}>${escapeHtml(navLabel(route))}</a>`).join('')}
        </nav>
      </div>`;
    document.body.prepend(global);

    const menuButton = global.querySelector('.ww-menu-button');
    const globalLinks = global.querySelector('.ww-global-links');

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

    if (currentPath === `${BASE}/`) return;

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

    const relatedRoutes = (activePage.relatedViewIds || []).map((id) => {
      const route = routeById.get(id);
      if (!route) throw new Error(`related route is unresolved: ${activePage.id} -> ${id}`);
      if (route.id === activePage.id) throw new Error(`related route points to itself: ${activePage.id}`);
      return route;
    });

    if (!relatedRoutes.length) return;

    const related = document.createElement('nav');
    related.className = 'ww-related';
    related.setAttribute('aria-label', '関連ページ');
    related.innerHTML = `<span class="ww-related-label">関連</span>${relatedRoutes.map((route) => `<a href="${route.path}">${escapeHtml(route.label)} <span aria-hidden="true">→</span></a>`).join('')}`;
    context.insertAdjacentElement('afterend', related);
  }

  loadStructure()
    .then(render)
    .catch((error) => {
      console.error('Wayweave site structure load failed', error);
      const failure = document.createElement('div');
      failure.className = 'ww-context';
      failure.setAttribute('role', 'alert');
      failure.textContent = 'サイト構造を読み込めません。';
      document.body.prepend(failure);
    });
})();
