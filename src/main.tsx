import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import App from './App'
import './styles.css'
import './google-maps.css'

const PAGE_TITLE = '旅程ワークスペース｜Wayweave'
const PAGE_DESCRIPTION = '保存済み旅程、候補地、地図、移動制約、一次情報を一つの画面で比較するWayweave旅行プランナー。'
const CANONICAL_URL = 'https://kafka2306.github.io/travel/planner/'

function setMetaContent(selector: string, content: string) {
  document.querySelector<HTMLMetaElement>(selector)?.setAttribute('content', content)
}

document.documentElement.lang = 'ja'
document.title = PAGE_TITLE
setMetaContent('meta[name="description"]', PAGE_DESCRIPTION)
setMetaContent('meta[property="og:title"]', PAGE_TITLE)
setMetaContent('meta[property="og:description"]', PAGE_DESCRIPTION)
setMetaContent('meta[property="og:url"]', CANONICAL_URL)
setMetaContent('meta[name="twitter:title"]', PAGE_TITLE)
setMetaContent('meta[name="twitter:description"]', PAGE_DESCRIPTION)
document.querySelector<HTMLLinkElement>('link[rel="canonical"]')?.setAttribute('href', CANONICAL_URL)

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
