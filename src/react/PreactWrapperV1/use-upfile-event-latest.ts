import { useCallback, useSyncExternalStore } from "react"
import { getOrCreateHandle } from "./core/registry"

/**
 * 指定`fullKey`の`<UpfileInput>`から受信した`eventName`の**直近`detail`**を返す。
 *
 * 副作用を起こさず「値」として扱いたい場合向け (`onPainted`のボタン活性など)。
 * 副作用型が欲しい場合は`useUpfileEvent`を使う。
 */
export function useUpfileEventLatest<
    K extends keyof GlobalEventHandlersEventMap,
>(
    fullKey: string,
    eventName: K,
): GlobalEventHandlersEventMap[K] extends CustomEvent<infer D>
    ? D | undefined
    : undefined {
    const subscribe = useCallback(
        (notify: () => void) => {
            const handle = getOrCreateHandle(fullKey)
            const name = eventName as string
            let set = handle.eventLatestSubscribers.get(name)
            if (!set) {
                set = new Set()
                handle.eventLatestSubscribers.set(name, set)
            }
            set.add(notify)
            return () => {
                set?.delete(notify)
                if (set?.size === 0) {
                    handle.eventLatestSubscribers.delete(name)
                }
            }
        },
        [fullKey, eventName],
    )

    const getSnapshot = useCallback(() => {
        const handle = getOrCreateHandle(fullKey)
        return handle.latestEventDetails.get(eventName as string)
    }, [fullKey, eventName])

    // biome-ignore lint/suspicious/noExplicitAny: 型は関数シグネチャ側で絞る
    return useSyncExternalStore(subscribe, getSnapshot, getSnapshot) as any
}
