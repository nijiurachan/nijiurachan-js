/**
 * スコープ名とidから`registry`用のキー文字列を合成する。
 * スコープなしの場合は`id`をそのまま使う。
 */
export function buildFullKey(
    scopeName: string | undefined,
    id: string,
): string {
    if (!id) {
        throw new Error("PreactWrapperV1: id must be a non-empty string")
    }
    return scopeName ? `${scopeName}:${id}` : id
}
