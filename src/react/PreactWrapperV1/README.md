# PreactWrapperV1

React/TS クライアントから、`nijiurachan-js` の Custom Element (Preact 内部描画) を安全に使うための**汎用ブリッジ**。

本バージョンは「要素非依存の generic API」に限定する。特定要素 (upfile-input 等) 向けの型付き sugar は `connector/Connect_***_upfile.ts` (将来) に分離する。

## 責務

1. **Preact パーツを扱うための箱** — Custom Element を React VDOM の外側に imperative マウント
2. **ハンドラ外部購読の窓口** — ツリー外から CustomEvent を副作用型で購読 (`useEvent`)
3. **フラグ/直近 detail の受け渡し窓口** — 直近 CustomEvent.detail を値として購読 (`useEventLatest`)
4. **React に管理されない Custom Element を置くための窓口** — 内部 DOM が外部 JS に破壊されても React が落ちない堅牢性
5. **名前空間の窓口** — `<Scope>` と `buildFullKey` で要素インスタンスの識別子を分離

## インストールと初期化

1. **依存の追加**
   `react` を `>=18` で導入。`nijiurachan-js` は `optional peerDependency` として `react` を宣言している。

2. **Custom Element クラスの DI**
   `nijiurachan-js` の要素はアプリ側でファクトリを組み立てる必要があるため、
   アプリ起動時に一度だけクラスを登録する:

   ```ts
   import { PreactWrapperV1 } from "@nijiurachan/js/react/PreactWrapperV1"
   import { makeUpfileInputElement } from "@nijiurachan/js/elements/upfile-input"
   import { makeUpfileInputFragment } from "@nijiurachan/js/components/upfile-input-fragment"
   import { myAxnosPaintPopup } from "./axnos"

   const UpfileInputClass = makeUpfileInputElement(
       makeUpfileInputFragment(myAxnosPaintPopup),
   )
   PreactWrapperV1.registerElementClass("upfile-input", UpfileInputClass)
   ```

   - `defineOnce` が実マウントの直前で `customElements.define` を呼ぶ (登録が先ならOK)
   - 未登録のまま `<CustomElementRegion tag="...">` をマウントしようとすると開発時エラー

## API

```ts
import { PreactWrapperV1 } from "@nijiurachan/js/react/PreactWrapperV1"
```

| 名前 | 種類 | 役割 |
| --- | --- | --- |
| `Scope` | Component | 配下 Region の `fullKey` を `"<name>:id"` にする名前空間 |
| `CustomElementRegion` | Component | 任意 Custom Element を React 外側にマウントする「箱」 |
| `useEvent(fullKey, eventName, cb)` | Hook | CustomEvent を副作用型で購読 |
| `useEventLatest(fullKey, eventName, selector?)` | Hook | 直近 CustomEvent.detail を値として取得 (任意 selector で絞り込み) |
| `registerElementClass(tag, cls)` | Function | 要素クラスの DI |
| `buildFullKey(scopeName, id)` | Function | `fullKey` の組み立てユーティリティ |

### `<Scope name="...">`

```tsx
<form>
  <PreactWrapperV1.Scope name="post-form">
    <PreactWrapperV1.CustomElementRegion
      tag="upfile-input"
      id="main"
      attributes={{ "data-allow-type": "file" }}
    />
  </PreactWrapperV1.Scope>
</form>
```

- 配下の `<CustomElementRegion id="main">` の `fullKey` は `"post-form:main"` になる
- Scope なしの場合は `fullKey` = `id` そのまま
- **ネスト禁止**: 親 Scope が既にある状態でもう一度 `<Scope>` を置くと例外
- `name` は空文字不可

### `<CustomElementRegion>`

```tsx
<PreactWrapperV1.CustomElementRegion
  tag="upfile-input"
  id="main"
  attributes={{ "data-allow-type": "file" }}
  localHandlers={{
    "aimg:reloading": (e) => {
      if (isSubmitting) e.preventDefault()
    },
    "aimg:painted": (e) => savePainted(e.detail),
  }}
/>
```

| prop | 型 | 役割 |
| --- | --- | --- |
| `tag` | `string` | 必須。内部に生成する Custom Element のタグ名 |
| `id` | `string` | 必須。`Scope` と合成して fullKey 化 |
| `attributes` | `Record<string, string \| undefined>` | `connectedCallback` が要求する属性はここで渡す。appendChild 前に `setAttribute` される |
| `localHandlers` | `LocalHandlers` | Region 内でローカルに購読したい CustomEvent。`GlobalEventHandlersEventMap` 拡張で detail 型が narrow される |
| `className` | `string` | placeholder の `<div>` に反映 |
| `style` | `CSSProperties` | 同上 |

**描画構造**:

```html
<div class="..." data-preact-wrapper-v1-key="post-form:main">
  <upfile-input data-allow-type="file">
    <!-- Preact がここを描画する。React は一切触らない -->
  </upfile-input>
</div>
```

- React は placeholder `<div>` だけを管理し、内部要素には干渉しない
- はっちゃん/axnospaint 等の外部 JS が内部を `remove()` / `innerHTML = ""` しても React のアンマウントは安全
- formAssociated は JSX で `<form>` 配下に置くだけで成立

### `useEvent(fullKey, eventName, callback)`

```tsx
function PaintToast() {
  PreactWrapperV1.useEvent("post-form:main", "aimg:painted", (e) => {
    toast.success("画像を保存しました")
  })
  return null
}
```

- `callback` は毎レンダで差し替えてOK (ref で保持、リスナ張替えは起きない)
- `eventName` は `GlobalEventHandlersEventMap` で型が絞られる (要素側で `declare global` 拡張している範囲で detail まで narrow)
- Region がマウントされる前にフックを呼んでも安全 (ハンドルは遅延生成)

### `useEventLatest(fullKey, eventName, selector?)`

```tsx
// selectorなし: detail をそのまま受け取る
function LastPaint() {
  const detail = PreactWrapperV1.useEventLatest(
    "post-form:main",
    "aimg:painted",
  )
  return detail ? <img src={URL.createObjectURL(detail.image!)} /> : null
}

// selectorあり: フラグや一部分だけ取り出す。前回と同値なら consumer は再レンダされない
function SubmitButton() {
  const isBusy = PreactWrapperV1.useEventLatest(
    "post-form:main",
    "aimg:upfile-state",
    (d) => d.isBusy,
  )
  return <button disabled={isBusy}>送信</button>
}
```

- `selector` 省略時は detail そのものを返す
- `selector` あり時は戻り値をキャッシュし、前回と同一参照なら consumer は再レンダされない (`useSyncExternalStore`)
- Region 未マウント / イベント未受信の間は `undefined` が返る (selector は呼ばない)
- 非 `CustomEvent` のイベント (`detail` を持たない) は型レベルで `never` 推論されて弾かれる

### `registerElementClass(tag, cls)`

- アプリ起動時に 1 度だけ呼ぶ
- `defineOnce` 内で未登録 tag が要求されたときに使う元
- 同じ tag に異なるクラスを登録しようとすると例外

### `buildFullKey(scopeName, id)`

- `<Scope>` 外の兄弟ツリーから購読する際、`fullKey` を組み立てるユーティリティ
- `scopeName === undefined` なら `id` をそのまま返す

## 遅延リスナ

- host に `addEventListener` を張るタイミングは、「どの購読者 (`useEvent` / `useEventLatest` / Region の `localHandlers`) が要求したか」で決まる
- 購読者ゼロになったら `removeEventListener` する
- Region がマウントされる前にフックが `useEvent` した場合、registry はリスナオブジェクトを保留し、`attachHost` 時にまとめて付ける

この設計により generic body はイベント名の一覧を一切ハードコードしない。

## 堅牢性

### 内部 DOM が外部 JS に破壊されても落ちない

- React は `<upfile-input>` の**外側**の `<div>` しか管理しない
- Custom Element と内部の Preact 描画領域は `document.createElement` + `appendChild` で React VDOM の外側に生成
- アンマウントは `placeholder.contains(host) && placeholder.removeChild(host)` のガード付きなので、ホストが既に外部 JS に消されていても例外にならない

### やらないこと (利用側の責務)

- placeholder の `<div>` 自体が外部 JS に消された場合: React が警告を出す可能性あり。ラッパ外側の構造に手を入れる外部 JS は想定外
- 属性を外部 JS が書き換えた場合: 次の `useEffect` の diff 反映で上書きされる

## 制限事項 (v1)

- `Scope` のネスト未対応
- `localHandlers` のキー集合は Region マウント時にスナップショット (render 間で増減しても追随しない)
- SSR 時は `defineOnce` と `useLayoutEffect` がクライアント初回描画で走る。SSR HTML 中に Custom Element 自体は出ない

## 要素特化 sugar について (`connector/`)

特定要素 (例: `upfile-input`) のためのタイプセーフな入口は、将来 `src/react/PreactWrapperV1/connector/Connect_***_upfile.ts` のような単一ファイルに集約する想定。提供されるものの例 (未実装):

- 要素専用の型付き Component (`UpfileInputProps` を持ち、属性マップを内蔵)
- 要素専用のフック型付きエイリアス (`useUpfileState(fullKey, selector?)` のような糖衣)
- 要素クラス登録のラッパ (`registerUpfileInputElement`)

`PreactWrapperV1/` 直下は要素に関する知識を一切持たない。

## 破壊変更を入れたくなったら

`src/react/PreactWrapperV2/` を新設して独自の `core/` を持つ。V1 はそのまま残す。外部からは `@nijiurachan/js/react/PreactWrapperV1` / `...V2` と選択可能。

## 関連

- `src/elements/*` — ラップ対象の Custom Element 群
- `src/components/types.ts` — `aimg:*` CustomEvent 契約 (`GlobalEventHandlersEventMap` 拡張)
- `src/pure/upfile.ts` — upfile 関連の純粋ロジック (state flags 等)
