import type {} from "ts/components/types"
import type {
    AxnosPaintPopupOptions,
    IAxnosPaintPopup,
} from "ts/components/upfile-input-fragment"
import popupHtml from "./axnos-paint-popup.html" with { type: "text" }

/** @inheritdoc */
export class AxnosPaintPopup implements IAxnosPaintPopup {
    #abort?: AbortController

    /** @param src ポップアップに読み込むスクリプトのURL */
    constructor(readonly src: string) {}

    abort(): void {
        this.#abort?.abort()
    }

    popup(options: AxnosPaintPopupOptions): Promise<Blob> {
        this.abort()

        const abort = new AbortController()
        this.#abort = abort

        const popupId = `otegaki-${crypto.randomUUID()}`
        return new Promise<Blob>((resolve, reject) => {
            abort.signal.addEventListener("abort", reject)

            addEventListener(
                "aimg:painted",
                ({ detail }) => {
                    if (detail.popupId === popupId) {
                        detail.isAccepted = true

                        if (detail.image) {
                            resolve(detail.image)
                        } else {
                            reject(
                                new Error("No image received from axnospaint"),
                            )
                        }

                        abort?.abort()
                        this.#abort = undefined
                    }
                },
                abort,
            )

            if (!this.#popupAxnosPaint(popupId, options)) {
                reject(new Error("Failed to open axnos paint popup"))
            }
        })
    }

    /** アクノスペイントのポップアップを開く */
    #popupAxnosPaint(
        popupId: string,
        options: AxnosPaintPopupOptions,
    ): boolean {
        const hostWindow = window.open("about:blank")
        if (!hostWindow) {
            window.alert(
                "ポップアップがブロックされました。ブラウザのポップアップ設定を確認してください。",
            )
            return false
        }
        this.#initAxnosPaint(hostWindow.document, popupId, options)
        return true
    }

    /** ドキュメントにアクノスペイントを読み込む */
    #initAxnosPaint(
        doc: Document,
        popupId: string,
        { canvasWidth, canvasHeight }: AxnosPaintPopupOptions,
    ): void {
        doc.write(popupHtml)
        doc.close()

        const host = doc.createElement("axnos-paint-host")
        host.id = popupId
        host.dataset.width = `${canvasWidth}`
        host.dataset.height = `${canvasHeight}`
        doc.body.appendChild(host)

        const script = doc.createElement("script")
        script.type = "module"
        script.src = this.src
        doc.head.appendChild(script)
    }
}
