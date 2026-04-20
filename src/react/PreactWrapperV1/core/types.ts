import type { UpfileStateFlags } from "#js/pure/upfile"

/**
 * `<UpfileInput>`のインスタンス1つに対応する内部ハンドル。
 * `registry`で`fullKey -> handle`のマップを保持し、
 * ツリー外からフックで購読する際のハブとして使う。
 */
export interface UpfileInstanceHandle {
    /** レジストリ上のキー (`"scopeName:id"` または `"id"`) */
    fullKey: string
    /**
     * 対応する`<upfile-input>`要素。
     * `<UpfileInput>`がマウントされる前にフックが先に生成することもあるため、
     * アタッチされるまでの間は`null`。
     */
    host: HTMLElement | null
    /** 最後に受け取った状態フラグ。未受信なら`undefined` */
    latestState: UpfileStateFlags | undefined
    /** イベント名ごとの最終`CustomEvent`詳細 */
    latestEventDetails: Map<string, unknown>
    /** `useSyncExternalStore`用の購読者集合 (状態変化時のみ通知) */
    stateSubscribers: Set<() => void>
    /** イベント種別ごとの購読者集合 (`useUpfileEventLatest`用) */
    eventLatestSubscribers: Map<string, Set<() => void>>
    /** イベント種別ごとの副作用コールバック (`useUpfileEvent`用) */
    eventCallbacks: Map<string, Set<(e: Event) => void>>
    /** ハンドルに登録されている生きた`<UpfileInput>`の参照カウント */
    attachCount: number
}
