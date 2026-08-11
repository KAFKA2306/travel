# Travel Agent Workspace v1

Issue #11 の最小安全境界です。Cloudflare OS v2 のコードをコピーするのではなく、公開されている設計原則を travel の旅程データへ独立実装します。

## 境界

- 1旅行を1 `workspace_id` として分離する。
- workspace は既定で `private`。共有は `viewer | editor` を明示する。
- Agent/Gadget相当の処理は ambient authority を持たず、workspace に列挙された capability だけを使える。
- `publish:github` / `delete:itinerary` / `purchase:external` は side effect として `PENDING_APPROVAL` に止める。
- 承認後もこのモジュールは外部操作を実行しない。`APPROVED_READY` は「別の明示的adapterが実行可能」という状態であり、購入・予約・公開の成功を意味しない。
- `navigate:booking` は外部予約ページ候補を提示するだけで、予約・購入ではない。

## Evidence contract

旅程候補は最低限 `source_url` と `checked_at` を必須とします。`price_if_verified` と `opening_hours_if_verified` は根拠がある場合だけ evidence object として保存し、値が不明なら `null` のままにします。

`candidateFreshness()` は呼出側が与えた `now` と `maxAgeDays` から `FRESH | STALE | FUTURE_CHECKED_AT` を決定します。古い情報を自動更新済みとみなしたり、欠損価格・営業時間を推測したりしません。

## Audit

提案ごとに `actor / capability / resource / input_hash / source_urls / status / at` を記録します。生の入力全体を監査ログへ複製せずSHA-256 fingerprintを保持します。

## Blueprint

`agent/blueprints/day-trip-no-car.json` は車なし日帰り旅行の最小Blueprintです。Blueprintはworkspaceの初期制約を複製するための設定であり、既存workspaceの個人データや履歴を複製しません。

## Agent-friendly API

`public/api/v1/agent/workspace-contract.json` は、利用可能capability、side-effect policy、evidence field、audit fieldを静的に公開する契約です。リアルタイム同期バックエンド自体はこのv1では未実装です。

## 未完了

Issue #11 全体のうち、複数端末/利用者間のリアルタイム状態同期、share-link認証、実際の予約サイト/GitHub adapter、workspace永続化UIは未実装です。これらを実装するまでIssue #11はcloseしません。

## 一次情報

- Cloudflare OS: https://github.com/cloudflare/cloudflare-os
- Cloudflare OS README（Gatekeepers / Blueprints / capability-based access / sandbox）: https://github.com/cloudflare/cloudflare-os#readme
