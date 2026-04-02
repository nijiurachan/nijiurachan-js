declare global {
    interface GlobalEventHandlersEventMap {
        /**
         * 投稿フォーム送信直前に発火するイベント。ターゲットは`form`要素。
         * `preparing`プロパティにPromiseをセットすると、それが解決されるまで送信を待機させることができる。
         */
        "aimg:prepare-submit": CustomEvent<{ preparing?: Promise<void> }>

        /**
         * 投稿の成功後発火するイベント。ターゲットは`form`要素。
         */
        "aimg:submitted": CustomEvent<void>

        /**
         * 投稿フォームが開閉した時に発火するイベント。ターゲットは`form`要素。
         * `isCollapsed`プロパティがtrueの場合は閉じている、falseの場合は開いている。
         */
        "aimg:popup-form-toggled": CustomEvent<{ isCollapsed: boolean }>

        /**
         * アクノスペイントのお絵描き完了で発火するイベント。ターゲットはwindow。
         */
        "aimg:painted": CustomEvent<{
            /** アクノスペイントを開くとき指定されたID */
            popupId: string
            /** 描き終えた画像。失敗した場合null */
            image: Blob | null
            /** 親画面でイベントが受け取られたらtrueに設定される */
            isAccepted: boolean
        }>

        /**
         * はっちゃんが開く時に発火するイベント。ターゲットは`form`要素。
         */
        "aimg:hacchan-start": CustomEvent<void>

        /**
         * スレやカタログを(なるべくページ丸ごと更新せずに)リロードしてほしい時に発火するイベント。ターゲットは要求した要素。
         */
        "aimg:reload-request": CustomEvent<void>

        /**
         * リロードするか確認したいとき発火するイベント。ターゲットはリロードをキャンセルしたいかもしれない要素。
         */
        "aimg:reloading": CustomEvent<{
            isFullReload: boolean
        }>
    }
}
export {}
