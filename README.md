https://kafka2306.github.io/travel/

# Wayweave — 旅行先の発見・比較・行程編集・公式確認を分ける旅行知識プロダクト

[![CI](https://github.com/KAFKA2306/travel/actions/workflows/ci.yml/badge.svg)](https://github.com/KAFKA2306/travel/actions/workflows/ci.yml)
[![Deploy to GitHub Pages](https://github.com/KAFKA2306/travel/actions/workflows/deploy-pages.yml/badge.svg)](https://github.com/KAFKA2306/travel/actions/workflows/deploy-pages.yml)
[![Validate travel decision entry](https://github.com/KAFKA2306/travel/actions/workflows/uiux-decision-entry.yml/badge.svg)](https://github.com/KAFKA2306/travel/actions/workflows/uiux-decision-entry.yml)

**旅行で最初に決めるべきなのは、行き先ではない。「次に何を決める必要があるか」だ。**

旅行先を探しているのか、候補を比較したいのか、保存済み行程を編集したいのか、交通や入域条件の最新公式情報を確認したいのか。Wayweaveは、この異なる意思決定を先に分けてから、適切な画面へ案内します。

Wayweaveは、旅行先の情報を並べるだけではなく、**いま何を決める必要があるか**から利用者を適切な画面へ案内する旅行知識・行程設計プロジェクトです。

トップページは一つの保存済み旅程を勝手に選びません。旅行先を探す、候補を比較する、保存済み行程を編集する、交通や入域条件などの最新公式情報を確認する、という異なる目的を分けます。

> **公開トップ:** https://kafka2306.github.io/travel/  
> **planner:** https://kafka2306.github.io/travel/planner/  
> **技術構成:** Vite / React / TypeScript / 静的multi-page build  
> **地図:** Google Maps Embed API / Maps URLs  
> **将来の運用DBモデル:** PostgreSQL / PostGIS

---

## 公開ページ

| ページ | URL | 役割 |
|---|---|---|
| Decision portal | https://kafka2306.github.io/travel/ | 利用者の目的から次の画面を選ぶ入口 |
| Planner workspace | https://kafka2306.github.io/travel/planner/ | 保存済み旅程、filter、地図、行程の編集 |
| Travel quick links | https://kafka2306.github.io/travel/guides/ | 旅行当日に使う交通・観光・施設・天候などの公式リンク |
| Destination atlas | https://kafka2306.github.io/travel/destinations/ | 公式画像・映像と具体的な旅行案を接続するatlas |
| Official content network | https://kafka2306.github.io/travel/official/ | 地域ごとの公式コンテンツと来歴 |
| Site ontology | https://kafka2306.github.io/travel/sitemap/ | Decision、TripPlan、Destination、Route、EvidenceSourceの関係 |
| Heat escape 2026 | https://kafka2306.github.io/travel/heat-escape-2026/ | 大阪発・車なしを前提にした避暑候補の比較 |
| Shenzhen route lab | https://kafka2306.github.io/travel/shenzhen/ | 関西から深圳への複数交通経路の比較 |

URLが存在することだけでは、交通、営業時間、運賃、入域条件が現在も有効であることを保証しません。時点依存の情報は公式リンクで再確認します。

---

## 基本の情報設計

Wayweaveの主要単位は「場所のカード」ではなく、**意思決定**です。

```text
利用者が次にしたいこと
  ├─ 次の旅行候補を探す
  ├─ 現在の候補を比較する
  ├─ 保存済み行程を編集する
  └─ 最新の公式情報を確認する
        │
        ▼
対応するviewへ移動
        │
        ▼
Destination / Route / TripPlan / EvidenceSourceを参照
        │
        ▼
予約・出発前に公式情報を再確認
```

plannerは重要な作業画面ですが、サイト全体のトップではありません。複数の旅行案や調査viewを一つのplanner状態へ押し込めません。

---

## 各viewの役割

### Decision portal

公開トップです。現在の旅行候補、公式コンテンツ、保存済み行程、ライブ情報確認の入口を、目的別に提示します。

2026年8月4日時点では、KAFKA SIGNALの共通identityを使った旅行意思決定画面とURL状態共有がmainへ反映されています。

### Planner workspace

次を扱う状態付きの作業画面です。

- 保存済み旅行案の選択
- 条件filter
- 車なし・一人旅などの制約
- 空間的な位置関係
- Google Mapsへのhandoff
- 実現可能性を考慮した行程

初期データには、佐渡島の一人・車なし旅行案と、神戸三宮・有馬の日帰りモデルが含まれます。これらは編集可能なseedであり、サイト全体の情報設計ではありません。

### Destination atlas

公式の画像・映像・publisher情報を、具体的な旅行案へ接続します。

外部画像を無差別にローカルへ複製せず、公式media manifest、出典、publisherへの導線を保持します。

### Travel quick links

旅行当日に必要な公式ページへ短く到達するためのhubです。

- 交通
- 観光局
- 施設
- 天候
- 予約
- 入域・入国条件
- 運休・障害情報

リンク集を作るだけでなく、どの旅行案のどの判断に必要かを関連付けます。

### Heat escape 2026

利用者が提示した2026年の避暑候補を、大阪発、車なし、次週に実行可能な旅行案へ変換した比較viewです。

各候補では、次を明示します。

- 目標日
- 交通経路
- 最低滞在日数
- 予約順序
- 削除可能な要素
- 公式情報源
- 出発48時間前のgo / no-go条件

### Shenzhen route lab

大阪・関西から深圳へ移動する国際・multimodal caseです。

比較する主なpattern:

- 関西から深圳への直行便
- 香港国際空港から入国前に蛇口へ接続するferry
- 越境coachによるfallback

運航、乗継条件、入国、手荷物、時刻表などは変更され得るため、固定された説明だけで確定しません。

### Site ontology

次の概念間の関係を人間向け・機械可読の両方で整理します。

- Decision
- TripPlan
- Destination
- Route
- EvidenceSource
- MediaAsset
- validity window
- publisher

---

## 公式コンテンツの扱い

公式観光局、自治体、交通事業者、施設運営者などの情報を優先します。

保持する情報:

- 公式URL
- publisher
- 対象地域・施設・交通
- 取得・確認時点
- 画像・映像の参照先
- 利用条件
- 有効期間または再確認条件

地域コンテンツは、候補登録、一次情報確認、manifest追加、表示、公開確認というlife cycleで扱います。2026年8月3日には萩と小笠原の公式コンテンツlife cycleがmainへ追加されています。

外部情報をローカルへ自動rehostすることは既定動作ではありません。

---

## Google Mapsの設定

plannerは、地図表示に公式の**Maps Embed API**を使用します。検索、経路、navigation、旅程全体のhandoffには**Maps URLs**を使用します。

公式資料:

- https://developers.google.com/maps/documentation/embed/get-started
- https://developers.google.com/maps/documentation/embedding-map
- https://developers.google.com/maps/documentation/urls/get-started
- https://developers.google.com/maps/api-security-best-practices

### ローカル

```bash
cp .env.example .env.local
```

`.env.local`へ制限付きbrowser keyを設定します。

### GitHub Pages

1. Google Cloud projectを作成または選択する
2. billingを有効化する
3. Maps Embed APIを有効化する
4. browser API keyを作成する
5. website restrictionを設定する
   - `https://kafka2306.github.io/travel/*`
   - `http://localhost:5173/*`
   - `http://127.0.0.1:5173/*`
6. API restrictionをMaps Embed APIだけに限定する
7. GitHub Actions secret `GOOGLE_MAPS_API_KEY`を設定する
8. Pages workflowを再実行する

build時には`VITE_GOOGLE_MAPS_API_KEY`として注入されます。browser keyは配信後に閲覧可能になる設計なので、GitHub Secretだけで保護されたと考えず、website restrictionとAPI restrictionを必須にします。

keyがない場合も、外部Google Mapsリンクは利用できます。埋込panelは設定不足を表示します。

---

## セットアップ

### 必要環境

- Node.js
- npm
- Git
- Maps埋込を使う場合は制限付きGoogle Maps API key

packageは`package.json`とlockfileを正準として導入します。

```bash
npm install
```

CIと同じ固定依存を使う場合は、lockfileの状態に応じて`npm ci`を使用します。

---

## ローカル実行

```bash
cp .env.example .env.local
npm install
npm run dev
```

Viteが表示するURLを開きます。標準的には`http://localhost:5173/`ですが、port競合時は別portになる場合があります。

### typecheck

```bash
npm run typecheck
```

### production build

```bash
npm run build
```

### build結果のpreview

```bash
npm run preview
```

build成功だけでは、公開Pagesが更新された証拠にはなりません。deploy後に公開URL、document identity、主要リンク、desktop・mobile表示を確認します。

---

## 技術構成

- **Vite multi-page build** — 静的portalとReact plannerを分離
- **React + TypeScript** — 状態を持つplanner
- **Google Maps Embed API / Maps URLs** — server-side directions proxyを持たない地図handoff
- **静的HTML / JSON** — destination、guide、ontology、route lab
- **PostgreSQL + PostGIS** — relationship、validity window、空間filterの将来運用model
- **Schema.org / GTFS / PROV-O** — 外部概念とのmapping
- **official media manifest** — publisher attributionとremote media参照

`package.json`ではReact、React DOM、Vite、TypeScript、Lucide Reactを使用します。

---

## ディレクトリ構成

```text
index.html                         意思決定中心の公開トップ
planner/index.html                 React plannerのHTML entry
src/                               planner UIと型付きseed data
src/GoogleMapsDock.tsx             Maps Embed API / Maps URLs連携
src/google-maps.css                地図panelのresponsive style
public/destinations/index.html     Destination atlas
public/heat-escape-2026/index.html 避暑候補比較
public/guides/index.html           旅行当日の公式quick links
public/shenzhen/index.html         大阪・深圳route lab
public/sitemap/index.html          ontology site map
public/data/*.json                 destination、media、ontology data
scripts/                           決定的な生成・更新・検証処理
database/schema.sql                PostgreSQL / PostGIS operational schema
docs/ontology.md                   概念、mapping、identity rule
docs/                              設計・運用・UI証拠
.github/workflows/                 refresh、検証、Pages deploy
```

---

## Database rollout

`database/schema.sql`は、静的サイトの現在必須DBではなく、運用データを拡張するためのPostgreSQL / PostGIS modelです。

導入時の原則:

1. PostgreSQLとPostGISを用意する
2. productionでは手動貼付ではなくmigration toolで適用する
3. `availability_snapshot`の月次partitionを事前作成する
4. raw recordを`source`と`source_record`へ取り込む
5. canonical entityを解決する
6. claimと型付きdomain rowを一transactionでmaterializeする
7. planner専用read modelをAPIで提供する
8. 正規化tableをそのままbrowserへ公開しない

schemaがあることは、production DBが稼働済みであることを意味しません。

---

## 正準と生成物

| 対象 | 管理場所 |
|---|---|
| 公開portal | `index.html` |
| planner | `planner/`, `src/` |
| destination・media・ontology data | `public/data/` |
| 静的specialized pages | `public/` |
| 運用DB model | `database/schema.sql` |
| ontology説明 | `docs/ontology.md` |
| API key実値 | GitHub Secrets / `.env.local`、Git管理外 |
| build生成物 | Viteの出力directory、直接編集しない |
| 公開証拠 | `docs/`内のcapture、workflow、公開URL確認 |

---

## 検証

最低限:

```bash
npm run typecheck
npm run build
```

公開前後に確認する内容:

- multi-page entryがすべてbuildされる
- rootが任意の保存済み旅程へ直接遷移しない
- planner状態とURL状態が復元できる
- 公式リンクが目的のpublisherへ接続する
- 画像の出典と利用条件を追跡できる
- API keyなしでも安全にdegradeする
- desktopとmobileで主要導線を利用できる
- 公開Pagesが意図したcommitと文書を配信する
- 時点依存情報には再確認導線がある

2026年8月4日のmainでは、公開Pagesのdesktop・mobile captureが記録されています。

---

## セキュリティと公開境界

公開リポジトリへ保存しないもの:

- unrestricted Google Maps API key
- 予約番号
- passport情報
- 個人の連絡先
- 非公開の宿泊情報
- 認証済みsession
- private itineraryに含まれる機微情報
- 利用権を確認できない画像の再配布

browser keyは配信時に見える前提で制限します。GitHub Secretへ入れただけでは十分ではありません。

---

## 既知の制約

- 静的サイトは交通機関や施設の最新状態を自動保証しません。
- plannerのrouteは、実時間の運休、満席、道路障害を完全には反映しません。
- Google Mapsの表示はAPI key、quota、利用規約に依存します。
- PostgreSQL / PostGIS schemaは将来運用modelを含みますが、公開サイトがproduction DBへ常時接続していることを意味しません。
- 保存済みseed itineraryは提案であり、予約済み・実行確定を意味しません。
- 国際移動では入国、visa、手荷物、乗継条件を出発前に公式情報で再確認する必要があります。

---

## README.mdと関連文書

READMEは、人間がプロダクト全体、view、セットアップ、データ、検証、制約を理解する正準入口です。

詳細:

- [`docs/ontology.md`](docs/ontology.md) — ontology、mapping、identity
- [`database/schema.sql`](database/schema.sql) — operational data model
- [`package.json`](package.json) — scriptと依存関係
- [GitHub Pages](https://kafka2306.github.io/travel/) — 現在の公開画面

---

## ライセンスと外部素材

repositoryのlicense、公式publisherの利用条件、Google Maps Platformの規約をそれぞれ確認してください。外部画像・映像は、repositoryのlicenseだけで再利用可能になるわけではありません。

**README実体監査:** 2026年8月4日
