# PreactWrapperV1

React/TSクライアント (主に `aimg_viewer`) から、`nijiurachan-js` の Custom Element (Preact 内部描画) を安全に使うためのブリッジ。

v1 は **`<upfile-input>` 専用**。将来 `wheel-reload-handler` / `axnos-paint-host` を足す場合も同じ `PreactWrapperV1` 名前空間にコンポーネントを追加する。破壊変更が必要になったときは `PreactWrapperV2` を新設して並立させる。

## インストールと初期化

1. **依存の追加**  
   `react` を `>=18` で導入。`nijiurachan-js` は `optional peerDependency` として `react` を宣言している。

2. **Custom Element クラスの DI**  
   `<upfile-input>` は `nijiurachan-js` の構造上、アプリ側でファクトリを組み立てる必要がある。
   アプリ起動時の一度だけクラスを登録する:

   ```ts
   import { PreactWrapperV1 } from "@nijiurachan/js/react/PreactWrapperV1"
   import { makeUpfileInputElement } from "@nijiurachan/js/elements/upfile-input"
   import { makeUpfileInputFragment } from "@nijiurachan/js/components/upfile-input-fragment"
   import { myAxnosPaintPopup } from "./axnos"

   const UpfileInputClass = makeUpfileInputElement(
       makeUpfileInputFragment(myAxnosPaintPopup),
   )
   PreactWrapperV1.registerUpfileInputElement(UpfileInputClass)
   ```

   - `defineOnce` が実マウントの直前で `customElements.define` を呼ぶので、登録と実描画の順序は緩い (登録が先ならOK)
   - 未登録のまま `<UpfileInput>` をマウントしようとすると開発時エラー

## API

```ts
import { PreactWrapperV1 } from "@nijiurachan/js/react/PreactWrapperV1"
```

`PreactWrapperV1` は次のプロパティを持つオブジェクト:

| 名前 | 種類 | 役割 |
| --- | --- | --- |
| `Scope` | Component | 配下 `<UpfileInput>` の `fullKey` を `"<name>:id"` にする名前空間 |
| `UpfileInput` | Component | 型付き `<upfile-input>` ラッパ |
| `useUpfileState(fullKey, selector?)` | Hook | 5 フラグ状態を購読 (値として) |
| `useUpfileEvent(fullKey, name, cb)` | Hook | CustomEvent を副作用型で購読 |
| `useUpfileEventLatest(fullKey, name)` | Hook | CustomEvent の直近 detail を値として取得 |
| `registerUpfileInputElement(cls)` | Function | 要素クラスの DI |

### `<Scope name="...">`

```tsx
<form>
  <PreactWrapperV1.Scope name="post-form">
    <PreactWrapperV1.UpfileInput id="main" allowType="file" />
  </PreactWrapperV1.Scope>
</form>
```

- 配下の `<UpfileInput id="main">` の `fullKey` は `"post-form:main"` になる
- Scope なしの場合は `fullKey` = `id` そのまま
- **ネスト禁止**: 親 Scope が既にある状態でもう一度 `<Scope>` を置くと例外。シンプルさ優先の初期方針
- `name` は空文字不可

### `<UpfileInput>`

```tsx
<PreactWrapperV1.UpfileInput
  id="main"
  allowType="file"
  onReloading={(e) => {
    if (isSubmitting) e.preventDefault()
  }}
  onPainted={(e) => handlePainted(e.detail)}
  onUpfileState={(e) => console.debug("flags", e.detail)}
/>
```

| prop | 型 | 役割 |
| --- | --- | --- |
| `id` | `string` | 必須。`Scope` と合成して fullKey 化 |
| `allowType` | `string` | **必須**。`data-allow-type` にマップ。`"file"` で画像添付+お絵描き、それ以外 (例: `"paint"`) でお絵描きのみ |
| `className` | `string` | placeholder の `<div>` に反映 (内部 `<upfile-input>` には波及しない) |
| `style` | `CSSProperties` | 同上 |
| `onReloading` | `(e: CustomEvent<{isFullReload:boolean}>) => void` | リロード抑止判定用。`e.preventDefault()` が効く |
| `onPainted` | `(e: CustomEvent<...>) => void` | アクノスペイントのお絵描き完了 |
| `onHacchanStart` | `(e: CustomEvent<void>) => void` | はっちゃん起動検知 |
| `onPopupFormToggled` | `(e: CustomEvent<{isCollapsed:boolean}>) => void` | 投稿フォーム開閉 |
| `onUpfileState` | `(e: CustomEvent<UpfileStateFlags>) => void` | 状態フラグ更新 (ローカル観測用) |

**描画構造**:

```html
<div class="..." data-preact-wrapper-v1-key="post-form:main">
  <upfile-input data-allow-type="file">
    <!-- Preact がここを描画する。React は一切触らない -->
  </upfile-input>
</div>
```

- React は placeholder `<div>` だけを管理し、`<upfile-input>` とその内部には干渉しない
- はっちゃん/axnospaint 等の外部 JS が内部を `remove()` / `innerHTML = ""` しても React のアンマウントは安全
- formAssociated は JSX で `<form>` 配下に置くだけで成立

### `useUpfileState(fullKey, selector?)`

```tsx
function SubmitButton() {
  const isBusy = PreactWrapperV1.useUpfileState(
    "post-form:main",
    (s) => s.isBusy,
  )
  return <button disabled={isBusy}>送信</button>
}
```

- `selector` 省略時は `UpfileStateFlags` そのものを返す
- selector 結果が前回と同じ参照なら consumer は再レンダされない (`useSyncExternalStore`)
- 要素未マウント / 状態未受信の間は `undefined` が返る (selector は呼ばない)

`UpfileStateFlags` (初期案、実運用で調整予定):

```ts
type UpfileStateFlags = {
  hasSelectedFile: boolean       // ファイル添付中 (プレビューあり)
  isAxnosOpen: boolean           // アクノスペイント待機中
  isHacchanOpen: boolean         // はっちゃん待機中
  isBusy: boolean                // 上記いずれか (作業中)
  isPopupFormCollapsed: boolean  // 投稿フォーム折り畳み中
}
```

### `useUpfileEvent(fullKey, eventName, callback)`

```tsx
function PaintToast() {
  PreactWrapperV1.useUpfileEvent("post-form:main", "aimg:painted", (e) => {
    toast.success("画像を保存しました")
  })
  return null
}
```

- `callback` は毎レンダで差し替えてOK (ref で保持、リスナ張替えは起きない)
- `eventName` は `GlobalEventHandlersEventMap` の `aimg:*` キーから型で絞られる
- `<UpfileInput>` がマウントされる前にフックを呼んでも安全 (ハンドルは遅延生成)

### `useUpfileEventLatest(fullKey, eventName)`

```tsx
function LastPaint() {
  const detail = PreactWrapperV1.useUpfileEventLatest(
    "post-form:main",
    "aimg:painted",
  )
  return detail ? <img src={URL.createObjectURL(detail.image!)} /> : null
}
```

- 最後に受信した CustomEvent の `detail` を値として返す (`undefined` if 未受信)
- 値として扱えるので JSX に直接埋められる

## キーの解決規則

- Scope 内: `fullKey = "<scopeName>:<id>"`
- Scope 外: `fullKey = "<id>"`
- フック (`useUpfileState` 等) は常に `fullKey` 文字列を直接受け取る。ツリーの位置に依存しない (=外部パネルからも読める)

## 堅牢性

### 内部 DOM が外部 JS に破壊されても落ちない

- React は `<upfile-input>` の**外側**の `<div>` しか管理しない
- `<upfile-input>` と内部の Preact 描画領域は `document.createElement` + `appendChild` で React VDOM の外側に生成
- アンマウントは `placeholder.contains(host) && placeholder.removeChild(host)` のガード付きなので、ホストが既に外部 JS に消されていても例外にならない

### やらないこと (利用側の責務)

- placeholder の `<div>` 自体が外部 JS に消された場合: React が警告を出す可能性あり。ラッパ外側の構造に手を入れる外部 JS は想定外
- `<upfile-input>` の `data-*` 属性を外部 JS が書き換えた場合: 次の `useEffect` の diff 反映で上書きされる

## 制限事項 (v1)

- `Scope` のネスト未対応
- `<upfile-input>` 以外の要素 (`wheel-reload-handler` / `axnos-paint-host`) 未対応
- `aimg:painted` は要素仕様上 `window` ターゲットだが、このラッパは host 上で受けた場合のみ配信する
  (要素側で `bubbles: true` で発火している範囲でのみ到達)
- SSR 時は `defineOnce` と `useLayoutEffect` がクライアント初回描画で走る。SSR HTML 中に `<upfile-input>` 自体は出ない

## 破壊変更を入れたくなったら

`src/react/PreactWrapperV2/` を新設して独自の `core/` を持つ。V1 はそのまま残す。外部からは `@nijiurachan/js/react/PreactWrapperV1` / `...V2` と選択可能。

## 関連

- `src/elements/upfile-input.ts` — ラップ対象の Custom Element
- `src/components/upfile-input-fragment.tsx` — 内部の Preact コンポーネント。`onStateChange` コールバックで状態を伝搬
- `src/pure/upfile.ts` — `UpfileMode` / `UpfileStateFlags` / `toUpfileStateFlags`
- `src/components/types.ts` — `aimg:upfile-state` CustomEvent 契約
