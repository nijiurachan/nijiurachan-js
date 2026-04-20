import type { IAxnosPaintPopup } from "#js/components/types"
import type { UpfileV2Commands } from "#js/components/upfile-input-fragment-v2"
import { makeUpfileInputFragmentV2 } from "#js/components/upfile-input-fragment-v2"
import { makeUpfileInputV2Element } from "#js/elements/upfile-input-v2"
import type { UpfileStateFlags, UpfileUiHintFlags } from "#js/pure/upfile"
import { registerElementClass } from "../core/define-once"
import { useEventLatest } from "../use-event-latest"
import { useHost } from "../use-host"

/**
 * `upfile-input-v2`要素クラスを構築して`PreactWrapperV1`のレジストリに登録する。
 * `axnosPaintPopup`に依存するので、アプリ起動時にインスタンスを作って1度呼ぶ想定。
 */
export function registerUpfileInputV2Element(
    axnosPaintPopup: IAxnosPaintPopup,
): void {
    const cls = makeUpfileInputV2Element(
        makeUpfileInputFragmentV2(axnosPaintPopup),
    )
    registerElementClass("upfile-input-v2", cls)
}

/** `upfile-input-v2`のhost要素に生えた imperative API 込みの型 */
export type UpfileInputV2Host = HTMLElement & UpfileV2Commands

/**
 * 指定`fullKey`の`<CustomElementRegion tag="upfile-input-v2">`がマウントしている
 * hostを、`clickFileattach/clickPaint/clickPaste/clickClear`付きで返す型付きsugar。
 */
export function useUpfileV2Host(fullKey: string): UpfileInputV2Host | null {
    return useHost(fullKey) as UpfileInputV2Host | null
}

/**
 * 指定`fullKey`から直近の`aimg:upfile-ui-hint`を購読するsugar。
 * 外部ツールバーが「今どのボタンを出すべきか」の判断に使う。
 */
export function useUpfileV2UiHint(
    fullKey: string,
): UpfileUiHintFlags | undefined {
    return useEventLatest(fullKey, "aimg:upfile-ui-hint")
}

/** 指定`fullKey`から直近の`aimg:upfile-state`を購読するsugar。 */
export function useUpfileV2State(
    fullKey: string,
): UpfileStateFlags | undefined {
    return useEventLatest(fullKey, "aimg:upfile-state")
}
