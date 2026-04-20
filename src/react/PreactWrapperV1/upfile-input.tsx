import type { JSX } from "react"
import { useContext, useEffect, useLayoutEffect, useRef } from "react"
// `aimg:*`のグローバル型拡張を取り込むための副作用import
import type {} from "#js/components/types"
import type { UpfileStateFlags } from "#js/pure/upfile"
import { mountCustomElement, syncAttribute } from "./core/custom-element-mount"
import { UPFILE_DATA_ATTR_MAP } from "./core/data-attr"
import { defineOnce } from "./core/define-once"
import { buildFullKey } from "./core/full-key"
import {
    attachHost,
    detachHost,
    publishEvent,
    publishState,
} from "./core/registry"
import { ScopeContext } from "./core/scope-context"
import type { UpfileInputProps } from "./types"

type HostEventName =
    | "aimg:upfile-state"
    | "aimg:reloading"
    | "aimg:painted"
    | "aimg:hacchan-start"
    | "aimg:popup-form-toggled"

/** このラッパが常時listenするhostイベントの一覧 */
const HOST_EVENTS: ReadonlyArray<HostEventName> = [
    "aimg:upfile-state",
    "aimg:reloading",
    "aimg:painted",
    "aimg:hacchan-start",
    "aimg:popup-form-toggled",
]

/**
 * `<upfile-input>`要素のReactラッパ。
 *
 * - React VDOMには`<div>`のplaceholderだけを描画し、`<upfile-input>`は
 *   `useLayoutEffect`内で`document.createElement`してappendChild
 * - 内部のDOM (はっちゃんのcanvas等) が外部JSに破壊されてもReactは影響を受けない
 * - `data-*`属性は`UPFILE_DATA_ATTR_MAP`で列挙された明示的な対応のみマップ
 * - CustomEventは`HOST_EVENTS`を一括でhostに張り、`registry`経由で外部購読フックに配信
 */
export function UpfileInput(props: UpfileInputProps): JSX.Element {
    const scopeName = useContext(ScopeContext)
    const fullKey = buildFullKey(scopeName, props.id)

    const placeholderRef = useRef<HTMLDivElement | null>(null)
    const hostRef = useRef<HTMLElement | null>(null)

    // 最新propsを常に参照できるref (リスナを張り替えずに済ませる)
    const propsRef = useRef(props)
    propsRef.current = props

    // ------- マウント/アンマウント -------
    useLayoutEffect(() => {
        const placeholder = placeholderRef.current
        if (!placeholder) {
            return
        }

        defineOnce("upfile-input")

        // `connectedCallback`が`data-allow-type`を要求するためappendChild前に属性を付与
        const initialAttrs: Record<string, string | undefined> = {}
        const latestProps = propsRef.current
        for (const [propKey, attrName] of Object.entries(
            UPFILE_DATA_ATTR_MAP,
        )) {
            const value = (latestProps as unknown as Record<string, unknown>)[
                propKey
            ]
            if (typeof value === "string") {
                initialAttrs[attrName] = value
            }
        }

        const mounted = mountCustomElement(
            placeholder,
            "upfile-input",
            initialAttrs,
        )
        hostRef.current = mounted.host
        attachHost(fullKey, mounted.host)

        // 全イベントを一括でlistenし、registryと(最新の)local propsに配信
        const listeners: Array<[string, EventListener]> = []
        for (const name of HOST_EVENTS) {
            const listener: EventListener = (e: Event) => {
                if (name === "aimg:upfile-state" && e instanceof CustomEvent) {
                    publishState(fullKey, e.detail as UpfileStateFlags)
                }
                publishEvent(fullKey, name, e)
                dispatchLocalHandler(name, e, propsRef.current)
            }
            mounted.host.addEventListener(name, listener)
            listeners.push([name, listener])
        }

        return () => {
            for (const [name, listener] of listeners) {
                mounted.host.removeEventListener(name, listener)
            }
            mounted.unmount()
            detachHost(fullKey, mounted.host)
            hostRef.current = null
        }
    }, [fullKey])

    // ------- data属性同期 (初期マウント後の変更分) -------
    useEffect(() => {
        const host = hostRef.current
        if (!host) {
            return
        }
        for (const [propKey, attrName] of Object.entries(
            UPFILE_DATA_ATTR_MAP,
        )) {
            const value = (props as unknown as Record<string, unknown>)[propKey]
            syncAttribute(
                host,
                attrName,
                typeof value === "string" ? value : undefined,
            )
        }
    }, [props])

    return (
        <div
            ref={placeholderRef}
            className={props.className}
            style={props.style}
            data-preact-wrapper-v1-key={fullKey}
            // React側はこのdivの中身を一切管理しない (上書きも再レンダも起きない)
            suppressHydrationWarning
        />
    )
}

/** このイベントをlocal propで購読しているか判定し、あれば呼ぶ */
function dispatchLocalHandler(
    name: HostEventName,
    event: Event,
    props: UpfileInputProps,
): void {
    switch (name) {
        case "aimg:upfile-state":
            props.onUpfileState?.(event as CustomEvent<UpfileStateFlags>)
            return
        case "aimg:reloading":
            props.onReloading?.(event as CustomEvent<{ isFullReload: boolean }>)
            return
        case "aimg:painted":
            props.onPainted?.(
                event as CustomEvent<{
                    popupId: string
                    image: Blob | null
                    isAccepted: boolean
                }>,
            )
            return
        case "aimg:hacchan-start":
            props.onHacchanStart?.(event as CustomEvent<void>)
            return
        case "aimg:popup-form-toggled":
            props.onPopupFormToggled?.(
                event as CustomEvent<{ isCollapsed: boolean }>,
            )
            return
    }
}
