import type { CSSProperties, ReactNode } from "react"
import type { UpfileStateFlags } from "#js/pure/upfile"

export type { UpfileStateFlags }

/** `<PreactWrapperV1.Scope>`のprops */
export interface ScopeProps {
    /**
     * スコープ名。配下の`<UpfileInput id="x">`は`fullKey = "<name>:x"`で登録される。
     * フック側 (`useUpfileState`等) が外部から同じ`fullKey`で購読するために使う。
     * 同じツリーに既にScopeがある場合 (ネスト) は開発時エラーとする。
     */
    name: string
    children?: ReactNode
}

/** `<PreactWrapperV1.UpfileInput>`のprops */
export interface UpfileInputProps {
    /**
     * インスタンスID。`<Scope>`配下なら`"<scopeName>:id"`、Scopeなしなら`"id"`として登録される。
     */
    id: string

    /**
     * 添付ファイルの許可種別 (必須。要素の`connectedCallback`が要求する)。
     * `"file"`でファイル添付+お絵描き、それ以外 (例: `"paint"`) はお絵描き専用。
     * `data-allow-type`属性にマップされる。
     */
    allowType: string

    /** placeholder divに付けるクラス名 (内部のupfile-inputには影響しない) */
    className?: string
    /** placeholder divに付けるstyle */
    style?: CSSProperties

    // --- ローカル購読ハンドラ (この`<UpfileInput>`内で完結する処理用) ---
    // 外部ツリーから購読したい場合は`useUpfileEvent`/`useUpfileState`を使う

    /** リロード抑止判定用 (送信中にpreventDefaultする等) */
    onReloading?: (e: CustomEvent<{ isFullReload: boolean }>) => void
    /** アクノスペイントのお絵描き完了 */
    onPainted?: (
        e: CustomEvent<{
            popupId: string
            image: Blob | null
            isAccepted: boolean
        }>,
    ) => void
    /** はっちゃん開始 */
    onHacchanStart?: (e: CustomEvent<void>) => void
    /** 投稿フォーム開閉 */
    onPopupFormToggled?: (e: CustomEvent<{ isCollapsed: boolean }>) => void
    /** 状態フラグ更新 (ローカルでも必要なら) */
    onUpfileState?: (e: CustomEvent<UpfileStateFlags>) => void
}

/**
 * `useUpfileState`のselector型。
 * デフォルトは`UpfileStateFlags`そのものを返す恒等selector。
 */
export type UpfileStateSelector<T> = (state: UpfileStateFlags) => T
