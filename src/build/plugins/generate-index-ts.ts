import { glob, writeFile } from "node:fs/promises"
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
 * 内容は `export * from "./<filename>"` の形 (`.d.ts`は`export type *`)。
 * 直接ファイルを持つディレクトリのみが対象で、子ディレクトリしか持たない
 * 中間ディレクトリにはindex.tsを生成しない。
 */
export async function generateIndexTs({
    dir,
    excludePatterns,
}: GenerateIndexTsOptions): Promise<void> {
    const dirToFilesMap = new Map<string, string[]>()

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
    }

    await Promise.all(
        [...dirToFilesMap.entries()].map(([d, files]) =>
            writeIndexTsFile(d, files),
        ),
    )
}

async function writeIndexTsFile(dir: string, files: string[]): Promise<void> {
    const lines = files.map((file) => {
        const stem = basename(file, extname(file))
        const isDts = file.endsWith(".d.ts")
        return `export ${isDts ? "type " : ""}* from "./${stem}"`
    })
    await writeFile(join(dir, "index.ts"), lines.join("\n"))
}

/** generateIndexTsをビルドツールで使えるプラグインにしたもの */
export const generateIndexTsUnplugin: UnpluginInstance<
    GenerateIndexTsOptions,
    false
> = createUnplugin((opts: GenerateIndexTsOptions) => ({
    name: "generateIndexTs",
    buildStart: () => generateIndexTs(opts),
}))
