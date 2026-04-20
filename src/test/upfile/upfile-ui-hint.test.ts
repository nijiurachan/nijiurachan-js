import { describe, expect, test } from "vitest"
import {
    toUpfileUiHintFlags,
    type UpfileMode,
    type UpfileUiHintFlags,
} from "#js/pure/upfile"

describe(toUpfileUiHintFlags, () => {
    const modes: UpfileMode[] = [
        "empty",
        "file-attached",
        "waiting-axnos",
        "waiting-hacchan",
    ] as const

    // mode × allowImageReplies = 4 × 2 = 8ケース
    const cases: [UpfileMode, boolean, UpfileUiHintFlags][] = [
        [
            "empty",
            true,
            {
                showAllowImageLabel: false,
                showUpfileButton: true,
                showPaintButton: true,
                showPasteButton: true,
                showClearButton: true,
            },
        ],
        [
            "empty",
            false,
            {
                showAllowImageLabel: true,
                showUpfileButton: false,
                showPaintButton: true,
                showPasteButton: false,
                showClearButton: true,
            },
        ],
        [
            "file-attached",
            true,
            {
                showAllowImageLabel: false,
                showUpfileButton: true,
                showPaintButton: false,
                showPasteButton: true,
                showClearButton: true,
            },
        ],
        [
            "file-attached",
            false,
            {
                showAllowImageLabel: true,
                showUpfileButton: false,
                showPaintButton: false,
                showPasteButton: false,
                showClearButton: true,
            },
        ],
        [
            "waiting-axnos",
            true,
            {
                showAllowImageLabel: false,
                showUpfileButton: false,
                showPaintButton: false,
                showPasteButton: false,
                showClearButton: true,
            },
        ],
        [
            "waiting-axnos",
            false,
            {
                showAllowImageLabel: true,
                showUpfileButton: false,
                showPaintButton: false,
                showPasteButton: false,
                showClearButton: true,
            },
        ],
        [
            "waiting-hacchan",
            true,
            {
                showAllowImageLabel: false,
                showUpfileButton: false,
                showPaintButton: false,
                showPasteButton: false,
                showClearButton: true,
            },
        ],
        [
            "waiting-hacchan",
            false,
            {
                showAllowImageLabel: true,
                showUpfileButton: false,
                showPaintButton: false,
                showPasteButton: false,
                showClearButton: true,
            },
        ],
    ]

    test.each(cases)(
        "mode=%s allowImageReplies=%s のとき期待通りのフラグが返ること",
        (mode, allowImageReplies, expected) => {
            expect(toUpfileUiHintFlags(mode, { allowImageReplies })).toEqual(
                expected,
            )
        },
    )

    test("全モードで showAllowImageLabel は allowImageReplies=false のときのみtrue", () => {
        for (const mode of modes) {
            expect(
                toUpfileUiHintFlags(mode, { allowImageReplies: true })
                    .showAllowImageLabel,
            ).toBe(false)
            expect(
                toUpfileUiHintFlags(mode, { allowImageReplies: false })
                    .showAllowImageLabel,
            ).toBe(true)
        }
    })
})
