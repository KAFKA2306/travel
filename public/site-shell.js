(() => {
  const BASE = '/travel';
  const routes = [
    { id: 'home', path: `${BASE}/`, label: 'ホーム' },
    { id: 'planner', path: `${BASE}/planner/`, label: '旅程編集' },
    { id: 'destinations', path: `${BASE}/destinations/`, label: '旅先図鑑' },
    { id: 'heat-escape', path: `${BASE}/heat-escape-2026/`, label: '猛暑回避10案' },
    { id: 'guides', path: `${BASE}/guides/`, label: '公式リンク' },
    { id: 'shenzhen', path: `${BASE}/shenzhen/`, label: '深圳 Route Lab' },
    { id: 'sitemap', path: `${BASE}/sitemap/`, label: 'サイト構造' },
  ];

  const currentPath = location.pathname.endsWith('/') ? location.pathname : `${location.pathname}/`;
  const activeRoute = routes
    .filter((route) => currentPath.startsWith(route.path))
    .sort((a, b) => b.path.length - a.path.length)[0] || routes[0];
  document.body.classList.add(`ww-route-${activeRoute.id}`);

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
        ${routes.map((route) => `<a href="${route.path}"${route.id === activeRoute.id ? ' aria-current="page"' : ''}>${route.label}</a>`).join('')}
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

  if (currentPath !== `${BASE}/sitemap/` && currentPath !== `${BASE}/`) {
    const context = document.createElement('div');
    context.className = 'ww-context';
    context.innerHTML = `<a href="${BASE}/">Wayweave</a><span>›</span><strong>${escapeHtml(activeRoute.label)}</strong><span>›</span><a href="${BASE}/sitemap/">構造を見る</a>`;
    global.insertAdjacentElement('afterend', context);
  }

  const getData = async () => {
    const [destinationResponse, mediaResponse] = await Promise.all([
      fetch(`${BASE}/data/destinations.json`, { cache: 'no-cache' }),
      fetch(`${BASE}/data/destination-media.json`, { cache: 'no-cache' }),
    ]);
    if (!destinationResponse.ok || !mediaResponse.ok) throw new Error('destination data unavailable');
    return {
      catalog: await destinationResponse.json(),
      media: await mediaResponse.json(),
    };
  };

  const mediaMarkup = (destination, media) => {
    const sourceUrl = media?.sourceUrl || destination.mediaPage || destination.officialUrl;
    const imageUrl = media?.imageUrl || destination.overrideImageUrl || '';
    const mode = media?.mode || destination.mediaPolicy;
    const visual = imageUrl
      ? `<img src="${escapeHtml(imageUrl)}" alt="${escapeHtml(destination.name)}の公式ビジュアル" loading="lazy" decoding="async" referrerpolicy="no-referrer">`
      : `<div class="ww-media-fallback">公式ビジュアルは公式ページで確認できます。</div>`;
    return `
      <a class="ww-official-visual" href="${escapeHtml(sourceUrl)}" target="_blank" rel="noreferrer" aria-label="${escapeHtml(destination.name)}の公式ビジュアルを開く">
        <span class="ww-official-visual-media">${visual}</span>
        <span class="ww-official-visual-copy">
          <small>OFFICIAL VISUAL · RANK ${destination.rank}</small>
          <b>${escapeHtml(destination.name)}</b>
          <p>${escapeHtml(destination.publisher)}が配信する公式ページまたは公式チャンネルのビジュアルです。画像ファイルの出所と利用方針を分離して管理しています。</p>
          <span>公式配信元で見る ↗</span>
          <span class="ww-media-note"><i>${escapeHtml(mode)}</i><i>${escapeHtml(destination.publisher)}</i></span>
        </span>
      </a>`;
  };

  const installImageFallback = (root) => {
    root.querySelectorAll('.ww-official-visual img').forEach((image) => {
      if (image.dataset.fallbackBound) return;
      image.dataset.fallbackBound = 'true';
      image.addEventListener('error', () => {
        const fallback = document.createElement('div');
        fallback.className = 'ww-media-fallback';
        fallback.textContent = '公式ビジュアルを表示できません。公式ページで確認してください。';
        image.replaceWith(fallback);
      }, { once: true });
    });
  };

  const decorateHeatEscape = async () => {
    const plansNode = document.getElementById('plans');
    if (!plansNode) return;
    let data;
    try {
      data = await getData();
    } catch {
      return;
    }
    const byRank = new Map(data.catalog.destinations.map((destination) => [destination.rank, destination]));
    const detailSelectors = ['.route', '.plan-grid', '.gates', '.sources'];

    if (!document.querySelector('.ww-plan-controls')) {
      const controls = document.createElement('div');
      controls.className = 'ww-plan-controls shell';
      controls.innerHTML = '<button type="button" data-plan-action="expand">すべて展開</button><button type="button" data-plan-action="collapse">すべて閉じる</button>';
      plansNode.insertAdjacentElement('beforebegin', controls);
      controls.addEventListener('click', (event) => {
        const action = event.target.closest('button')?.dataset.planAction;
        if (!action) return;
        plansNode.querySelectorAll('.ww-plan-detail').forEach((detail) => {
          detail.hidden = action === 'collapse';
        });
        plansNode.querySelectorAll('.ww-plan-toggle').forEach((button) => {
          const expanded = action === 'expand';
          button.setAttribute('aria-expanded', String(expanded));
          button.textContent = expanded ? '詳細を閉じる' : '経路・予約・中止条件を見る';
        });
      });
    }

    const decorate = () => {
      plansNode.querySelectorAll('.plan[id^="rank-"]').forEach((article) => {
        const rank = Number(article.id.replace('rank-', ''));
        const destination = byRank.get(rank);
        const body = article.querySelector('.plan-body');
        if (!destination || !body) return;

        if (!article.querySelector('.ww-official-visual')) {
          const media = data.media.destinations?.[destination.id];
          body.insertAdjacentHTML('afterbegin', mediaMarkup(destination, media));
        }
        installImageFallback(article);

        let detail = article.querySelector('.ww-plan-detail');
        if (!detail) {
          detail = document.createElement('div');
          detail.className = 'ww-plan-detail';
          const firstDetail = body.querySelector(detailSelectors[0]);
          if (firstDetail) firstDetail.insertAdjacentElement('beforebegin', detail);
          detailSelectors.forEach((selector) => {
            const node = body.querySelector(selector);
            if (node) detail.appendChild(node);
          });
        }

        let toggle = article.querySelector('.ww-plan-toggle');
        if (!toggle) {
          toggle = document.createElement('button');
          toggle.type = 'button';
          toggle.className = 'ww-plan-toggle';
          toggle.setAttribute('aria-expanded', 'false');
          toggle.textContent = '経路・予約・中止条件を見る';
          article.querySelector('.plan-head')?.insertAdjacentElement('afterend', toggle);
          toggle.addEventListener('click', () => {
            const expanded = toggle.getAttribute('aria-expanded') === 'true';
            toggle.setAttribute('aria-expanded', String(!expanded));
            toggle.textContent = expanded ? '経路・予約・中止条件を見る' : '詳細を閉じる';
            detail.hidden = expanded;
          });
        }
        detail.hidden = mobileQuery.matches && toggle.getAttribute('aria-expanded') !== 'true';
      });
    };

    decorate();
    new MutationObserver(decorate).observe(plansNode, { childList: true });
    mobileQuery.addEventListener('change', decorate);
  };

  if (currentPath.startsWith(`${BASE}/heat-escape-2026/`)) decorateHeatEscape();
})();
