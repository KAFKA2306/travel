# AGENTS.md — short-context entrypoint

このファイルは、長いREADMEや過去チャットを読めないagent向けの最初の入口です。
**まずこのファイルだけを読み、現在Issue → 対象ファイル → 必要な一次情報の順に読む。**

## 1. 読む量を制限する

最初の変更前に読むものは原則4つまで。

1. この `AGENTS.md`
2. 現在担当するGitHub Issue / PR
3. 実際に変更するファイル
4. その変更を裏付ける正本データまたは一次情報

足りない場合だけ追加で読む。repo全体、過去Issue全部、README全文を先に走査しない。

## 2. 正本の優先順位

矛盾したら次の順で採用する。

1. 現在のユーザー指示
2. 公式一次情報 / 現在のproduction実測
3. 現在のGitHub Issue / PRの契約
4. repo内の正準データ・実装
5. `README.md` / `docs/ontology.md`
6. 過去の会話・古い説明

変動する料金、空室、ダイヤ、運休、火山規制、紅葉、割引制度は古い文章を正本にしない。

## 3. task router

| 目的 | 最初に開く場所 |
|---|---|
| 公開静的ページ | `public/<page>/index.html` |
| 九州船旅 | `public/kyushu-ferry-2026/index.html` |
| 阿蘇 | `public/aso-2026/index.html` |
| 全体navigation | `public/site-shell.js` |
| planner | `src/` と `planner/index.html` |
| destination / official data | `public/data/*.json` |
| 概念・identity | `docs/ontology.md` |
| production UI監査 | `scripts/capture-pages.mjs` |
| CI | `.github/workflows/ci.yml` |
| Pages deploy | `.github/workflows/deploy-pages.yml` |
| 全体説明が本当に必要 | `README.md` |

現在の旅行案はGitHub Issueをtask contractとして読む。Issue本文が自己完結している場合、過去チャットは不要。

## 4. 実装規則

- **本番値を捏造しない。** synthetic / fixture / 推測値を料金・空室・運行・制度の現在値として表示しない。
- 未発表・未確認は `UNVERIFIED` または明確な未確認表示にする。
- fallbackで壊れた状態を成功に見せない。正本取得に失敗したら失敗または未確認として見せる。
- 公式観光局、自治体、交通事業者、施設運営者などの一次情報を優先する。
- 外部画像は利用条件を確認する。転載不可・要申請素材を無断rehostしない。公式埋め込みまたは公式ページへのリンクを使う。
- mutableな事実を `AGENTS.md` に複製しない。ここには経路と規則だけを書く。
- 新しい手入力データを既存 `Trip / Route / Evidence / public/data` と二重正本にしない。
- 新しいtop-level navigationを安易に増やさない。既存の地図 / エリア / 旅程 / 当日情報に所属させる。

## 5. 変更の最小手順

1. Issueの完了条件を読む。
2. production / mainの現在stateを確認する。
3. 最小の正本ファイルを変更する。
4. `npm run typecheck`。
5. 関連testを実行する。
6. `npm run build`。
7. PRを作る。
8. **exact-head CI成功を確認する。**
9. head SHAを固定してmergeする。
10. mainをread-backする。
11. Pages変更ならdeploy後のproduction UI監査を確認する。

build成功だけでproduction成功とは扱わない。

## 6. 公開ページの完了条件

最低限:

- HTTP 200
- desktop / mobileで横overflowなし
- broken image 0
- runtime error 0
- 主要導線がproductionで到達可能
- 時点依存情報は一次情報へ戻れる

production監査の標準対象を追加・変更したら `scripts/capture-pages.mjs` も更新する。

## 7. 短コンテキストで迷ったとき

次の形式で自分の作業状態を保持する。

```text
GOAL: 今回の成果物を1行
ISSUE: #番号
TARGET: 変更するファイル1〜3個
SOURCE: 正本URL / data path
UNKNOWN: 未確認事項
VERIFY: 実行するtest / production確認
```

この6行で説明できないほどscopeが広がったら、別Issueへ分ける。

## 8. やらないこと

- README全文を毎回読む
- repo全体を無目的に探索する
- 一時script・個別検証を恒久構造として残す
- 同じ事実をHTML / JSON / Issue / docsへ手で重複記載して正本を増やす
- CI greenだけで表示成功と宣言する
- 古い会話を現在のGitHub / production stateより優先する

詳細設計が必要な場合のみ `README.md` と `docs/ontology.md` を読む。