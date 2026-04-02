/**
// @file あいもげ棒読みちゃん連携を取り込んで改良したもの
// @description  aimgの新着レスをHTTP連携で棒読みちゃんに転送
// @author       yofumin
// @license      MIT
*/

/**
 * 棒読みちゃん連携設定
 */
interface BouyomiSettings {
    /** 常にON（全スレッド） */
    alwaysEnabled: boolean
    /** 新着時自動スクロール */
    autoScroll: boolean
    /** 棒読みちゃんHTTPエンドポイント */
    endpoint: string
    /** 個別ONにしたスレッドID一覧 */
    enabledThreadIds: string[]
}

const STORAGE_KEY = "bouyomiSettings"
const DEFAULT_ENDPOINT = "http://localhost:50080/Talk"
const INIT_COOLDOWN_MS = 3000
const QUEUE_INTERVAL_MS = 500
const MAX_TEXT_LENGTH = 200

/**
 * 棒読みちゃん連携カスタム要素
 * 新着レスを検出して棒読みちゃんに送信する
 */
export class BouyomiConnectorElement extends HTMLElement {
    /** MutationObserver */
    #observer: MutationObserver | null = null

    /** 読み上げキュー */
    #queue: string[] = []

    /** キュー処理中フラグ */
    #isProcessing = false

    /** 初期化完了フラグ（クールタイム後にtrue） */
    #isInitialized = false

    /** 処理済みレスID（重複読み上げ防止） */
    #processedReplyIds: Set<string> = new Set()

    /** 設定 */
    #settings: BouyomiSettings = {
        alwaysEnabled: false,
        autoScroll: false,
        endpoint: DEFAULT_ENDPOINT,
        enabledThreadIds: [],
    }

    /** UIパネル要素 */
    #panel: HTMLElement | null = null

    /** クールダウンタイマーID */
    #cooldownTimer: ReturnType<typeof setTimeout> | null = null

    /** キュー処理タイマーID */
    #queueTimer: ReturnType<typeof setTimeout> | null = null

    /** この要素を登録 */
    static define(): void {
        customElements.define("bouyomi-connector", BouyomiConnectorElement)
    }

    /** 現在のスレッドID */
    get #threadId(): string {
        return this.getAttribute("data-thread-id") || ""
    }

    /** 読み上げが有効かどうか */
    get #isEnabled(): boolean {
        return (
            this.#settings.alwaysEnabled ||
            this.#settings.enabledThreadIds.includes(this.#threadId)
        )
    }

    connectedCallback(): void {
        this.#loadSettings()
        this.#createPanel()

        // 既存レスのIDを収集（読み上げ対象から除外するため）
        this.#collectExistingReplyIds()

        this.#startObserver()

        // 初期ロードクールタイム（既存レスの読み上げ防止）
        this.#cooldownTimer = setTimeout(() => {
            this.#isInitialized = true
            this.#cooldownTimer = null
        }, INIT_COOLDOWN_MS)
    }

    disconnectedCallback(): void {
        this.#stopObserver()
        this.#panel?.remove()

        // タイマーをクリア
        if (this.#cooldownTimer !== null) {
            clearTimeout(this.#cooldownTimer)
            this.#cooldownTimer = null
        }
        if (this.#queueTimer !== null) {
            clearTimeout(this.#queueTimer)
            this.#queueTimer = null
        }
        this.#isInitialized = false
        this.#isProcessing = false
    }

    /** 設定をlocalStorageから読み込み */
    #loadSettings(): void {
        try {
            const saved = localStorage.getItem(STORAGE_KEY)
            if (saved) {
                const parsed = JSON.parse(saved) as Partial<BouyomiSettings>
                this.#settings = {
                    alwaysEnabled: parsed.alwaysEnabled ?? false,
                    autoScroll: parsed.autoScroll ?? false,
                    endpoint: parsed.endpoint ?? DEFAULT_ENDPOINT,
                    enabledThreadIds: parsed.enabledThreadIds ?? [],
                }
            }
        } catch {
            // パースエラー時はデフォルト値を使用
        }
    }

    /** 設定をlocalStorageに保存 */
    #saveSettings(): void {
        try {
            localStorage.setItem(STORAGE_KEY, JSON.stringify(this.#settings))
        } catch {
            // プライベートモードやストレージ容量超過時は無視
        }
    }

    /** 既存レスのIDを収集 */
    #collectExistingReplyIds(): void {
        const repliesContainer = document.querySelector("[data-thread-replies]")
        if (!repliesContainer) return

        repliesContainer
            .querySelectorAll("table[data-reply-id]")
            .forEach((el) => {
                const replyId = el.getAttribute("data-reply-id")
                if (replyId) {
                    this.#processedReplyIds.add(replyId)
                }
            })
    }

    /** MutationObserverを開始 */
    #startObserver(): void {
        const repliesContainer = document.querySelector("[data-thread-replies]")
        if (!repliesContainer) return

        this.#observer = new MutationObserver((mutations) => {
            this.#handleMutations(mutations)
        })

        this.#observer.observe(repliesContainer, {
            childList: true,
            subtree: true,
        })
    }

    /** MutationObserverを停止 */
    #stopObserver(): void {
        this.#observer?.disconnect()
        this.#observer = null
    }

    /** Mutation処理 */
    #handleMutations(mutations: MutationRecord[]): void {
        if (!this.#isInitialized) return

        for (const mutation of mutations) {
            for (const node of mutation.addedNodes) {
                if (node.nodeType !== Node.ELEMENT_NODE) continue

                const element = node as Element

                // 新着レス（table[data-reply-id]）を検出
                // addedNodesには直接挿入されたノードのみ含まれるため、
                // 自身のチェックに加え子孫も検索する
                const targets = element.matches("table[data-reply-id]")
                    ? [element]
                    : Array.from(
                          element.querySelectorAll("table[data-reply-id]"),
                      )

                for (const target of targets) {
                    const replyId = target.getAttribute("data-reply-id")
                    if (replyId && !this.#processedReplyIds.has(replyId)) {
                        this.#processedReplyIds.add(replyId)
                        this.#processNewReply(target)
                    }
                }
            }
        }
    }

    /** 新着レス処理 */
    #processNewReply(replyElement: Element): void {
        // 自動スクロール
        if (this.#settings.autoScroll) {
            this.#scrollToBottom()
        }

        // 読み上げが無効なら終了
        if (!this.#isEnabled) return

        // テキスト抽出
        const text = this.#extractTextFromReply(replyElement)
        if (text) {
            this.#enqueue(text)
        }
    }

    /** レスからテキストを抽出 */
    #extractTextFromReply(replyElement: Element): string {
        const blockquote = replyElement.querySelector("blockquote")
        if (!blockquote) return ""

        // クローンしてURL要素を除去
        const clone = blockquote.cloneNode(true) as Element

        // URL含むリンクを除去
        clone.querySelectorAll("a").forEach((a) => {
            const href = a.getAttribute("href") || ""
            const text = a.textContent || ""
            // URLっぽいテキストを含むリンクを除去
            if (
                href.startsWith("http") ||
                text.startsWith("http") ||
                text.includes("://")
            ) {
                a.remove()
            }
        })

        // テキスト取得・整形
        let text = clone.textContent || ""
        text = text.replace(/https?:\/\/\S+/g, "") // 残りのURLを除去
        text = text.replace(/\s+/g, " ").trim() // 空白正規化

        // 200文字制限
        if (text.length > MAX_TEXT_LENGTH) {
            text = `${text.slice(0, MAX_TEXT_LENGTH)}...`
        }

        return text
    }

    /** キューに追加 */
    #enqueue(text: string): void {
        this.#queue.push(text)
        this.#processQueue()
    }

    /** キュー処理 */
    #processQueue(): void {
        if (this.#isProcessing || this.#queue.length === 0) return

        this.#isProcessing = true
        const text = this.#queue.shift()

        if (text) {
            this.#sendToBouyomi(text)
        }

        this.#queueTimer = setTimeout(() => {
            this.#queueTimer = null
            this.#isProcessing = false
            this.#processQueue()
        }, QUEUE_INTERVAL_MS)
    }

    /** 棒読みちゃんに送信 */
    #sendToBouyomi(text: string): void {
        const url = `${this.#settings.endpoint}?text=${encodeURIComponent(text)}`

        // no-corsモードで送信（レスポンスは取得不可だが送信は成功）
        fetch(url, { mode: "no-cors" }).catch(() => {
            // フォールバック: Image経由で送信
            const img = new Image()
            img.src = url
        })
    }

    /** 最下部にスクロール */
    #scrollToBottom(): void {
        requestAnimationFrame(() => {
            window.scrollTo({
                top: document.documentElement.scrollHeight,
                behavior: "smooth",
            })
        })
    }

    /** このスレッドの読み上げをトグル */
    #toggleThreadEnabled(): void {
        const threadId = this.#threadId
        if (!threadId) return

        const idx = this.#settings.enabledThreadIds.indexOf(threadId)
        if (idx >= 0) {
            this.#settings.enabledThreadIds.splice(idx, 1)
        } else {
            this.#settings.enabledThreadIds.push(threadId)
        }
        this.#saveSettings()
        this.#updateToggleButton()
    }

    /** トグルボタンの表示を更新 */
    #updateToggleButton(): void {
        const btn = this.#panel?.querySelector<HTMLButtonElement>(
            "[data-bouyomi-thread-toggle]",
        )
        if (!btn) return

        const threadId = this.#threadId
        const isOn =
            this.#settings.alwaysEnabled ||
            this.#settings.enabledThreadIds.includes(threadId)
        btn.textContent = isOn
            ? "このスレで読み上げ：ON"
            : "このスレで読み上げ：OFF"
        btn.style.background = isOn ? "#4CAF50" : "#888"
    }

    /** DOM要素を作成するヘルパー */
    #el<K extends keyof HTMLElementTagNameMap>(
        tag: K,
        props?: Partial<Record<string, string>>,
        children?: (Node | string)[],
    ): HTMLElementTagNameMap[K] {
        const el = document.createElement(tag)
        if (props) {
            for (const [k, v] of Object.entries(props)) {
                if (k === "className") el.className = v ?? ""
                else if (k === "textContent") el.textContent = v ?? ""
                else if (v !== undefined) el.setAttribute(k, v)
            }
        }
        if (children) {
            for (const child of children) {
                if (typeof child === "string") {
                    el.appendChild(document.createTextNode(child))
                } else {
                    el.appendChild(child)
                }
            }
        }
        return el
    }

    /** UIパネル作成 */
    #createPanel(): void {
        // トグルボタン
        const toggleBtn = this.#el(
            "button",
            {
                type: "button",
                "data-bouyomi-thread-toggle": "",
                style: "width:100%;padding:6px 8px;border:none;border-radius:4px;color:#fff;cursor:pointer;font-size:12px;font-weight:bold",
            },
            ["このスレで読み上げ：OFF"],
        )

        // 常にONチェックボックス
        const alwaysCheckbox = this.#el("input", {
            type: "checkbox",
            "data-bouyomi-always": "",
            style: "width:14px;height:14px;cursor:pointer",
        })
        const alwaysLabel = this.#el(
            "label",
            {
                style: "display:flex;align-items:center;gap:6px;margin-top:6px;cursor:pointer;font-size:12px",
            },
            [alwaysCheckbox, "常にON"],
        )

        // 自動スクロールチェックボックス
        const autoScrollCheckbox = this.#el("input", {
            type: "checkbox",
            "data-bouyomi-autoscroll": "",
            style: "width:14px;height:14px;cursor:pointer",
        })
        const autoScrollLabel = this.#el(
            "label",
            {
                style: "display:flex;align-items:center;gap:6px;margin-top:4px;cursor:pointer;font-size:12px",
            },
            [autoScrollCheckbox, "自動スクロール"],
        )

        // コントロール群
        const controls = this.#el("div", { className: "bouyomi-controls" }, [
            toggleBtn,
            alwaysLabel,
            autoScrollLabel,
        ])

        // ヘッダー
        const header = this.#el("div", { className: "bouyomi-header" }, [
            "棒読みちゃん連携",
        ])

        // パネル本体
        const body = this.#el("div", { className: "bouyomi-body" }, [
            header,
            controls,
        ])
        const content = this.#el("div", { className: "bouyomi-content" }, [
            body,
        ])

        // タブ
        const tabArrow = this.#el("span", { className: "tab-arrow" }, [
            "\u25B6",
        ])
        const tab = this.#el("div", { className: "bouyomi-tab" }, [
            tabArrow,
            "読み上げ",
        ])

        // コンテナ
        this.#panel = this.#el(
            "div",
            { className: "bouyomi-fixed collapsed" },
            [tab, content],
        )

        // タブクリックで開閉
        tab.addEventListener("click", () => {
            this.#panel?.classList.toggle("collapsed")
        })

        // トグルボタン
        toggleBtn.addEventListener("click", () => {
            this.#toggleThreadEnabled()
        })

        // 常にONチェックボックス
        alwaysCheckbox.checked = this.#settings.alwaysEnabled
        alwaysCheckbox.addEventListener("change", () => {
            this.#settings.alwaysEnabled = alwaysCheckbox.checked
            this.#saveSettings()
            this.#updateToggleButton()
        })

        // 自動スクロールチェックボックス
        autoScrollCheckbox.checked = this.#settings.autoScroll
        autoScrollCheckbox.addEventListener("change", () => {
            this.#settings.autoScroll = autoScrollCheckbox.checked
            this.#saveSettings()
        })

        document.body.appendChild(this.#panel)

        // 初期状態のボタン表示を更新
        this.#updateToggleButton()
    }
}
