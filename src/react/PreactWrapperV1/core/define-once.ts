import type { CustomElementClass } from "#js/elements/types"

/**
 * `customElements.define`を高々1度だけ呼ぶためのユーティリティ。
 * SSR環境 (`window`なし) ではno-op。
 */
const definedByTag: Set<string> = new Set()

/**
 * 呼び出し側アプリが構築した`CustomElementClass`の登録を受け付けるモジュール変数。
 * 各要素タグごとに1つ保持する。
 *
 * アプリ起動時に呼ぶ想定:
 * ```
 * PreactWrapperV1.registerElementClass("my-tag", MyElementClass)
 * ```
 */
const registeredClasses: Map<string, CustomElementClass> = new Map()

export function registerElementClass(
    tag: string,
    cls: CustomElementClass,
): void {
    const existing = registeredClasses.get(tag)
    if (existing && existing !== cls) {
        throw new Error(
            `PreactWrapperV1: already registered a different class for "${tag}"`,
        )
    }
    registeredClasses.set(tag, cls)
}

export function defineOnce(tag: string): void {
    if (typeof window === "undefined") {
        return
    }
    if (definedByTag.has(tag)) {
        return
    }
    if (customElements.get(tag)) {
        definedByTag.add(tag)
        return
    }
    const cls = registeredClasses.get(tag)
    if (!cls) {
        throw new Error(
            `PreactWrapperV1: no element class registered for "${tag}". Call PreactWrapperV1.registerElementClass("${tag}", cls) once at app startup.`,
        )
    }
    cls.define()
    definedByTag.add(tag)
}
