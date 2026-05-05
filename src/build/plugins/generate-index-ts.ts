import { glob, readFile, writeFile } from "node:fs/promises"
import {
    basename,
    dirname,
    extname,
    join,
    matchesGlob,
    relative,
} from "node:path"
import { createUnplugin, type UnpluginInstance } from "unplugin"

export type GenerateIndexTsOptions = {
    /** index.tsを再帰的に生成するディレクトリ */
    dir: string
    /** index.tsを生成しないパターン */
    excludePatterns: string[]
}

/**
 * 各フォルダのindex.tsを再帰的に生成する。
 * 内容は `export * from "./<filename>"` の形。
 *
 * `export *`はdefault exportを再エクスポートしない仕様のため、対象ファイルに
 * `export default`があれば `export { default } from "./<filename>"` も追加で出す
 * (consumerが`import X from "@pkg/barrel"` で取れるようにするため)。
 * ディレクトリ内に複数のdefault exportがある場合は衝突するので先頭1件のみ採用する。
 */
export async function generateIndexTs({
    dir,
    excludePatterns,
}: GenerateIndexTsOptions): Promise<void> {
    const dirToFilesMap = new Map<string, string[]>()
    const allBarrelDirs = new Set<string>()

    for await (const file of glob(join(dir, "**", "*.{ts,tsx}"))) {
        if (excludePatterns.some((pattern) => matchesGlob(file, pattern))) {
            continue
        }
        if (matchesGlob(file, "**/{index.*,*.d.ts}")) {
            continue
        }
        const fileDir = dirname(file)
        const files = dirToFilesMap.get(fileDir) || []
        files.push(relative(fileDir, file))
        dirToFilesMap.set(fileDir, files)

        let cur = fileDir
        while (cur.startsWith(dir) && cur !== dir) {
            allBarrelDirs.add(cur)
            cur = dirname(cur)
        }
    }

    for (const d of allBarrelDirs) {
        if (dirToFilesMap.has(d)) continue
        const childSubdirs = [...allBarrelDirs]
            .filter((other) => dirname(other) === d)
            .map((other) => `${relative(d, other)}/`)
        if (childSubdirs.length > 0) {
            dirToFilesMap.set(d, childSubdirs)
        }
    }

    await Promise.all(
        [...dirToFilesMap.entries()].map(([d, files]) =>
            writeIndexTsFile(d, files),
        ),
    )
}

async function writeIndexTsFile(dir: string, files: string[]): Promise<void> {
    const lines: string[] = []
    let defaultReExportedFrom: string | null = null

    for (const file of files) {
        const isSubdir = file.endsWith("/")
        const stem = isSubdir
            ? file.slice(0, -1)
            : basename(file, extname(file))
        const isDts = file.endsWith(".d.ts")
        lines.push(`export ${isDts ? "type " : ""}* from "./${stem}"`)

        if (isSubdir) continue
        if (isDts) continue
        if (defaultReExportedFrom) continue

        const source = await readFile(join(dir, file), "utf8")
        if (hasDefaultExport(source)) {
            lines.push(`export { default } from "./${stem}"`)
            defaultReExportedFrom = stem
        }
    }

    await writeFile(join(dir, "index.ts"), lines.join("\n"))
}

/**
 * ファイル内に`export default ...`または`export { ..., default, ... }`があるか簡易判定。
 * コメント/文字列内の誤検出は拾わない (barrelが壊れたら後段のtscで落ちる)。
 */
function hasDefaultExport(source: string): boolean {
    if (/^\s*export\s+default\b/m.test(source)) return true
    if (/^\s*export\s*\{[^}]*\bdefault\b[^}]*\}/m.test(source)) return true
    return false
}

/** generateIndexTsをビルドツールで使えるプラグインにしたもの */
export const generateIndexTsUnplugin: UnpluginInstance<
    GenerateIndexTsOptions,
    false
> = createUnplugin((opts: GenerateIndexTsOptions) => ({
    name: "generateIndexTs",
    buildStart: () => generateIndexTs(opts),
}))
