# このフォルダについて

* カスタムエレメントの定義を置きます

## テンプレ(素の場合)

* 基本的には下でなんとかなると思います
* [On-demand definitions protocol](https://github.com/webcomponents-cg/community-protocols/blob/main/proposals/on-demand-definitions.md) を真似て、defineという名前で初期化を統一します

```ts
export class HelloWorldElement extends HTMLElement {
    /** この要素をHTMLで使えるよう登録 */
    static define(): void {
        customElements.define("hello-world", HelloWorldElement)
    }

    connectedCallback(): void {
        init(this)
    }
}

function init(elem: HTMLElement) {
    const name = elem.getAttribute("name") ?? "World"
    elem.textContent = `Hello, ${name}!`
}
```

## テンプレ(Preactを使う場合)

* `render`に`this`を渡せば普通に動くようです
* Preactは要素単位でちまちま導入して練習中です
* 要素をまたいだ処理はイベントを投げ合えばよいと思っていますが、具体例が出てから考えます
    * [上フォルダ](../README.md)もご参照ください

```ts
export class HelloWorldElement extends HTMLElement {
    /** この要素をHTMLで使えるよう登録 */
    static define(): void {
        customElements.define("hello-world", HelloWorldElement)
    }

    connectedCallback(): void {
        render(
            h(HelloWorld, {
                message: "hi!",
            }),
            this,
        )
    }

    disconnectedCallback(): void {
        render(null, this)
    }
}
```

## ライブラリに分割する例

* ファイルが長くなってきたら分割をお願いします(上限目安:200行)
* 次のようにクラス定義を返す関数にすると長い処理を逃がすことができます
* HTML要素はいくつでも置けるので、その数だけ部品を作る感じでお願いします(でないとグローバル変数になっちゃう)

```ts
/** ライブラリで使いたい処理 */
export interface IGreeting {
    makeMessage(): string
}

export const makeHelloWorldElement = (makeGreeting: () => IGreeting): CustomElementClass =>
    class HelloWorldElement extends HTMLElement {
        #message = ""

        /** この要素をHTMLで使えるよう登録 */
        static define(): void {
            customElements.define("hello-world", HelloWorldElement)
        }

        connectedCallback(): void {
            const greeting = makeGreeting()
            this.#message = greeting.makeMessage()
            this.addEventListener("click", () => console.info(this.#message))
        }
    }
```
