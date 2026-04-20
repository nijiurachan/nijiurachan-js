import type { CSSProperties, ReactNode } from "react"

/** `<PreactWrapperV1.Scope>`のprops */
export interface ScopeProps {
    /**
     * スコープ名。配下の`<CustomElementRegion id="x">`は`fullKey = "<name>:x"`で登録される。
     * フック (`useEvent`等) が外部から同じ`fullKey`で購読するために使う。
     * 同じツリーに既にScopeがある場合 (ネスト) は開発時エラーとする。
     */
    name: string
    children?: ReactNode
}

/**
 * 指定Regionの`localHandlers`の型。
 * キーは`GlobalEventHandlersEventMap`のイベント名、値は対応するEventオブジェクトを
 * 受け取るハンドラ (要素側`declare global`で拡張されていれば CustomEvent<detail> まで narrow)。
 */
export type LocalHandlers = {
    [K in keyof GlobalEventHandlersEventMap]?: (
        e: GlobalEventHandlersEventMap[K],
    ) => void
}

/**
 * Custom Elementがhostとして実装すると、`useEventLatest`がまだ一度もイベントを受け取っていない
 * タイミングでも同期的に「直近値」を取得できる契約。
 *
 * - push経路: 通常通り`dispatchEvent(new CustomEvent(name, { detail }))`でregistryに載る
 * - pull経路: registryに該当名のエントリがない場合、attach済みhostがこのメソッドを持っていれば
 *   `getLatestEventDetail(name)`を呼び、戻り値 (≠`undefined`) を初期値として扱う
 *
 * 実装側は「そのイベント名でまだ発火していない」か「発火前にpullされた」状態を`undefined`で返す。
 * 発火後はpush経路が優先されるため、このメソッドは主にmount直後〜初回dispatch間の空白を埋める用途。
 *
 * @example
 * class MyElement extends HTMLElement {
 *     #latestHint: MyHintFlags | null = null
 *     getLatestEventDetail(name: string): unknown | undefined {
 *         if (name === "my:hint") return this.#latestHint ?? undefined
 *         return undefined
 *     }
 * }
 */
export interface LatestEventDetailProvider {
    getLatestEventDetail(eventName: string): unknown | undefined
}

/** `<PreactWrapperV1.CustomElementRegion>`のprops */
export interface CustomElementRegionProps {
    /**
     * 内部に作るCustom Elementのタグ名。
     * `defineOnce`が未登録なら、`registerElementClass(tag, cls)`で事前に登録されたクラスを
     * `customElements.define`する。
     */
    tag: string

    /**
     * インスタンスID。`<Scope>`配下なら`"<scopeName>:id"`、Scopeなしなら`"id"`として登録される。
     */
    id: string

    /**
     * `connectedCallback`が参照する属性は必ずここで渡す (appendChild前に`setAttribute`される)。
     * マウント後の変更は`useEffect`で`syncAttribute`経由で反映。
     * `undefined`値は`removeAttribute`に変換される。
     *
     * @example
     * { "data-allow-type": "file", tabIndex: "0" }
     */
    attributes?: Record<string, string | undefined>

    /**
     * このRegion内でローカルに購読したいCustomEventハンドラ群。
     * キー集合はマウント時にスナップショットされる (動的追加は未対応)。
     * 外部ツリーから購読したい場合は`useEvent`/`useEventLatest`を使う。
     */
    localHandlers?: LocalHandlers

    /** placeholder divに付けるクラス名 (内部の要素には影響しない) */
    className?: string
    /** placeholder divに付けるstyle */
    style?: CSSProperties
}
