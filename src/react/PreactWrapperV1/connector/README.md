# PreactWrapperV1 Connector

要素特化の sugar (型付き hook / 要素クラス組み立て / 関連型再エクスポート) を
`Connect_<tagname>.ts` の 1 ファイルに集約する場所。

`PreactWrapperV1/` 直下は要素のことを一切知らない汎用ブリッジに留め、
要素ごとの知識はすべて本フォルダに閉じ込める。

## なぜ分けるか

- 汎用ブリッジ (`<CustomElementRegion>` / `useEvent` / `useEventLatest` / `useHost`) は
  要素のイベント名・属性・method を**知らない方が再利用しやすい**
- consumer (aimg_viewer) は connector 1 個を import すれば必要な型と関数が揃う
- 要素を増やす/置き換える時、影響範囲が `Connect_<tagname>.ts` に閉じる

## 1 connector の責務 (原則)

| 責務 | 例 (`Connect_upfile_input_v2.ts`) |
| --- | --- |
| 要素クラスの DI 組み立て + レジストリ登録 | `registerUpfileInputV2Element(axnosPaintPopup)` |
| host の型付き取得 | `useUpfileV2Host(fullKey)` |
| 直近 detail の sugar (購読側ハードコードを消す) | `useUpfileV2UiHint(fullKey)` / `useUpfileV2State(fullKey)` |
| 関連型の再エクスポート | `UpfileV2Commands` / `UpfileMode` / `UpfileStateFlags` / `UpfileUiHintFlags` |

## 作法

1. **1 タグ = 1 ファイル**: `Connect_<tagname>.ts` (ケバブケース要素名)
2. **当該要素の中身に依存しない**: 内部 private プロパティではなく、
   公開 method / dispatch される CustomEvent だけを使う
3. **他 connector を読まない**: `Connect_a.ts` から `Connect_b.ts` を import しない
4. **同タグ別目的**: 別レイヤの sugar を作るなら `Connect_<tagname>_<purpose>.ts` を別ファイルで
5. **再エクスポートで完結**: consumer が「どこかで型を辿る」必要が無いように、
   その connector で扱う型はすべて再エクスポートする

## 命名

| 種類 | 規則 | 例 |
| --- | --- | --- |
| ファイル名 | `Connect_<kebab-tag>.ts` | `Connect_upfile_input_v2.ts` |
| 登録関数 | `register<PascalTag>Element` | `registerUpfileInputV2Element` |
| host 取得フック | `use<PascalTag>Host` | `useUpfileV2Host` |
| 直近 detail フック | `use<PascalTag><Detail>` | `useUpfileV2UiHint` / `useUpfileV2State` |
| host 型 | `<PascalTag>Host = HTMLElement & <Commands>` | `UpfileInputV2Host` |

## 新しい connector を追加する手順

1. 要素側 (`src/elements/<tag>.ts`) を読む。`define()` / `connectedCallback` /
   発火する `CustomEvent` / public method を確認
2. CustomEvent の `detail` 型が `src/components/types.ts` の
   `GlobalEventHandlersEventMap` 拡張に宣言されているか確認 (無ければ追加)
3. (任意) host 要素に [`LatestEventDetailProvider`](../types.ts) を実装すると、
   `useEventLatest` 系が **mount 直後 / 初回 dispatch 前から同期で初期値を返す**
4. 本フォルダに `Connect_<tagname>.ts` を作る (下記スケルトン参照)
5. consumer 側は `@nijiurachan/js/react/PreactWrapperV1/connector/Connect_<tagname>` を import
   (`package.json` の `exports` でワイルドカード公開済)

## スケルトン

```ts
import { make<Tag>Element } from "#js/elements/<tag>"
import type { <Commands>, <Detail> } from "#js/components/<fragment>"
import { registerElementClass } from "../core/define-once"
import { useEventLatest } from "../use-event-latest"
import { useHost } from "../use-host"

/** アプリ起動時に1度呼ぶ。複数回呼んでも同じクラスなら no-op、別クラスなら例外 */
export function register<Tag>Element(deps: <Deps>): void {
    registerElementClass("<tag>", make<Tag>Element(deps))
}

/** host への型付き参照。null = Region 未マウント */
export type <Tag>Host = HTMLElement & <Commands>
export function use<Tag>Host(fullKey: string): <Tag>Host | null {
    return useHost(fullKey) as <Tag>Host | null
}

/** 直近 CustomEvent.detail の sugar (selector あり版もここで生やしてOK) */
export function use<Tag>State(fullKey: string): <Detail> | undefined {
    return useEventLatest(fullKey, "<aimg:event-name>")
}

// 関連型は consumer の単一 import を保つために必ず再エクスポートする
export type { <Commands>, <Detail> } from "..."
```

## 既存 connector

| ファイル | 対象タグ | コミット |
| --- | --- | --- |
| `Connect_upfile_input_v2.ts` | `<upfile-input-v2>` | `b53093f` (refactor-ts-components-Y0kaC) |

## 関連ドキュメント

- [`../README.md`](../README.md) — `PreactWrapperV1` 汎用 API リファレンス (正本)
- [`../../../../docs/implementation/REACT_BRIDGE_PREACT_WRAPPER_V1.md`](../../../../docs/implementation/REACT_BRIDGE_PREACT_WRAPPER_V1.md) — 全体像 / 背景説明
- [`../../../../docs/implementation/AIMG_VIEWER_UPFILE_INPUT_V2_HANDOFF.md`](../../../../docs/implementation/AIMG_VIEWER_UPFILE_INPUT_V2_HANDOFF.md) — aimg_viewer 統合手順
