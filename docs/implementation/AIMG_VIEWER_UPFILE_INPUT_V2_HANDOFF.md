# aimg_viewer統合ハンドオフ: upfile-input-v2

前セッション (`claude/refactor-ts-components-Y0kaC` ブランチ・コミット `b53093f`)
で`nijiurachan-js`に追加した**headless版upfile-input-v2**を、別リポジトリ
`aimg_viewer` (Reactアプリ) から利用するための引き継ぎ資料。

## 1. ゴール

aimg_viewerの投稿フォームに画像添付・お絵描き機能を組み込みたい。UIボタン
(📎/🎨/📋/🗑) はaimg_viewer側のReactコンポーネントとして書きたいが、
添付ファイルの状態遷移 (empty / file-attached / waiting-axnos / waiting-hacchan) と
ドメインロジック (アクノスペイント連携、はっちゃん待ち受け、クリップボード貼付、
フォーム送信時の画像変換) は`nijiurachan-js`の`upfile-input-v2`に任せる。

### v1との違い (重要)

| | v1 (`upfile-input`) | v2 (`upfile-input-v2`) |
|---|---|---|
| ボタン等のUI | 要素内部でPreactが描画 | **描画しない** (外が描く) |
| 画像添付不可label | 要素内部で描画 | **描画しない** (外が描く) |
| 状態通知 | `aimg:upfile-state` event | `aimg:upfile-state` event (同じ) |
| UI推奨フラグ | なし | `aimg:upfile-ui-hint` event (新規) |
| 外からの操作 | できない (内部ボタンを押すしか) | `clickFileattach/clickPaint/clickPaste/clickClear` method |
| はっちゃん用DOM | 要素内部に保持 | 要素内部に保持 (v1と同じ) |

aimg_viewerでは**v2を使うこと**。v1はAI_BBS (従来のPHP/素JS掲示板) 向けに並走中。

## 2. 技術スタック前提 (aimg_viewer側)

- React 18 or 19
- `@nijiurachan/js`を依存に入れる (peerDep: preact, react, zustand, lodash-es,
  axnospaint-for-aimg)
- `PreactWrapperV1`経由でCustom Elementと通信する
  - Custom Elementは**Reactの管理外**にplaceholderとしてマウント
  - Reactは`useHost`でhost要素への参照、`useEventLatest`でイベント直近値を取る

## 3. `nijiurachan-js`側の公開API (v2用)

### 3.1 登録 (アプリ起動時に1度)

```ts
import PreactWrapperV1 from "@nijiurachan/js/react/PreactWrapperV1"
import { registerUpfileInputV2Element } from "@nijiurachan/js/react/PreactWrapperV1/connector/Connect_upfile_input_v2"
import { AxnosPaintPopup } from "@nijiurachan/js/io/axnos-paint-popup"

// srcはアクノスペイントのポップアップページが読み込むスクリプトのURL
// (aimg_viewerで用意する or nijiurachan-js同梱のページを指す)
const axnosPaintPopup = new AxnosPaintPopup("/paint/popup.js")
registerUpfileInputV2Element(axnosPaintPopup)
```

登録は**アプリ起動時に1度だけ**。複数回呼んでも安全 (既に同じクラスが登録済みなら
no-op、違うクラスなら例外)。

### 3.2 マウント

```tsx
<PreactWrapperV1.Scope name="post-form">
    <form>
        <PreactWrapperV1.CustomElementRegion
            id="upfile"
            tag="upfile-input-v2"
            attributes={{ "data-allow-type": "file,draw" }}
        />
        {/* ↓ aimg_viewer側のツールバーReactコンポーネント */}
        <UpfileToolbar fullKey={PreactWrapperV1.buildFullKey("post-form", "upfile")} />
    </form>
</PreactWrapperV1.Scope>
```

#### `data-allow-type`属性の意味 (v1と同じ)

- `"file,draw"` → 画像添付OK + お絵描きOK (普通の投稿フォーム)
- `"draw"` → お絵描きのみ (画像添付禁止板)

`allowImageReplies`フラグは属性に`"file"`が含まれるかで決まる (v1互換)。

### 3.3 イベント契約

v2 host要素は次のCustomEventを**bubbles**で発火する。

#### `aimg:upfile-state: CustomEvent<UpfileStateFlags>`

状態が変わったとき発火。投稿ボタンの`disabled`判定・リロードガード等に使う。

```ts
interface UpfileStateFlags {
    hasSelectedFile: boolean        // プレビュー表示中
    isAxnosOpen: boolean            // アクノスペイント起動中
    isHacchanOpen: boolean          // はっちゃん待機中
    isBusy: boolean                 // 何らかの作業中 (上3つのOR)
    isPopupFormCollapsed: boolean   // フォームが折り畳まれている
}
```

#### `aimg:upfile-ui-hint: CustomEvent<UpfileUiHintFlags>` ★v2新規

「今どのボタンを出すべきか」の推奨フラグ。外部ツールバーが購読して表示を出し分ける。

```ts
interface UpfileUiHintFlags {
    showAllowImageLabel: boolean  // 「画像添付は許可されていません」ラベル
    showUpfileButton: boolean     // 📎ファイル選択
    showPaintButton: boolean      // 🎨お絵描き
    showPasteButton: boolean      // 📋貼付
    showClearButton: boolean      // 🗑クリア
}
```

発火タイミング: モード遷移時 + `allowImageReplies`変更時。

### 3.4 imperative methods (host要素に生えている)

```ts
interface UpfileV2Commands {
    clickFileattach(): void  // 内部<input type=file>をクリック → OSのピッカーが開く
    clickPaint(): void       // paint-button-clicked相当 (アクノスペイント起動)
    clickPaste(): void       // paste-button-clicked相当 (クリップボード取り込み)
    clickClear(): void       // clear-button-clicked相当 (emptyに戻す)
}
```

呼び出し: `host.clickPaint()`。hostが未マウント時は`null`なので`?.`を忘れず。

### 3.5 React hooks (connector/Connect_upfile_input_v2.ts)

```ts
/** hostへの型付き参照。null = 未マウント */
function useUpfileV2Host(fullKey: string): UpfileInputV2Host | null

/** 直近のUI推奨フラグ。undefined = まだ受信していない */
function useUpfileV2UiHint(fullKey: string): UpfileUiHintFlags | undefined

/** 直近の状態フラグ。undefined = まだ受信していない */
function useUpfileV2State(fullKey: string): UpfileStateFlags | undefined
```

`useUpfileV2UiHint`と`useUpfileV2State`は内部で`useEventLatest`を使っていて、
値の参照が変わらない限り consumer を再レンダしない。

## 4. aimg_viewer側に書くべき実装

### 4.1 アプリ起動時

`App.tsx`等のトップで以下を1度呼ぶ:

```tsx
import { registerUpfileInputV2Element } from "@nijiurachan/js/react/PreactWrapperV1/connector/Connect_upfile_input_v2"
import { AxnosPaintPopup } from "@nijiurachan/js/io/axnos-paint-popup"

const axnosPaintPopup = new AxnosPaintPopup("/paint/popup.js")
registerUpfileInputV2Element(axnosPaintPopup)
```

### 4.2 投稿フォーム + ツールバー

```tsx
import PreactWrapperV1 from "@nijiurachan/js/react/PreactWrapperV1"
import {
    useUpfileV2Host,
    useUpfileV2UiHint,
    useUpfileV2State,
} from "@nijiurachan/js/react/PreactWrapperV1/connector/Connect_upfile_input_v2"

const UPFILE_ID = "upfile"

export function PostForm() {
    const fullKey = PreactWrapperV1.buildFullKey("post-form", UPFILE_ID)

    return (
        <PreactWrapperV1.Scope name="post-form">
            <form id="post-form" onSubmit={handleSubmit}>
                <textarea name="comment" />

                <PreactWrapperV1.CustomElementRegion
                    id={UPFILE_ID}
                    tag="upfile-input-v2"
                    attributes={{ "data-allow-type": "file,draw" }}
                />

                <UpfileToolbar fullKey={fullKey} />

                <SubmitButton fullKey={fullKey} />
            </form>
        </PreactWrapperV1.Scope>
    )
}

function UpfileToolbar({ fullKey }: { fullKey: string }) {
    const host = useUpfileV2Host(fullKey)
    const hint = useUpfileV2UiHint(fullKey)

    // hint未受信の間は何も出さない (UIがチラつかないよう注意)
    if (!hint) return null

    return (
        <div className="upfile-toolbar">
            {hint.showAllowImageLabel && (
                <aside>画像添付は許可されていません（お絵描きは可能）</aside>
            )}
            {hint.showUpfileButton && (
                <button type="button" onClick={() => host?.clickFileattach()}>
                    📎ファイルを選択
                </button>
            )}
            {hint.showPaintButton && (
                <button type="button" onClick={() => host?.clickPaint()}>
                    🎨お絵かき
                </button>
            )}
            {hint.showPasteButton && (
                <button type="button" onClick={() => host?.clickPaste()}>
                    📋貼付
                </button>
            )}
            {hint.showClearButton && (
                <button type="button" onClick={() => host?.clickClear()}>
                    🗑クリア
                </button>
            )}
        </div>
    )
}

function SubmitButton({ fullKey }: { fullKey: string }) {
    const state = useUpfileV2State(fullKey)
    const isBusy = state?.isAxnosOpen || state?.isHacchanOpen
    return (
        <button type="submit" disabled={isBusy}>
            投稿
        </button>
    )
}
```

### 4.3 フォーム送信処理

v2は**`<form>`と`formAssociated: true`で紐付く**ので、通常のFormData経由で
`upfile`フィールドが送信されるが、はっちゃんキャンバスで描いた絵は送信前に
upfileに取り込む必要がある。この処理はv2が`aimg:prepare-submit`で自動処理する。

送信側の手順:

```tsx
async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const form = e.currentTarget

    // 1. v2に「送信準備してくれ」と通知
    const prepareEvent = new CustomEvent("aimg:prepare-submit", {
        detail: {} as { preparing?: Promise<void> },
    })
    form.dispatchEvent(prepareEvent)

    // 2. v2が返したPromiseを待つ (はっちゃん画像のupfileへの取り込みが走る)
    await prepareEvent.detail.preparing

    // 3. FormDataで送信
    const formData = new FormData(form)
    await fetch("/post", { method: "POST", body: formData })

    // 4. 成功通知 → v2がemptyモードに戻る
    form.dispatchEvent(new CustomEvent("aimg:submitted"))
}
```

## 5. 落とし穴・注意点

### 5.1 `hint`が`undefined`の間の扱い

`useUpfileV2UiHint`は要素がまだマウント・初回effect実行する前は`undefined`を返す。
UIがチラつかないよう、`if (!hint) return null`で待つか、予測値 (empty mode想定)
をデフォルトに使うこと。

### 5.2 form関連性 (formAssociated)

`upfile-input-v2`は`static formAssociated = true`。つまり**`<form>`の子孫として
置く必要がある**。`<form>`の外に置くと`connectedCallback`で例外。

### 5.3 clickFileattach の起動元

ブラウザのファイル選択ダイアログは「ユーザー操作に由来するイベント起源でのみ開く」
制約がある。`host.clickFileattach()`は**onClickハンドラ内**で呼ぶこと。setTimeout
やPromise.thenの中から呼ぶと無反応になる。

### 5.4 はっちゃんキャンバス

はっちゃん拡張ユーザが`<canvas id="oejs">`を乗っ取る仕様なので、v2はこの要素を
要素内部に置く。**キャンバスがReactの管理下から外れる**のは意図通り
(Reactが再レンダで消さないよう`CustomElementRegion`で防いでいる)。

### 5.5 アクノスペイントのポップアップ

`registerUpfileInputV2Element(axnosPaintPopup)`の`axnosPaintPopup`は**アプリで
1個**を共有する。複数のupfile-input-v2が画面にあっても、アクノスペイントは
1個しか同時に開けない設計。

### 5.6 aimg:reloading でリロードを止める

v2 host要素は`aimg:reloading`イベントを受け取ると、添付画像ありや作業中なら
`preventDefault()`する。aimg_viewer側でページリロード前にこのイベントを発火して
相談する設計にしておくこと (nijiurachan-js側の`reload-guard.ts`参照)。

## 6. 検証観点 (aimg_viewer側の受け入れテスト)

- [ ] 画像添付OKな板: 📎で画像を選ぶとプレビューが出る (プレビューは要素内部の
      `<figure id=ftbl>`で描画される)
- [ ] 画像添付NGな板 (`data-allow-type="draw"`): 「画像添付は許可されていません」
      ラベルが出て📎/📋ボタンが消える。🎨は出る。
- [ ] 🎨を押すとアクノスペイントが開き、完了するとfile-attachedモードになり
      📎/📋が消えて🗑だけ残る
- [ ] 📋を押すとクリップボードから画像を取り込む (権限が無ければalertが出て
      モードは変わらない)
- [ ] Ctrl+V でも取り込める
- [ ] 🗑を押すとemptyに戻る
- [ ] はっちゃん拡張を有効にしたブラウザで、お絵描きしてから投稿するとAPNGが
      upfileにblobとして入る
- [ ] 投稿後にformがemptyに戻る (state.hasSelectedFile == false)
- [ ] 投稿中 (isBusy) に送信ボタンがdisableされる (aimg_viewer側の判定)

## 7. 未着手・スコープ外

次のタスクは**別セッション**で検討:

- [ ] Pull系API (`getFile()` / `getState()`) の追加 — 今はeventのpushモデルのみ
- [ ] v1のdeprecate計画 — AI_BBSが全面v2移行してから
- [ ] 「画像選択後のプレビューもReact化」 — 今はv2内部で`<figure>`DOM操作してる
- [ ] ドラッグ&ドロップ対応 — v1にあるがv2にも`listenPaste`経由で継承されている
      はず (要確認)

## 8. 参照ファイル

### nijiurachan-js側 (読むだけ)

- `src/pure/upfile.ts` — モード遷移・フラグ導出の純関数
- `src/components/upfile-input-fragment-v2.tsx` — Preact fragment本体
- `src/elements/upfile-input-v2.ts` — Custom Element本体
- `src/react/PreactWrapperV1/connector/Connect_upfile_input_v2.ts` — React sugar
- `src/components/types.ts` — イベント契約の宣言
- `src/test/upfile/upfile-ui-hint.test.ts` — ヒント導出のテスト
- コミット: `b53093f` on branch `claude/refactor-ts-components-Y0kaC`

### aimg_viewer側 (書く必要あり)

- アプリ起動箇所 (main.tsx等) に `registerUpfileInputV2Element` を1回呼ぶ
- 投稿フォームコンポーネント内に `<CustomElementRegion tag="upfile-input-v2">`
- ツールバーコンポーネント (hint購読して条件描画)
- 送信処理 (`aimg:prepare-submit` → `await` → submit → `aimg:submitted`)

## 9. 困ったときの確認順

1. host要素がDOMに存在するか devtools で確認 (`<upfile-input-v2 ...>`)
2. `aimg:upfile-ui-hint`がhost要素から発火しているか (`host.addEventListener`で
   確認)
3. host要素に`clickFileattach`などmethodが生えているか (`typeof host.clickPaint`)
4. form関連性 (`host.matches("form upfile-input-v2")`)
5. `registerUpfileInputV2Element`がアプリ起動直後に走っているか
   (DOMより前だとCustomElementRegionがmountする前に`defineOnce`で登録される
   はずだが、もしタイミング問題が出たら疑う)

---

**前セッションのコミット**: `b53093f`
**ブランチ**: `claude/refactor-ts-components-Y0kaC`
**前セッションの設計プラン**: `/root/.claude/plans/aimg-viewer-ai-bbs-ts-upfile-input-ts-w-golden-beacon.md`
