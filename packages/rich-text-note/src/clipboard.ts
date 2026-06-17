import { Fragment, sliceFragment } from "./fragment.js";

export const COBALT_CLIPBOARD_MIME = "application/x-cobalt-fragment+json";
export const COBALT_NOTEBOOK_CLIPBOARD_MIME = "application/x-cobalt-notebook-fragments+json";

export function writeFragmentToClipboard(
    clipboardData: DataTransfer,
    fragment: Fragment
): void {
    clipboardData.setData("text/plain", fragment.text);
    clipboardData.setData(
        COBALT_CLIPBOARD_MIME,
        JSON.stringify(fragment)
    );
}

export function writeFragmentsToClipboard(
    clipboardData: DataTransfer,
    fragments: Fragment[]
): void {
    const normalized = fragments.map(normalizeClipboardFragment);

    clipboardData.setData(
        "text/plain",
        normalized.map(fragment => fragment.text).join("\n")
    );

    clipboardData.setData(
        COBALT_NOTEBOOK_CLIPBOARD_MIME,
        JSON.stringify({ fragments: normalized })
    );

    if (normalized.length === 1) {
        clipboardData.setData(
            COBALT_CLIPBOARD_MIME,
            JSON.stringify(normalized[0])
        );
    }
}

export function readFragmentFromClipboard(
    clipboardData: DataTransfer
): Fragment {
    const serialized = clipboardData.getData(COBALT_CLIPBOARD_MIME);

    if (serialized) {
        const parsed = JSON.parse(serialized) as Fragment;

        return normalizeClipboardFragment(parsed);
    }

    return {
        text: clipboardData.getData("text/plain"),
        annotations: []
    };
}

export function readFragmentsFromClipboard(
    clipboardData: DataTransfer
): Fragment[] {
    const serialized = clipboardData.getData(COBALT_NOTEBOOK_CLIPBOARD_MIME);

    if (serialized) {
        const parsed = JSON.parse(serialized) as { fragments?: unknown };

        if (Array.isArray(parsed.fragments)) {
            return parsed.fragments
                .map(fragment => normalizeClipboardFragment(fragment as Fragment))
                .filter(fragment => fragment.text.length > 0);
        }
    }

    const fragment = readFragmentFromClipboard(clipboardData);

    return fragment.text.length > 0
        ? [fragment]
        : [];
}

export function getClipboardFragment(
    fragment: Fragment,
    start: number,
    end: number
): Fragment {
    return sliceFragment(fragment, start, end);
}

function normalizeClipboardFragment(fragment: Fragment): Fragment {
    const text = typeof fragment.text === "string"
        ? fragment.text
        : "";

    const annotations = Array.isArray(fragment.annotations)
        ? fragment.annotations
            .filter(annotation =>
                Array.isArray(annotation.range) &&
                annotation.range.length === 2 &&
                typeof annotation.range[0] === "number" &&
                typeof annotation.range[1] === "number" &&
                typeof annotation.tag === "string" &&
                typeof annotation.order === "number"
            )
            .map(annotation => ({
                range: [
                    Math.max(0, Math.min(text.length, annotation.range[0])),
                    Math.max(0, Math.min(text.length, annotation.range[1]))
                ] as [number, number],
                tag: annotation.tag,
                order: annotation.order
            }))
            .filter(annotation => annotation.range[1] > annotation.range[0])
        : [];

    return {
        text,
        annotations
    };
}
