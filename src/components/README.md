# このフォルダについて

* Preactコンポーネントを置きます

## テンプレ

* プロパティの型とか利用する部品の型をまず定義する形でやればなんとかなるはずです

```tsx
/** Helloの動作に必要な設定 */
export type HelloProps = {
    /** あいさつ文を作る */
    greeter: IGreeter
}

/** あいさつ文を作る部品 */
export interface IGreeter {
    makeMessage(): string
}

/** あいさつ文の表示 */
export const Hello: FunctionComponent<HelloProps> = ({
    greeter,
}: HelloProps): VNode => {
    const message = greeter.makeMessage()
    return <>
        <b>ハロー、{message}!</b>
    </>
}
```

## ライブラリに分割

* ファイルが長くなってきたら分割をお願いします(上限目安:200行)
* 外部部品のもらい方は[カスタムエレメントのほう](../elements/README.md)をご参照ください
