import type { CustomElementClass } from "#js/elements/types"
import { registerElementClass } from "./core/define-once"
import { Scope } from "./scope"
import { UpfileInput } from "./upfile-input"
import { useUpfileEvent } from "./use-upfile-event"
import { useUpfileEventLatest } from "./use-upfile-event-latest"
import { useUpfileState } from "./use-upfile-state"

/**
 * `<PreactWrapperV1.UpfileInput>`が使うカスタムエレメントクラスを登録する。
 * アプリ起動時 (モジュールトップ等) で1度だけ呼ぶ。
 *
 * nijiurachan-jsは要素クラスを`makeUpfileInputElement(makeUpfileInputFragment(axnosPopup))`のように
 * アプリ側でDIして組み立てる前提なので、ラッパ側は構築済みのクラスを受け取る形にする。
 */
export function registerUpfileInputElement(cls: CustomElementClass): void {
    registerElementClass("upfile-input", cls)
}

/**
 * React/TSクライアント向けの`PreactWrapperV1`名前空間オブジェクト。
 * 破壊変更が必要になった場合は`PreactWrapperV2`を別ファイル/別exportで新設する。
 */
export const PreactWrapperV1 = {
    Scope,
    UpfileInput,
    useUpfileState,
    useUpfileEvent,
    useUpfileEventLatest,
    registerUpfileInputElement,
} as const

export default PreactWrapperV1
