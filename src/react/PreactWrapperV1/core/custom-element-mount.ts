/**
 * `<upfile-input>`等のCustom Elementを、React VDOMから切り離された形で
 * placeholder要素にimperative appendChildする共通ロジック。
 *
 * 外部JS (はっちゃん/axnospaint等) がホスト要素の子孫、
 * あるいはホスト要素そのものを`remove()` / `innerHTML = ""`で
 * 破壊してもReactのreconcilerは影響を受けない。
 */
export interface MountedHost {
    host: HTMLElement
    /** cleanup関数。placeholderからhostを外す。既に外れていても例外にしない */
    unmount: () => void
}

export function mountCustomElement(
    placeholder: HTMLElement,
    tag: string,
    /**
     * `connectedCallback`が参照する属性はここで設定する。
     * `appendChild`前に付けないと要素側でエラーになる (`upfile-input`の`data-allow-type`等)
     */
    initialAttributes: Record<string, string | undefined> = {},
): MountedHost {
    const host = document.createElement(tag)
    for (const [name, value] of Object.entries(initialAttributes)) {
        if (value !== undefined) {
            host.setAttribute(name, value)
        }
    }
    placeholder.appendChild(host)
    return {
        host,
        unmount: () => {
            if (placeholder.contains(host)) {
                placeholder.removeChild(host)
            }
        },
    }
}

/**
 * `host.setAttribute`をnull-safeに呼ぶ。`host`が既にDOMから切り離されていたら何もしない。
 * 属性値が`undefined`の場合は`removeAttribute`する。
 */
export function syncAttribute(
    host: HTMLElement | null,
    name: string,
    value: string | undefined,
): void {
    if (!host) {
        return
    }
    if (value === undefined) {
        host.removeAttribute(name)
    } else {
        host.setAttribute(name, value)
    }
}
