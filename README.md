# Wayweave — 根拠付き旅行プランナー

**公開サイト:** https://kafka2306.github.io/travel/

Wayweaveは、宿泊、移動、観光地、旅程、価格・空室、情報源を一つの旅行知識モデルで扱う旅行プランナーです。

単に観光地カードを並べるのではなく、**その人に合うか、実際に到達できるか、日程と人数に合うか、判断を支える出典があるか**を同時に確認できる画面を目指しています。

## 現在のデモ

現在の画面には、車を使わない一人旅の例として、次の佐渡島ルートを収録しています。

```text
新潟港
  → 両津港
  → 二ツ亀
  → 相川
```

フェリー、路線バス、宿泊、気候情報を単一スコアへ隠さず、判断材料と出典として表示します。

このデモは実在の旅行予約サービスではなく、UI、データ構造、証拠表示の参照実装です。料金、空室、運行、営業時間などの最新状態は各公式サイトで確認してください。

## 主な画面

1. **旅行プランナー** — 行き先検索、条件フィルター、移動可能性、旅程
2. **Google Maps連携** — 選択地点に追従する埋め込み地図、両津港からの公共交通ルート、現在地からのナビ、旅程全体
3. **知識モデル** — 旅行データを構成する領域と保存方法
4. **証拠ドロワー** — 判断に使った情報源、発行者、取得日

## Google Maps API設定

サイト内の地図表示には公式の **Maps Embed API**、Google Mapsアプリ・サイトを開く検索と経路には **Maps URLs** を使用します。

公式資料:

- Maps Embed API: https://developers.google.com/maps/documentation/embed/get-started
- 埋め込みモードとパラメータ: https://developers.google.com/maps/documentation/embed/embedding-map
- Maps URLs: https://developers.google.com/maps/documentation/urls/get-started
- APIキーのセキュリティ: https://developers.google.com/maps/api-security-best-practices

### GitHub Pages本番設定

1. Google Cloudプロジェクトを作成または選択し、課金を有効化する
2. **Maps Embed API** を有効化する
3. ブラウザ用APIキーを作成する
4. アプリケーション制限を **ウェブサイト** に設定し、次を許可する
   - `https://kafka2306.github.io/travel/*`
   - `http://localhost:5173/*`
   - `http://127.0.0.1:5173/*`
5. API制限を設定し、**Maps Embed API** のみを許可する
6. GitHubリポジトリの **Settings → Secrets and variables → Actions** を開く
7. `GOOGLE_MAPS_API_KEY` というRepository Secretを作成する
8. **Deploy to GitHub Pages** を再実行するか、`main`へ新しいコミットをPushする

Pagesワークフローはビルド時にSecretを`VITE_GOOGLE_MAPS_API_KEY`として注入します。ブラウザ用APIキーは公開サイトの通信から閲覧可能になる設計のため、Secret化だけでは保護になりません。ウェブサイト制限とAPI制限を必ず併用してください。

APIキーが未設定でも外部Google Mapsリンクは利用できますが、ページ内の埋め込み地図には設定案内が表示されます。

### ローカル実行

```bash
cp .env.example .env.local
# .env.localへ制限済みブラウザAPIキーを設定
npm install
npm run dev
```

本番向け検証:

```bash
npm run typecheck
npm run build
```

## 技術構成

- React + TypeScript + Vite — GitHub Pagesへ公開するUI
- Google Maps Embed API / Maps URLs — 埋め込み地図、検索、経路連携
- PostgreSQL — 関係、制約、有効期間を持つ正本DB
- PostGIS — 距離、包含、経路周辺などの空間検索
- Range Partition — 空室・価格スナップショットの時系列分割
- Parquet — 分析・配布用の列指向出力
- Schema.org / GTFS / PROV-O — 外部語彙と出典関係の明示

## 主な構成

```text
src/GoogleMapsDock.tsx  Google Maps Embed API / Maps URLs連携
src/google-maps.css     地図パネルのレスポンシブUI
src/                    React UIと型付きデモデータ
database/schema.sql     PostgreSQL / PostGISスキーマ
docs/ontology.md        概念、外部語彙、同一性ルール
.github/workflows/      GitHub Pages公開
```

## データ設計の原則

- 場所、宿泊施設、交通、旅程、価格、空室を一つの巨大JSONへ押し込まない
- 元データと正規化後のエンティティを分離する
- 情報の有効期間と取得時点を保存する
- 出典のない主張を確定情報として扱わない
- ブラウザへ正規化テーブルを直接公開せず、用途別のAPI・読取モデルを作る

## データベース導入手順

1. PostGISを有効にしたPostgreSQLを用意する
2. `database/schema.sql`を本番ではマイグレーションツールから適用する
3. `availability_snapshot`の月次パーティションを事前作成する
4. 元レコードを`source`と`source_record`へ保存する
5. 同一施設・地点を解決し、正規エンティティへ統合する
6. 主張、宿泊、移動、場所、旅程を一つのトランザクションで保存する
7. 旅行プランナー用APIまたは読取モデルを公開する

## 現在の位置づけ

- GitHub PagesでUIを公開済み
- 佐渡島のシード旅程を実装済み
- Google Maps Embed APIとMaps URLsのUI・ビルド連携を実装済み
- PostgreSQL / PostGISの運用スキーマを定義済み
- アクセシビリティとしてキーボードフォーカスと文字コントラストを改善済み
- 予約、リアルタイム空室、リアルタイム運行は別途API連携が必要

**README最終監査:** 2026-08-01
