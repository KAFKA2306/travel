(() => {
  const BASE = '/travel';
  const routes = [
    { path: `${BASE}/`, label: 'ホーム' },
    { path: `${BASE}/planner/`, label: '旅程編集' },
    { path: `${BASE}/destinations/`, label: '旅先図鑑' },
    { path: `${BASE}/heat-escape-2026/`, label: '猛暑回避10案' },
    { path: `${BASE}/guides/`, label: '公式リンク' },
    { path: `${BASE}/shenzhen/`, label: '深圳 Route Lab' },
    { path: `${BASE}/sitemap/`, label: 'サイト構造' },
  ];

  const currentPath = location.pathname.endsWith('/') ? location.pathname : `${location.pathname}/`;
  const activeRoute = routes
    .filter((route) => currentPath.startsWith(route.path))
    .sort((a, b) => b.path.length - a.path.length)[0] || routes[0];

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
      <nav class="ww-global-links" aria-label="Wayweave 全体ナビゲーション">
        ${routes.map((route) => `<a href="${route.path}"${route.path === activeRoute.path ? ' aria-current="page"' : ''}>${route.label}</a>`).join('')}
      </nav>
    </div>`;
  document.body.prepend(global);

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
      ? `<img src="${escapeHtml(imageUrl)}" alt="${escapeHtml(destination.name)}の公式ビジュアル" loading="lazy" decoding="async" referrerpolicy="no-referrer" onerror="this.replaceWith(Object.assign(document.createElement('div'),{className:'ww-media-fallback',textContent:'公式ビジュアルを表示できません。公式ページで確認してください。'}))">`
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
    const decorate = () => {
      plansNode.querySelectorAll('.plan[id^="rank-"]').forEach((article) => {
        if (article.querySelector('.ww-official-visual')) return;
        const rank = Number(article.id.replace('rank-', ''));
        const destination = byRank.get(rank);
        if (!destination) return;
        const media = data.media.destinations?.[destination.id];
        const body = article.querySelector('.plan-body');
        if (body) body.insertAdjacentHTML('afterbegin', mediaMarkup(destination, media));
      });
    };
    decorate();
    new MutationObserver(decorate).observe(plansNode, { childList: true });
  };

  if (currentPath.startsWith(`${BASE}/heat-escape-2026/`)) decorateHeatEscape();
})();
