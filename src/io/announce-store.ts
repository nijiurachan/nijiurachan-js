// お知らせバナーのブラウザ側キャッシュ入出力。
// parse/serialize は pure/announce.ts に委譲し、ここは storage アクセスの
// ガード(プライベートブラウジング / SecurityError / 未定義環境)だけを担う。
import {
  type AnnounceCache,
  type DismissedState,
  emptyAnnounceCache,
  parseAnnounceCache,
  serializeAnnounceCache,
} from "../pure/announce"

/** localStorage: meta/banner のキャッシュ(既存の aimg- プレフィックス規約に合わせる) */
export const ANNOUNCE_CACHE_KEY = "aimg-announce"
/**
 * localStorage: ✕で閉じたときの {rev, article} スナップショット。
 * セッションを跨いでも保持し、rev/article のいずれかが変化するまで再表示しない。
 */
export const ANNOUNCE_DISMISSED_KEY = "aimg-announce-dismissed"

export function readAnnounceCache(): AnnounceCache {
  try {
    if (typeof localStorage === "undefined") return emptyAnnounceCache()
    return parseAnnounceCache(localStorage.getItem(ANNOUNCE_CACHE_KEY))
  } catch {
    // getItem が投げる環境では毎回未キャッシュ扱い(マウント毎の再取得に劣化するだけ)
    return emptyAnnounceCache()
  }
}

export function writeAnnounceCache(cache: AnnounceCache): void {
  try {
    if (typeof localStorage === "undefined") return
    localStorage.setItem(ANNOUNCE_CACHE_KEY, serializeAnnounceCache(cache))
  } catch {
    // 書けなくてもウィジェットの動作は継続する
  }
}

export function readDismissedState(): DismissedState | null {
  try {
    if (typeof localStorage === "undefined") return null
    const raw = localStorage.getItem(ANNOUNCE_DISMISSED_KEY)
    if (raw == null) return null
    const parsed: unknown = JSON.parse(raw)
    if (typeof parsed !== "object" || parsed == null || Array.isArray(parsed)) {
      return null
    }
    const o = parsed as Record<string, unknown>
    if (typeof o.rev !== "number" || !Number.isFinite(o.rev)) return null
    const article =
      typeof o.article === "string"
        ? o.article
        : o.article === null
          ? null
          : undefined
    if (article === undefined) return null
    return { rev: o.rev, article }
  } catch {
    return null
  }
}

export function writeDismissedState(state: DismissedState): void {
  try {
    if (typeof localStorage === "undefined") return
    localStorage.setItem(ANNOUNCE_DISMISSED_KEY, JSON.stringify(state))
  } catch {
    // 書けない環境では ✕ 状態が永続化されないだけ(セッション中の非表示は残る)
  }
}
