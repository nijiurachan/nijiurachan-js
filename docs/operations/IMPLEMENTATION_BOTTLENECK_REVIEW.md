# 実装ボトルネックレビュー: nijiurachan-js

本ドキュメントは、`nijiurachan-js` を共通基盤として保つ上でのボトルネックを整理する。

## 1. 要約

- 最大のボトルネックは「便利だから」とアプリ固有責務を抱え込むこと
- 次点は `elements` が DOM と app 都合の両方を持ち始めること
- いちばん守るべき核は `pure` の再利用性

## 2. 優先度順レビュー

### 2.1 最優先: 添付まわりの責務流入

- 対象:
  - `src/elements/upfile-input.ts`
  - `src/components/upfile-input-fragment.tsx`
  - `src/pure/upfile.ts`
- 問題:
  - 便利な部品なので、画面固有条件を足しやすい
  - `upfile` 系は mode / action / DOM / paint 連携が複雑で、アプリ側都合の流入点になりやすい
- 影響:
  - Phase 3 / 4 で PC / SP 共通化しようとしたときに再利用しにくくなる
- 推奨:
  - 条件追加はまず `pure` へ寄せられるか確認し、寄せられないものはアプリ側へ残す

### 2.2 高: Custom Elements の app 固有化

- 対象:
  - `src/elements/*`
- 問題:
  - DOM lifecycle と画面都合を同時に持ちやすい
- 影響:
  - `aimg_viewer` や将来 PC 実装からの再利用性が落ちる
- 推奨:
  - element は「bridge」に徹し、表示や条件は component / pure へ分ける

### 2.3 高: build / test タスクの責務混在

- 対象:
  - `src/build/tasks/build-and-test.ts`
  - `src/build/tasks/run-tests.ts`
- 問題:
  - build 成功後の test 実行が自然に見えるため、運用上「設計レビュー」と「実テスト自動化」が混線しやすい
- 影響:
  - 今回のように設計レベルで止めたい段階でも、実装依存の期待が入りやすい
- 推奨:
  - docs では設計確認と実行タスクを分けて扱う

### 2.4 中: 外部連携部品の専用化

- 対象:
  - `src/io/axnos-paint-popup.ts`
  - `src/elements/lazy-turnstile.ts`
  - `src/elements/bouyomi-connector.ts`
- 問題:
  - 便利な外部接続部品は、特定クライアント専用の使い勝手へ寄りやすい
- 影響:
  - 共通基盤というより feature 置き場に近づく
- 推奨:
  - 契約と橋渡しに止め、画面上の運用はアプリ側へ出す

## 3. 直近の実装優先度

1. `upfile` 系の境界維持
2. `elements` と `pure` の責務分離維持
3. 外部連携部品の契約明文化
4. build / test タスクの docs 上の分離維持

## 4. 参照先

- `docs/requirements/SHARED_UI_FOUNDATION_REQUIREMENTS.md`
- `docs/specs/ARCHITECTURE_PHASE1_TO_PHASE4.md`
- `docs/specs/FOUNDATION_BOUNDARY_MATRIX.md`
- `docs/operations/RUNBOOK.md`
- `docs/implementation/TEST_DESIGN.md`
