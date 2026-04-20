import { useCallback, useRef, useSyncExternalStore } from "react"
import type { UpfileStateFlags } from "#js/pure/upfile"
import { getOrCreateHandle } from "./core/registry"
import type { UpfileStateSelector } from "./types"

const identity = (s: UpfileStateFlags): UpfileStateFlags => s

/**
 * 指定`fullKey`の`<UpfileInput>`の状態フラグを購読する。
 *
 * - `<UpfileInput>`より先にこのフックが走っても落ちない (ハンドルは遅延生成)
 * - selectorが前回と同じ参照を返した場合はconsumerコンポーネントは再レンダしない
 * - 要素がまだマウントされていない/イベント未受信の間はselectorに`undefined`が渡る
 */
export function useUpfileState<T = UpfileStateFlags>(
    fullKey: string,
    selector?: UpfileStateSelector<T>,
): T | undefined {
    const sel = selector ?? (identity as unknown as UpfileStateSelector<T>)

    const subscribe = useCallback(
        (notify: () => void) => {
            const handle = getOrCreateHandle(fullKey)
            handle.stateSubscribers.add(notify)
            return () => {
                handle.stateSubscribers.delete(notify)
            }
        },
        [fullKey],
    )

    // useSyncExternalStoreはgetSnapshotに同値参照を期待するため、
    // 直近のstateとselector結果をrefでキャッシュする
    const cacheRef = useRef<{
        state: UpfileStateFlags | undefined
        selected: T | undefined
    }>({ state: undefined, selected: undefined })

    const getSnapshot = useCallback((): T | undefined => {
        const handle = getOrCreateHandle(fullKey)
        const state = handle.latestState
        if (state === undefined) {
            if (cacheRef.current.state !== undefined) {
                cacheRef.current = { state: undefined, selected: undefined }
            }
            return undefined
        }
        if (cacheRef.current.state === state) {
            return cacheRef.current.selected
        }
        const next = sel(state)
        cacheRef.current = { state, selected: next }
        return next
    }, [fullKey, sel])

    return useSyncExternalStore(subscribe, getSnapshot, getSnapshot)
}
