import { useEffect, useRef } from "react"
import { getOrCreateHandle } from "./core/registry"

/**
 * 指定`fullKey`の`<UpfileInput>`上で発火する`eventName`を副作用型で購読する。
 *
 * - 再レンダ中の`callback`参照差し替えに対してリスナ張替えは起きない (最新参照はrefで保持)
 * - useEffectなのでマウント後の発火からキャッチ
 * - 要素がまだマウントされていなくてもハンドルは生成されるのでOK
 */
export function useUpfileEvent<K extends keyof GlobalEventHandlersEventMap>(
    fullKey: string,
    eventName: K,
    callback: (event: GlobalEventHandlersEventMap[K]) => void,
): void {
    const cbRef = useRef(callback)
    cbRef.current = callback

    useEffect(() => {
        const handle = getOrCreateHandle(fullKey)
        const name = eventName as string

        const wrapper = (e: Event): void => {
            cbRef.current(e as GlobalEventHandlersEventMap[K])
        }

        let set = handle.eventCallbacks.get(name)
        if (!set) {
            set = new Set()
            handle.eventCallbacks.set(name, set)
        }
        set.add(wrapper)

        return () => {
            set?.delete(wrapper)
            if (set?.size === 0) {
                handle.eventCallbacks.delete(name)
            }
        }
    }, [fullKey, eventName])
}
