import type { FunctionComponent, VNode } from "preact"
import {
    useEffect,
    useLayoutEffect,
    useMemo,
    useReducer,
    useRef,
    useState,
} from "preact/hooks"
import type {
    UpfileAction,
    UpfileStateFlags,
    UpfileUiHintFlags,
} from "#js/pure/upfile"
import {
    getShownControls,
    nextMode,
    toUpfileStateFlags,
    toUpfileUiHintFlags,
} from "#js/pure/upfile"
import type { IAxnosPaintPopup } from "./types"
import {
    listenPaste,
    listenPopupFormToggled,
    pasteFromClipboard,
    previewFile,
    setImage,
    welcomeHacchan,
} from "./upfile-input-fragment"

/**
 * `upfile-input-v2`要素に外から叩き込むコマンド群。
 * fragment側が`bindCommands`で実装を差し込み、element側がhost methodとして公開する。
 */
export interface UpfileV2Commands {
    /** 隠し`<input type=file>`をクリックしてOSのファイルピッカーを開く */
    clickFileattach(): void
    /** お絵描きボタンが押されたのと等価 (アクノスペイントを起動) */
    clickPaint(): void
    /** 貼付ボタンが押されたのと等価 (クリップボードから画像を取り込む) */
    clickPaste(): void
    /** クリアボタンが押されたのと等価 (emptyモードに戻す) */
    clickClear(): void
}

/** v2添付File欄の動作に必要な設定 */
export type UpfileInputV2Props = {
    /** 添付File欄が所属するフォーム要素 */
    form: HTMLFormElement
    /** 画像添付を許可するならtrue、お絵描きのみならfalse */
    allowImageReplies: boolean
    /** はっちゃんキャンバス幅 */
    canvasWidth: number
    /** はっちゃんキャンバス高さ */
    canvasHeight: number
    /** 状態変化時に呼ばれる (element側が`aimg:upfile-state`発火に使う) */
    onStateChange?: (flags: UpfileStateFlags) => void
    /** UI推奨フラグが変わった時に呼ばれる (element側が`aimg:upfile-ui-hint`発火に使う) */
    onUiHintChange?: (hint: UpfileUiHintFlags) => void
    /** マウント時、外から叩くためのコマンド実装を受け取るコールバック */
    bindCommands?: (cmds: UpfileV2Commands) => void
}

/**
 * v2添付File欄の中身。UIボタン (🎨お絵かき / 📋貼付 / 🗑クリア / 画像添付不可label /
 * 可視fileinput) は**描画しない**。外部ツールバーが`aimg:upfile-ui-hint`を購読して
 * 自前で描画する想定。
 *
 * 保持するDOMは:
 * - 隠し`<input type="file" name="upfile">` (formに値を持たせるため)
 * - はっちゃん用`<button id=oebtnj>` / `<input id=baseform>` / `<figure id=ftbl>`+`<canvas id=oejs>`
 */
export const makeUpfileInputFragmentV2 = (
    axnosPaintPopup: IAxnosPaintPopup,
): FunctionComponent<UpfileInputV2Props> =>
    function UpfileInputFragmentV2(props: UpfileInputV2Props): VNode {
        const [mode, reducerDispatch] = useReducer(nextMode, "empty")
        const controls = useMemo(() => getShownControls(mode), [mode])
        const upfileRef = useRef<HTMLInputElement>(null)
        const baseformRef = useRef<HTMLInputElement>(null)
        const canvasRef = useRef<HTMLCanvasElement>(null)
        const previewFigureRef = useRef<HTMLElement>(null)
        const [isPopupFormCollapsed, setIsPopupFormCollapsed] = useState(false)

        // biome-ignore lint/correctness/useExhaustiveDependencies: one-shot on mount
        useEffect(() => listenSubmit(props.form), [])
        // biome-ignore lint/correctness/useExhaustiveDependencies: listenAxnosPaintはmode変化時のcontrols再計算を前提に動くので敢えてmodeをdepsに残す
        useEffect(listenAxnosPaint, [mode])
        // biome-ignore lint/correctness/useExhaustiveDependencies: one-shot on mount
        useEffect(
            () => listenPopupFormToggled(props.form, setIsPopupFormCollapsed),
            [],
        )
        // biome-ignore lint/correctness/useExhaustiveDependencies: onStateChangeの参照変化では再発火しない
        useEffect(() => {
            props.onStateChange?.(
                toUpfileStateFlags(mode, { isPopupFormCollapsed }),
            )
        }, [mode, isPopupFormCollapsed])
        // biome-ignore lint/correctness/useExhaustiveDependencies: onUiHintChangeの参照変化では再発火しない
        useEffect(() => {
            props.onUiHintChange?.(
                toUpfileUiHintFlags(mode, {
                    allowImageReplies: props.allowImageReplies,
                }),
            )
        }, [mode, props.allowImageReplies])
        // biome-ignore lint/correctness/useExhaustiveDependencies: one-shot on mount
        useEffect(() => {
            props.bindCommands?.({
                clickFileattach: () => upfileRef.current?.click(),
                clickPaint: () => dispatch("paint-button-clicked"),
                clickPaste: () => dispatch("paste-button-clicked"),
                clickClear: () => dispatch("clear-button-clicked"),
            })
        }, [])

        if (props.allowImageReplies) {
            // biome-ignore lint/correctness/useHookAtTopLevel: allowImageRepliesはpropsなのでライフサイクル中不変
            // biome-ignore lint/correctness/useExhaustiveDependencies: controlsがmode由来なのを残したい
            useEffect(
                () => listenPaste(acceptPaste),
                [controls.pasteButton, controls.upfileInput],
            )
        }

        // biome-ignore lint/correctness/useExhaustiveDependencies: propsの他フィールドが変わっただけで再welcomeしたくない
        useLayoutEffect(() => {
            if (controls.oejsCanvas) {
                welcomeHacchan(canvasRef.current, props)
            }
        }, [controls.oejsCanvas])

        return (
            <>
                <input
                    ref={upfileRef}
                    type="file"
                    name="upfile"
                    accept={
                        props.allowImageReplies
                            ? "image/*,video/mp4,video/webm"
                            : "image/png,image/webp"
                    }
                    hidden
                    onChange={() => dispatch("file-selected")}
                />

                <button
                    hidden
                    id={controls.hacchanButton ? "oebtnj" : ""}
                    onClick={() => dispatch("hacchan-button-clicked")}
                    type="button"
                />

                <input
                    id={controls.baseformInput ? "baseform" : ""}
                    type="hidden"
                    ref={baseformRef}
                />

                <figure
                    id="ftbl"
                    ref={previewFigureRef}
                    hidden={!controls.oejsCanvas && !controls.previewFigure}
                >
                    {controls.oejsCanvas && (
                        <canvas
                            ref={canvasRef}
                            id={isPopupFormCollapsed ? "" : "oejs"}
                        />
                    )}
                </figure>
            </>
        )

        /** ペーストされた画像を受け取る */
        function acceptPaste(image: Blob | undefined): void {
            if (image && controls.pasteButton && controls.upfileInput) {
                setImage("paste", upfileRef.current, image)
                dispatch("image-pasted")
            } else {
                console.warn("paste ignored", {
                    image,
                    pasteButton: controls.pasteButton,
                    upfileInput: controls.upfileInput,
                })
            }
        }

        /** フォーム送信関係のイベントを設定する */
        function listenSubmit(form: HTMLFormElement): () => void {
            const abort = new AbortController()

            form.addEventListener("aimg:prepare-submit", prepareSubmit, abort)

            form.addEventListener(
                "aimg:submitted",
                () => dispatch("submitted"),
                abort,
            )

            return () => abort.abort()
        }

        /** フォーム送信のとき使う。canvasやbaseformを変換してupfileに設定する */
        function prepareSubmit(
            e: CustomEvent<{ preparing?: Promise<void> }>,
        ): void {
            e.detail.preparing = prepareHacchanImage()?.then((blob) =>
                setImage("oekaki98", upfileRef.current, blob),
            )
        }

        /** はっちゃんの出力する画像 (キャンバスorAPNG) を読み取る */
        function prepareHacchanImage(): Promise<Blob> | undefined {
            if (baseformRef.current?.value) {
                const dataUrl = `data:image/png;base64,${baseformRef.current.value}`
                return fetch(dataUrl).then((res) => res.blob())
            } else if (canvasRef.current) {
                const canvas = canvasRef.current
                return new Promise((resolve, reject) => {
                    try {
                        canvas.toBlob(
                            (blob) => {
                                if (blob) {
                                    resolve(blob)
                                } else {
                                    reject(
                                        Error(
                                            "Failed to convert canvas to blob",
                                        ),
                                    )
                                }
                            },
                            "image/webp",
                            1,
                        )
                    } catch (err) {
                        reject(err)
                    }
                })
            }
        }

        /** アクノスペイントのポップアップを表示したりアクションに変換したりする */
        function listenAxnosPaint(): undefined | (() => void) {
            if (controls.axnosPaintWindow) {
                const promise = axnosPaintPopup.popup(props)

                promise
                    .then((image) => {
                        setImage("oekaki", upfileRef.current, image)
                        dispatch("paint-finished")
                    })
                    .catch((e) => {
                        console.warn(e)
                        dispatch("clear-button-clicked")
                    })

                return () => axnosPaintPopup.abort()
            } else {
                axnosPaintPopup.abort()
            }
        }

        /** 各アクションが起きたとき一緒にやる処理 */
        function dispatch(action: UpfileAction): void {
            onDispatch(action)
            reducerDispatch(action)
        }

        /** 各操作があったら遷移前にやる処理 */
        function onDispatch(action: UpfileAction): void {
            switch (action) {
                case "paste-button-clicked":
                    pasteFromClipboard(navigator.clipboard)
                        .then(acceptPaste)
                        .catch(console.warn)
                    return
                case "clear-button-clicked":
                    if (upfileRef.current) {
                        upfileRef.current.value = ""
                    }
                    return
                case "file-selected":
                    previewFile(upfileRef.current, previewFigureRef.current)
                    return
                case "hacchan-button-clicked":
                    if (!controls.oejsCanvas) {
                        previewFile(null, previewFigureRef.current)
                    }

                    // JS側で反応できるようイベント発行
                    props.form.dispatchEvent(
                        new CustomEvent("aimg:hacchan-start", {
                            bubbles: true,
                        }),
                    )
                    return
                case "paint-finished":
                case "paint-button-clicked":
                case "image-pasted":
                case "submitted":
                    return
            }
        }
    }
