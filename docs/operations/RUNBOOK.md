# nijiurachan-js Runbook

本ドキュメントは、`nijiurachan-js` の更新、公開、利用判断の入口である。

## 1. 参照順

1. `docs/BIRDSEYE.md`
2. `docs/requirements/SHARED_UI_FOUNDATION_REQUIREMENTS.md`
3. `docs/specs/ARCHITECTURE_PHASE1_TO_PHASE4.md`
4. `docs/specs/FOUNDATION_BOUNDARY_MATRIX.md`
5. `docs/operations/IMPLEMENTATION_BOTTLENECK_REVIEW.md`
6. `docs/implementation/TEST_DESIGN.md`
7. `src/README.md`

## 2. 運用上の要点

- この repo はアプリ本体ではなく共通基盤である
- クライアント固有要求より、横断再利用を優先する
- `pure` の再利用性を最重要に扱う

## 3. 更新時に確認すること

- 依存方向が崩れていないか
- `pure` に DOM や通信が入っていないか
- 新しい部品が `AI_BBS/ts` と `aimg_viewer` のどちらにも役立つか
- クライアント専用都合をこの repo に持ち込みすぎていないか

## 4. 今後詰めること

- React 系クライアントでの再利用方法の整理
- Turnstile / 添付入力 / paint 連携の共通契約
- どこまでを共通基盤へ寄せ、どこからをアプリ側に残すかの運用線
- 直近レビューは `docs/operations/IMPLEMENTATION_BOTTLENECK_REVIEW.md` を参照する

## 5. 更新ルール

- 要件と設計の正本は `requirements` / `specs` 側に置く
- Runbook には利用判断と更新時の確認ポイントのみを寄せる
