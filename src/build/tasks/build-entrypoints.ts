import { glob } from "node:fs/promises"
import { join } from "node:path"
import { build } from "bun"
import { generateIndexTsUnplugin } from "../plugins/generate-index-ts"
import { tscUnplugin } from "../plugins/tsc"

export type BuildOnceOptions = {
    /** TypeScriptのソースフォルダ */
    dir: string
    /** ビルドエラーを例外にするかどうか */
    throwError: boolean
    /** 開発ビルドかどうか */
    buildFor: "production" | "development"
}

/**
 * 指定されたTypeScriptをそれぞれバンドルする。
 * ts/entrypoints/pc.ts → public/assets/js/ts/pc.js
 * ts/entrypoints/sp.ts → public/assets/js/ts/sp.js
 */
export async function buildEntrypoints({
    dir,
    throwError,
    buildFor,
}: BuildOnceOptions): Promise<{ success: boolean }> {
    try {
        const entrypoints = await Array.fromAsync(
            glob(join(dir, "entrypoints/*.{ts,html}"), {
                exclude: ["**/index.ts"],
            }),
        )
        await build({
            entrypoints,
            outdir: "public/assets/js/ts",
            target: "browser",
            minify: buildFor === "production",
            sourcemap: "linked",
            splitting: buildFor === "production",
            define: {
                "import.meta.PROD": `${buildFor === "production"}`,
                "import.meta.DEV": `${buildFor !== "production"}`,
            },
            plugins: [
                generateIndexTsUnplugin.bun({
                    dir,
                    excludePatterns: ["**/build"],
                }),
                tscUnplugin.bun({ dir: join(dir, "entrypoints") }),
            ],
        } satisfies Bun.BuildConfig)

        console.info("build ok at", new Date().toLocaleString("ja"))

        return { success: true }
    } catch (e) {
        console.warn("build failed at", new Date().toLocaleString("ja"))
        if (throwError) {
            throw e
        }

        return { success: false }
    }
}
