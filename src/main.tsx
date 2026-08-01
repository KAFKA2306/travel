import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import App from './App'
import './styles.css'
import './google-maps.css'

const PAGE_TITLE = 'Wayweave｜予算と公共交通から組み替える旅行プランナー'
const PAGE_DESCRIPTION = '大阪発・1名・2泊3日の旅行条件を、価格・公共交通・温泉・根拠から比較するWayweave旅行プランナー。神戸・三宮2連泊と有馬温泉日帰りモデルを掲載。'
const CANONICAL_URL = 'https://kafka2306.github.io/travel/'

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
