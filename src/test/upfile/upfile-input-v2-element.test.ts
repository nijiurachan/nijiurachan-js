import { afterAll, beforeAll, describe, expect, test, vi } from "vitest"
import type { IAxnosPaintPopup } from "#js/components/types"
import { makeUpfileInputFragmentV2 } from "#js/components/upfile-input-fragment-v2"
import { makeUpfileInputV2Element } from "#js/elements/upfile-input-v2"
import type { UpfileStateFlags, UpfileUiHintFlags } from "#js/pure/upfile"

// jsdom (v27) は form-associated custom elements の `ElementInternals.form` を
// 自動解決しない。本テストはその穴を自前で埋めるため、`attachInternals()` を
// Spy して返り値の `form` getter を差し替える。
function patchAttachInternalsForFormAssociation(): () => void {
    const origAttachInternals = HTMLElement.prototype.attachInternals
    const spy = vi
        .spyOn(HTMLElement.prototype, "attachInternals")
        .mockImplementation(function attachInternalsMock(this: HTMLElement) {
            const internals = origAttachInternals.call(this)
            Object.defineProperty(internals, "form", {
                configurable: true,
                get: (): HTMLFormElement | null => this.closest("form"),
            })
            return internals
        })
    return () => spy.mockRestore()
}

/**
 * 要素の実装詳細:
 * - `connectedCallback`が`render()`を呼ぶ前に初期値 (mode="empty") を`#latestStateFlags` /
 *   `#latestUiHint`に種まきする
 * - `getLatestEventDetail(name)`でその初期値が同期で引ける
 * - 初回dispatch後はpush経路の`latestEventDetails`が優先される想定なので、要素側でも
 *   onStateChange / onUiHintChange コールバック経由で最新値に上書きする
 * - `disconnectedCallback`で`#latestStateFlags` / `#latestUiHint`を`null`に戻す
 */
describe("upfile-input-v2 element", () => {
    const fakeAxnos: IAxnosPaintPopup = {
        popup: vi.fn().mockResolvedValue(new Blob()),
        abort: vi.fn(),
    }

    let restorePatch: (() => void) | null = null
    beforeAll(() => {
        // attachInternals の patch は `customElements.define` より先に適用する。
        restorePatch = patchAttachInternalsForFormAssociation()
    })
    afterAll(() => {
        restorePatch?.()
        restorePatch = null
    })

    const ElementClass = makeUpfileInputV2Element(
        makeUpfileInputFragmentV2(fakeAxnos),
    )

    // jsdom は`customElements.define`済のクラスしか`new`させてくれないので、
    // テストファイルレベルで1回だけ登録する。タグ名は本番と衝突しないよう別名。
    const TAG = "upfile-input-v2-test"
    if (!customElements.get(TAG)) {
        customElements.define(TAG, ElementClass)
    }
    type Host = HTMLElement & {
        getLatestEventDetail(name: string): unknown | undefined
    }
    const createHost = (): Host =>
        document.createElement(TAG) as unknown as Host

    test("mount直後、getLatestEventDetailがmode=emptyの初期値を同期pullで返す (allowImageReplies=true)", () => {
        const form = document.createElement("form")
        document.body.appendChild(form)
        const host = createHost()
        host.setAttribute("data-allow-type", "file")
        form.appendChild(host)

        const state = host.getLatestEventDetail(
            "aimg:upfile-state",
        ) as UpfileStateFlags
        // toUpfileStateFlags("empty", { isPopupFormCollapsed: false }) の値
        expect(state).toBeDefined()
        expect(state.isBusy).toBe(false)

        const hint = host.getLatestEventDetail(
            "aimg:upfile-ui-hint",
        ) as UpfileUiHintFlags
        // toUpfileUiHintFlags("empty", { allowImageReplies: true }) の値
        expect(hint).toEqual({
            showAllowImageLabel: false,
            showUpfileButton: true,
            showPaintButton: true,
            showPasteButton: true,
            showClearButton: false,
        })

        host.remove()
        form.remove()
    })

    test("allowImageReplies=false (data-allow-type=''等) の場合、初期uiHintがAllowImageLabelを立てて返す", () => {
        const form = document.createElement("form")
        document.body.appendChild(form)
        const host = createHost()
        host.setAttribute("data-allow-type", "") // "file"を含まない
        form.appendChild(host)

        const hint = host.getLatestEventDetail(
            "aimg:upfile-ui-hint",
        ) as UpfileUiHintFlags
        expect(hint.showAllowImageLabel).toBe(true)
        expect(hint.showUpfileButton).toBe(false)
        expect(hint.showPasteButton).toBe(false)

        host.remove()
        form.remove()
    })

    test("未知のeventNameには undefined を返す", () => {
        const form = document.createElement("form")
        document.body.appendChild(form)
        const host = createHost()
        host.setAttribute("data-allow-type", "file")
        form.appendChild(host)

        expect(host.getLatestEventDetail("aimg:painted")).toBeUndefined()
        expect(host.getLatestEventDetail("whatever")).toBeUndefined()

        host.remove()
        form.remove()
    })

    test("disconnect後は getLatestEventDetail が undefined を返す", () => {
        const form = document.createElement("form")
        document.body.appendChild(form)
        const host = createHost()
        host.setAttribute("data-allow-type", "file")
        form.appendChild(host)

        // いったんmountしてから外す
        expect(host.getLatestEventDetail("aimg:upfile-ui-hint")).toBeDefined()
        host.remove()

        expect(host.getLatestEventDetail("aimg:upfile-state")).toBeUndefined()
        expect(host.getLatestEventDetail("aimg:upfile-ui-hint")).toBeUndefined()

        form.remove()
    })

    // 注: `<form>の外にmountしたら throw` はjsdomがCE reactionの例外を
    // イベントループに吐いてしまい vitest の`toThrow`では捕まらない。
    // メッセージ自体は`src/elements/upfile-input-v2.ts`の実装で直接確認する。
})
