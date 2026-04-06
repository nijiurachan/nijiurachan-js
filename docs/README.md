# nijiurachan-js ドキュメント入口

本ディレクトリは、`nijiurachan-js` の役割、要件、設計、実装準備文書の入口として扱う。
ルート README は概要説明として残しつつ、共通基盤としての正本は本ディレクトリに集約する。

## 読み順

1. `docs/README.md`
2. `docs/BIRDSEYE.md`
3. `docs/DOCUMENT_HUB.md`
4. `docs/requirements/SHARED_UI_FOUNDATION_REQUIREMENTS.md`
5. `docs/specs/ARCHITECTURE_PHASE1_TO_PHASE4.md`
6. `docs/specs/FOUNDATION_BOUNDARY_MATRIX.md`
7. `docs/operations/RUNBOOK.md`
8. `docs/operations/IMPLEMENTATION_BOTTLENECK_REVIEW.md`
9. `docs/implementation/TEST_DESIGN.md`
10. `README.md`
11. `src/README.md`

## 位置づけ

- `README.md`
  - リポジトリ概要の入口
- `src/README.md`
  - 現行の依存方向と開発スタイルの設計メモ
- `docs/requirements/SHARED_UI_FOUNDATION_REQUIREMENTS.md`
  - Phase 1 / 3 / 4 を支える共通基盤要件
- `docs/specs/ARCHITECTURE_PHASE1_TO_PHASE4.md`
  - Preact / Custom Elements と将来クライアントの境界を定義する設計方針
- `docs/specs/FOUNDATION_BOUNDARY_MATRIX.md`
  - 共通基盤に残すものと各アプリ側へ出すものの境界整理
- `docs/operations/RUNBOOK.md`
  - 運用・公開・更新時の判断入口
- `docs/operations/IMPLEMENTATION_BOTTLENECK_REVIEW.md`
  - 共通基盤として崩れやすい箇所の優先度レビュー
- `docs/implementation/TEST_DESIGN.md`
  - 設計レベルの確認観点
