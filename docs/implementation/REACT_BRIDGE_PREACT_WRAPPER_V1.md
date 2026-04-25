# React ↔ Preact Custom Element 橋渡し: PreactWrapperV1 説明書

`nijiurachan-js` が AI_BBS と aimg_viewer の双方に共有部品を供給するための
**React 側橋渡しブリッジ** `PreactWrapperV1` の説明書。

| 章 | 内容 |
| --- | --- |
| 1 | なぜラッパーが必要か (背景) |
| 2 | 何を持ち込んだか (構成) |
| 3 | 利用側の最小手順 (起動 → マウント → 購読) |
| 4 | connector パターン: 要素特化 sugar の置き場 |
| 5 | 新しい connector を作る手順 |
| 6 | 詳細仕様への入口 |

> 各 API のシグネチャ・型・遅延リスナの内部仕様などの**正本**は
> [`src/react/PreactWrapperV1/README.md`](../../src/react/PreactWrapperV1/README.md) を参照する。
> 本文書はそれらを束ねる入口・概念整理。

## 1. なぜラッパーが必要か

`nijiurachan-js` の以下のような共有部品は **Preact + Custom Element** で書かれている:

- [`src/elements/upfile-input.ts`](../../src/elements/upfile-input.ts) — 添付ファイル欄
- [`src/elements/upfile-input-v2.ts`](../../src/elements/upfile-input-v2.ts) — 同 headless 版 (UI ボタンを描画しない)
- [`src/elements/wheel-reload-handler.ts`](../../src/elements/wheel-reload-handler.ts) — ホイール末尾でリロード要求
- [`src/elements/axnos-paint-host.ts`](../../src/elements/axnos-paint-host.ts) — アクノスペイント受け窓口
- ほか `lazy-turnstile.ts` / `online-users-indicator.ts` / `bouyomi-connector.ts` 等

これらを React アプリ (aimg_viewer) からそのまま呼ぶと次の摩擦が発生する。

| 問題 | 内容 |
| --- | --- |
| **二重描画** | React が JSX の中身を再レンダした瞬間、Preact が描いた DOM が消える |
| **外部 JS による DOM 破壊** | はっちゃん拡張が `<canvas id=oejs>` を `remove()` する瞬間に React が落ちる |
| **イベント受信の煩雑さ** | `useEffect` で `addEventListener` / `removeEventListener` を毎回書きたくない |
| **属性渡しの煩雑さ** | `connectedCallback` 前に `setAttribute` する必要があり、ref + useLayoutEffect が必須 |
| **要素クラスの組み立て** | `make***Element(make***Fragment(io))` のような DI を毎ファイルで書きたくない |

`PreactWrapperV1` はこれら 5 種を**要素非依存**で吸収する薄いブリッジ。
React 側は箱 (`CustomElementRegion`) を置いて、フックでイベントを購読するだけで済む。

### Preact 側の DOM を React に守らせる方針

「React VDOM の中身に Custom Element を生やす」のではなく、
**React は placeholder の `<div>` だけを管理し、Custom Element はその下に imperative に挿入する**
という構造を採る。

```
+----------------- React VDOM ----------------+
|  <div data-preact-wrapper-v1-key=...>       |   ← React 管理
|    <upfile-input-v2 data-allow-type=...>    |   ← React 管理外 (createElement+appendChild)
|      <input type=file>                      |
|      <figure id=ftbl> ... </figure>         |   ← Preact 管理
|      <canvas id=oejs>                       |   ← はっちゃん拡張に乗っ取られる可能性
|    </upfile-input-v2>                       |
|  </div>                                     |
+---------------------------------------------+
```

この構造により、

- 内部 DOM が外部 JS に破壊されても React は影響を受けない
- Preact 側の hooks がそのまま動く
- formAssociated は JSX の `<form>` 配下に置くだけで成立

## 2. 何を持ち込んだか (構成)

```
src/react/PreactWrapperV1/
├── README.md                           # API 正本 (詳細リファレンス)
├── preact-wrapper-v1.ts                # 名前空間オブジェクト
├── types.ts                            # ScopeProps / CustomElementRegionProps / LatestEventDetailProvider
├── scope.tsx                           # <Scope name=...>
├── custom-element-region.tsx           # <CustomElementRegion tag=... id=...>
├── use-event.ts                        # useEvent(fullKey, name, cb)
├── use-event-latest.ts                 # useEventLatest(fullKey, name, selector?)
├── use-host.ts                         # useHost(fullKey)  ← imperative escape hatch
├── core/
│   ├── registry.ts                     # fullKey → InstanceHandle のシングルトンレジストリ
│   ├── custom-element-mount.ts         # placeholder への createElement+appendChild
│   ├── define-once.ts                  # registerElementClass / defineOnce
│   ├── full-key.ts                     # buildFullKey(scopeName, id)
│   ├── scope-context.ts                # ScopeContext
│   └── types.ts                        # InstanceHandle 型
└── connector/                          # 要素特化 sugar の置き場
    └── Connect_upfile_input_v2.ts      # upfile-input-v2 用 connector (実装第一号)
```

### 役割分担

| レイヤ | 中身 | 要素を知っているか |
| --- | --- | --- |
| `core/` | レジストリ・マウント・define-once | **知らない** (汎用) |
| トップレベル | `<Scope>` / `<CustomElementRegion>` / `useEvent` / `useEventLatest` / `useHost` | **知らない** (汎用) |
| `connector/Connect_xxx.ts` | 要素クラス組み立て・型付き hook sugar・型再エクスポート | **知っている** (要素特化) |

`PreactWrapperV1/` 直下は要素のイベント名・属性・method 名を一切ハードコードしない。
要素ごとの知識は `connector/Connect_xxx.ts` に閉じ込める。

### 公開モジュール (consumer 側 import 形)

- `@nijiurachan/js/react/PreactWrapperV1` — 汎用ブリッジ
- `@nijiurachan/js/react/PreactWrapperV1/connector/Connect_upfile_input_v2` — upfile-v2 用 connector

`package.json` の `exports` で公開済 ([`package.json`](../../package.json#L46-L53))。

## 3. 利用側の最小手順

### 3.1 起動時 (1 度だけ)

要素クラスを組み立て、レジストリに登録する。

```ts
// 汎用パスで登録する場合
import PreactWrapperV1 from "@nijiurachan/js/react/PreactWrapperV1"
import { makeUpfileInputElement } from "@nijiurachan/js/elements/upfile-input"
import { makeUpfileInputFragment } from "@nijiurachan/js/components/upfile-input-fragment"

const UpfileInputClass = makeUpfileInputElement(
    makeUpfileInputFragment(myAxnosPaintPopup),
)
PreactWrapperV1.registerElementClass("upfile-input", UpfileInputClass)
```

```ts
// connector を経由する場合 (upfile-v2)
import { registerUpfileInputV2Element } from "@nijiurachan/js/react/PreactWrapperV1/connector/Connect_upfile_input_v2"
import { AxnosPaintPopup } from "@nijiurachan/js/io/axnos-paint-popup"

registerUpfileInputV2Element(new AxnosPaintPopup("/paint/popup.js"))
```

### 3.2 マウント

```tsx
<PreactWrapperV1.Scope name="post-form">
    <form>
        <PreactWrapperV1.CustomElementRegion
            id="upfile"
            tag="upfile-input-v2"
            attributes={{ "data-allow-type": "file,draw" }}
        />
    </form>
</PreactWrapperV1.Scope>
```

`fullKey` は `"post-form:upfile"`。`<Scope>` を省略すると `"upfile"` がそのまま fullKey になる。

### 3.3 購読

| やりたいこと | 使う API |
| --- | --- |
| 単発の CustomEvent に副作用を流したい | `useEvent(fullKey, name, cb)` |
| 直近 detail を React state として読みたい | `useEventLatest(fullKey, name, selector?)` |
| ローカルツリーで `preventDefault` 等したい | `<CustomElementRegion localHandlers={...}>` |
| host 要素の method を呼びたい (escape hatch) | `useHost(fullKey)` |

詳細仕様は [`PreactWrapperV1/README.md`](../../src/react/PreactWrapperV1/README.md#api)。

## 4. connector パターン: 要素特化 sugar の置き場

汎用ブリッジに乗せたうえで、**要素ごとの「型」と「初期化レシピ」**を 1 ファイルに集約する。
これが `connector/Connect_<element>.ts`。

### connector の責務

1. **`registerXxxElement(deps)`** — 要素クラスの DI 組み立て + `registerElementClass` 呼び出しまでを 1 関数に
2. **`useXxxHost(fullKey)`** — `useHost` の戻り値を `HTMLElement & XxxCommands` にキャストする型付き sugar
3. **`useXxxState/UiHint(fullKey)`** — `useEventLatest` をイベント名ハードコード済みで包む
4. **型の再エクスポート** — consumer が単一 import で済むよう関連型を集約

### connector の作法 (重要)

- `connector/` 直下に `Connect_<tagname>.ts` の 1 ファイルとして置く
- 当該要素以外への依存は持ち込まない (`Connect_a.ts` から `Connect_b.ts` を読まない)
- 要素クラス内部 (`#latestStateFlags` 等) には触らない。public な host method / event だけを使う
- 拡張したくなったら `Connect_<tagname>_<purpose>.ts` で別ファイルを増やす

### 実装第一号: `Connect_upfile_input_v2.ts`

[ファイル](../../src/react/PreactWrapperV1/connector/Connect_upfile_input_v2.ts) はちょうど 60 行。役割は:

```ts
// (1) 要素クラスを組み立てて登録
export function registerUpfileInputV2Element(axnosPaintPopup: IAxnosPaintPopup): void

// (2) 型付き host 取得
export type UpfileInputV2Host = HTMLElement & UpfileV2Commands
export function useUpfileV2Host(fullKey: string): UpfileInputV2Host | null

// (3) 直近 UI hint / state の sugar
export function useUpfileV2UiHint(fullKey: string): UpfileUiHintFlags | undefined
export function useUpfileV2State(fullKey: string): UpfileStateFlags | undefined

// (4) 関連型を再エクスポート
export type { UpfileV2Commands, UpfileMode, UpfileStateFlags, UpfileUiHintFlags }
```

これにより consumer 側は次の 1 import だけで済む:

```ts
import {
    registerUpfileInputV2Element,
    useUpfileV2Host,
    useUpfileV2UiHint,
    useUpfileV2State,
    type UpfileV2Commands,
} from "@nijiurachan/js/react/PreactWrapperV1/connector/Connect_upfile_input_v2"
```

### 初期値 pull の仕組み (`LatestEventDetailProvider`)

`useEventLatest` の本来の挙動は「初回 dispatch までは `undefined`」なので、
**Region マウント直後の 1 フレームだけ UI がチラつく** 問題があった。

これを解消するために、host 要素が次の shape を実装すると `useEventLatest` が
**マウント後すぐ同期で初期値を pull** する経路を追加した:

```ts
interface LatestEventDetailProvider {
    getLatestEventDetail(eventName: string): unknown | undefined
}
```

`upfile-input-v2` は `connectedCallback` 内で render より前に
`#latestUiHint` / `#latestStateFlags` を mode=empty の値で種まきしてあるので、
`useUpfileV2UiHint` / `useUpfileV2State` は mount 後の最初の render から正しい値を返す
([`upfile-input-v2.ts:45-58`](../../src/elements/upfile-input-v2.ts))。

新しい connector を書くときは、host 要素がこの shape を満たすかどうかを把握しておく
(満たしていなくても動くが、初回 undefined ガードが consumer 側に必要になる)。

## 5. 新しい connector を作る手順

例: `wheel-reload-handler` 用 connector を作りたい場合の手順 (現在は未実装)。

### 手順

1. **要素側を確認** — `src/elements/<tag>.ts` の `static define()` / `connectedCallback` /
   発火する CustomEvent / 公開 method を読む
2. **CustomEvent の型契約を確認** — `src/components/types.ts` の `GlobalEventHandlersEventMap` 拡張に
   そのイベントが宣言されているか確認 (無ければ追加する)
3. **`connector/Connect_<tagname>.ts` を新規作成** — 上記 4 つの責務を満たす
4. **必要なら `LatestEventDetailProvider` を要素側に実装** — 「初回 undefined ガードを書きたくない」場合だけ
5. **README に追記** — `src/react/PreactWrapperV1/README.md` の「連関 sugar」表 + `package.json#exports` (連関は既にワイルドカード公開済なのでそのまま使える)

### スケルトン

```ts
// src/react/PreactWrapperV1/connector/Connect_<tagname>.ts
import { make<Tag>Element } from "#js/elements/<tag>"
import { registerElementClass } from "../core/define-once"
import { useEventLatest } from "../use-event-latest"
import { useHost } from "../use-host"

/** 要素クラスを組み立ててレジストリに登録 (アプリ起動時に1度) */
export function register<Tag>Element(deps: <Deps>): void {
    registerElementClass("<tag>", make<Tag>Element(deps))
}

/** host への型付き参照 */
export type <Tag>Host = HTMLElement & <TagCommands>
export function use<Tag>Host(fullKey: string): <Tag>Host | null {
    return useHost(fullKey) as <Tag>Host | null
}

/** 直近イベントの sugar */
export function use<Tag>State(fullKey: string): <TagState> | undefined {
    return useEventLatest(fullKey, "<event-name>")
}

/** 関連型の再エクスポート */
export type { <TagCommands>, <TagState> } from "..."
```

### 命名の指針

- ファイル名: `Connect_<tagname>.ts` (PascalCase の `Connect_` プレフィックス + ケバブケース要素名)
- 公開関数名: `register<Tag>Element` / `use<Tag>Host` / `use<Tag><State>` (PascalCase 要素名)
- 「同じ要素・別目的」で複数 connector を作るなら `Connect_<tagname>_<purpose>.ts`

## 6. 詳細仕様への入口

| 知りたいこと | 参照先 |
| --- | --- |
| 各 API のシグネチャ / 戻り値型 / 遅延リスナの内部 | [`src/react/PreactWrapperV1/README.md`](../../src/react/PreactWrapperV1/README.md) |
| connector パターンの作法 / 新規追加スケルトン | [`src/react/PreactWrapperV1/connector/README.md`](../../src/react/PreactWrapperV1/connector/README.md) |
| upfile-input v1 / v2 の違い | [`src/elements/upfile-input.ts`](../../src/elements/upfile-input.ts) と [`src/elements/upfile-input-v2.ts`](../../src/elements/upfile-input-v2.ts) を読み比べる |
| 共通基盤のどこに何を置くか (境界整理) | [`docs/specs/FOUNDATION_BOUNDARY_MATRIX.md`](../specs/FOUNDATION_BOUNDARY_MATRIX.md) |
| イベント契約 (`aimg:*`) | [`src/components/types.ts`](../../src/components/types.ts) |
| upfile の状態遷移ロジック | [`src/pure/upfile.ts`](../../src/pure/upfile.ts) |
| `bun link` で symlink 利用するときの注意 | [`src/react/PreactWrapperV1/README.md` §インストール](../../src/react/PreactWrapperV1/README.md) |

## 7. 制限事項 / 未着手 (V1)

- `<Scope>` のネスト未対応 (検出時は開発時例外)
- `localHandlers` のキー集合は Region マウント時にスナップショット (render 中の動的増減追随なし)
- SSR HTML 中に Custom Element 自体は出ない (`useLayoutEffect` がクライアント初回描画で走る形)
- pull 系の API (`getFile()` 等) はまだ。今は CustomEvent push + host method の 2 経路のみ
- v2 化されているのは upfile のみ。他の要素 (`wheel-reload-handler` 等) には connector 未着手
- 破壊変更が必要になったら `PreactWrapperV2/` を新設する方針 (V1 はそのまま残す)
