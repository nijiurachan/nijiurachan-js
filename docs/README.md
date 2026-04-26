# nijiurachan-js ドキュメント入口

本ディレクトリは、`nijiurachan-js` の役割、要件、設計、実装準備文書の入口として扱う。
ルート README は概要説明として残しつつ、共通基盤としての正本は本ディレクトリに集約する。

## 1. 読み順と各文書の位置づけ

1. [`docs/README.md`](./README.md): リポジトリ概要
2. [`docs/BIRDSEYE.md`](./BIRDSEYE.md): 全体像
3. [`docs/requirements/SHARED_UI_FOUNDATION_REQUIREMENTS.md`](./requirements/SHARED_UI_FOUNDATION_REQUIREMENTS.md): Phase 1 / 3 / 4 を支える共通基盤要件
4. [`docs/specs/ARCHITECTURE_PHASE1_TO_PHASE4.md`](./specs/ARCHITECTURE_PHASE1_TO_PHASE4.md): Preact / Custom Elements と将来クライアントの境界を定義する設計方針
5. [`docs/specs/FOUNDATION_BOUNDARY_MATRIX.md`](./specs/FOUNDATION_BOUNDARY_MATRIX.md): 共通基盤に残すものと各アプリ側へ出すものの境界整理
6. [`docs/specs/MEMO_REACT_BRIDGE_DECISION.md`](./specs/MEMO_REACT_BRIDGE_DECISION.md): PreactWrapperV1 設計時、ラッパーという形式を選んだことについての考察
7. [`docs/operations/RUNBOOK.md`](./operations/RUNBOOK.md): 運用・公開・更新時の判断入口
8. [`docs/operations/IMPLEMENTATION_BOTTLENECK_REVIEW.md`](./operations/IMPLEMENTATION_BOTTLENECK_REVIEW.md): 共通基盤として崩れやすい箇所の優先度レビュー
9. [`docs/implementation/TEST_DESIGN.md`](./implementation/TEST_DESIGN.md): 設計レベルの確認観点
10. [`docs/implementation/REACT_BRIDGE_PREACT_WRAPPER_V1.md`](./implementation/REACT_BRIDGE_PREACT_WRAPPER_V1.md): React アプリ向け橋渡し `PreactWrapperV1` と connector パターンの説明書
11. [`README.md`](../README.md): リポジトリ概要
12. [`src/README.md`](../src/README.md): 現行の依存方向と開発スタイルの設計メモ

## 2. 正本ドキュメント

- 要件正本: [`docs/requirements/SHARED_UI_FOUNDATION_REQUIREMENTS.md`](./requirements/SHARED_UI_FOUNDATION_REQUIREMENTS.md)
- アーキテクチャ正本: [`docs/specs/ARCHITECTURE_PHASE1_TO_PHASE4.md`](./specs/ARCHITECTURE_PHASE1_TO_PHASE4.md)
- 境界整理: [`docs/specs/FOUNDATION_BOUNDARY_MATRIX.md`](./specs/FOUNDATION_BOUNDARY_MATRIX.md)

## 3. 入口ドキュメント

- 俯瞰入口: [`docs/BIRDSEYE.md`](./BIRDSEYE.md)
- docs 入口: `docs/README.md` (本ドキュメント)
- 運用入口: [`docs/operations/RUNBOOK.md`](./operations/RUNBOOK.md)
- 実装レビュー入口: [`docs/operations/IMPLEMENTATION_BOTTLENECK_REVIEW.md`](./operations/IMPLEMENTATION_BOTTLENECK_REVIEW.md)
- 確認観点入口: [`docs/implementation/TEST_DESIGN.md`](./implementation/TEST_DESIGN.md)

## 4. 更新順

1. 要件変更
2. アーキテクチャ方針更新
3. 境界マトリクス / ボトルネックレビュー更新
4. テスト設計 / Runbook 更新
5. README / Birdseye / Hub 同期
