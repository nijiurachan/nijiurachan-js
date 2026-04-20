import type { FunctionComponent } from "preact"
import { h, render } from "preact"
import type {} from "#js/components/types"
import type {
    UpfileInputV2Props,
    UpfileV2Commands,
} from "#js/components/upfile-input-fragment-v2"
import type { UpfileStateFlags, UpfileUiHintFlags } from "#js/pure/upfile"
import type { CustomElementClass } from "./types"

/**
 * v2添付File欄。UIボタン群 (🎨/📋/🗑など) は**内部で描画せず**、外部ツールバーが
 * `aimg:upfile-ui-hint`を購読して自前で描画することを想定した"headless"版。
 * ボタン等が押された時の効果は、host要素に生えた`clickFileattach/clickPaint/
 * clickPaste/clickClear` methodを外から呼んで発動させる。
 */
export const makeUpfileInputV2Element = (
    UpfileInputV2: FunctionComponent<UpfileInputV2Props>,
): CustomElementClass =>
    class UpfileInputV2Element extends HTMLElement {
        static formAssociated = true
        #internals = this.attachInternals()
        #commands: UpfileV2Commands | null = null
        #latestStateFlags: UpfileStateFlags | null = null

        static define(): void {
            customElements.define("upfile-input-v2", UpfileInputV2Element)
        }

        connectedCallback(): void {
            const allowType = this.dataset.allowType
            if (typeof allowType !== "string") {
                throw new Error("UpfileInputV2Element: allowType is not set")
            }
            const form = this.#internals.form
            if (!form) {
                throw new Error("UpfileInputV2Element: form is not associated")
            }

            this.#listenReload()

            const allowImageReplies = /\bfile\b/i.test(allowType)

            render(
                h(UpfileInputV2, {
                    form: form,
                    allowImageReplies: allowImageReplies,
                    canvasWidth: 400,
                    canvasHeight: 266,
                    bindCommands: (cmds: UpfileV2Commands) => {
                        this.#commands = cmds
                    },
                    onStateChange: (flags: UpfileStateFlags) => {
                        this.#latestStateFlags = flags
                        this.dispatchEvent(
                            new CustomEvent("aimg:upfile-state", {
                                detail: flags,
                                bubbles: true,
                            }),
                        )
                    },
                    onUiHintChange: (hint: UpfileUiHintFlags) => {
                        this.dispatchEvent(
                            new CustomEvent("aimg:upfile-ui-hint", {
                                detail: hint,
                                bubbles: true,
                            }),
                        )
                    },
                }),
                this,
            )
        }

        disconnectedCallback(): void {
            this.removeEventListener("aimg:reloading", this)
            render(null, this)
            this.#commands = null
            this.#latestStateFlags = null
        }

        clickFileattach(): void {
            this.#commands?.clickFileattach()
        }

        clickPaint(): void {
            this.#commands?.clickPaint()
        }

        clickPaste(): void {
            this.#commands?.clickPaste()
        }

        clickClear(): void {
            this.#commands?.clickClear()
        }

        #listenReload(): void {
            this.addEventListener("aimg:reloading", this)
        }

        handleEvent(e: GlobalEventHandlersEventMap["aimg:reloading"]): void {
            if (this.#isBusy(e.detail.isFullReload)) {
                e.preventDefault()
            }
        }

        /**
         * リロードを止めたい状況かどうか判定。
         *
         * v1は`file?.hidden`をモード判定の代用にしていたが、v2は内部の
         * `<input type=file>`が常に`hidden`なので、同じトリックは使えない。
         * 代わりにfragmentから受け取った`UpfileStateFlags.isBusy`(= 何らかの
         * 作業中)を使う。
         */
        #isBusy(isFullReload: boolean): boolean {
            if (isFullReload) {
                // 添付画像・お絵描き中なら止める
                if (this.#latestStateFlags?.isBusy) {
                    return true
                }
                const file = this.querySelector(
                    "input[type=file]",
                ) as HTMLInputElement | null

                return Boolean(file?.files?.length)
            } else {
                // 無駄な通信がいやなのではっちゃんが開いているとき止める
                return 2 <= document.getElementsByTagName("canvas").length
            }
        }
    }
