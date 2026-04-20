/**
 * `<PreactWrapperV1.UpfileInput>`のpropsキー名を、要素側が参照する`data-*`属性名に変換する対応表。
 * 「明示的に許可された属性だけ反映」の原則 (upfile-input 要素の公開仕様に準拠)。
 */
export const UPFILE_DATA_ATTR_MAP: Readonly<Record<string, `data-${string}`>> =
    {
        allowType: "data-allow-type",
    }
