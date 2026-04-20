import type { UpfileStateFlags } from "#js/pure/upfile"
import type { UpfileInstanceHandle } from "./types"

/**
 * `fullKey -> UpfileInstanceHandle`のモジュール内シングルトンレジストリ。
 * `<UpfileInput>`のマウントと`useUpfile*`フックの両方が参照する。
 */
const registry: Map<string, UpfileInstanceHandle> = new Map()

/** ハンドル取得。無ければ新規作成する (フックが要素より先に走るケース対応) */
export function getOrCreateHandle(fullKey: string): UpfileInstanceHandle {
    const existing = registry.get(fullKey)
    if (existing) {
        return existing
    }
    const handle: UpfileInstanceHandle = {
        fullKey,
        host: null,
        latestState: undefined,
        latestEventDetails: new Map(),
        stateSubscribers: new Set(),
        eventLatestSubscribers: new Map(),
        eventCallbacks: new Map(),
        attachCount: 0,
    }
    registry.set(fullKey, handle)
    return handle
}

/** ハンドル取得 (無ければundefined、副作用なし) */
export function peekHandle(fullKey: string): UpfileInstanceHandle | undefined {
    return registry.get(fullKey)
}

/** `<UpfileInput>`マウント時のアタッチ */
export function attachHost(fullKey: string, host: HTMLElement): void {
    const handle = getOrCreateHandle(fullKey)
    handle.host = host
    handle.attachCount++
}

/** `<UpfileInput>`アンマウント時のデタッチ。購読者が残っていてもハンドルは保持する */
export function detachHost(fullKey: string, host: HTMLElement): void {
    const handle = registry.get(fullKey)
    if (!handle) {
        return
    }
    if (handle.host === host) {
        handle.host = null
    }
    handle.attachCount--
    if (
        handle.attachCount <= 0 &&
        handle.stateSubscribers.size === 0 &&
        handle.eventLatestSubscribers.size === 0 &&
        handle.eventCallbacks.size === 0
    ) {
        registry.delete(fullKey)
    }
}

/** 状態フラグ更新を反映し、購読者に通知する */
export function publishState(fullKey: string, state: UpfileStateFlags): void {
    const handle = getOrCreateHandle(fullKey)
    handle.latestState = state
    for (const notify of handle.stateSubscribers) {
        notify()
    }
}

/**
 * CustomEventを反映し、各種購読者に配信する。
 * - 直近値を`latestEventDetails`に記録
 * - `useUpfileEventLatest`用の購読者に通知
 * - `useUpfileEvent`用のコールバックを呼ぶ (element側の発火順で一度ずつ)
 */
export function publishEvent(
    fullKey: string,
    eventName: string,
    event: Event,
): void {
    const handle = getOrCreateHandle(fullKey)

    if (event instanceof CustomEvent) {
        handle.latestEventDetails.set(eventName, event.detail)
    } else {
        handle.latestEventDetails.set(eventName, undefined)
    }

    const latestSubs = handle.eventLatestSubscribers.get(eventName)
    if (latestSubs) {
        for (const notify of latestSubs) {
            notify()
        }
    }

    const callbacks = handle.eventCallbacks.get(eventName)
    if (callbacks) {
        for (const cb of callbacks) {
            try {
                cb(event)
            } catch (err) {
                console.error(
                    `PreactWrapperV1: ${eventName} callback threw`,
                    err,
                )
            }
        }
    }
}

/** テスト用: レジストリを空にする */
export function __resetRegistryForTest(): void {
    registry.clear()
}
