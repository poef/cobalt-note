import { sliceFragment } from "./fragment.js";
export const COBALT_CLIPBOARD_MIME = "application/x-cobalt-fragment+json";
export const COBALT_NOTEBOOK_CLIPBOARD_MIME = "application/x-cobalt-notebook-fragments+json";
export function writeFragmentToClipboard(clipboardData, fragment) {
    clipboardData.setData("text/plain", fragment.text);
    clipboardData.setData(COBALT_CLIPBOARD_MIME, JSON.stringify(fragment));
}
export function writeFragmentsToClipboard(clipboardData, fragments) {
    const normalized = fragments.map(normalizeClipboardFragment);
    clipboardData.setData("text/plain", normalized.map(fragment => fragment.text).join("\n"));
    clipboardData.setData(COBALT_NOTEBOOK_CLIPBOARD_MIME, JSON.stringify({ fragments: normalized }));
    if (normalized.length === 1) {
        clipboardData.setData(COBALT_CLIPBOARD_MIME, JSON.stringify(normalized[0]));
    }
}
export function readFragmentFromClipboard(clipboardData) {
    const serialized = clipboardData.getData(COBALT_CLIPBOARD_MIME);
    if (serialized) {
        const parsed = JSON.parse(serialized);
        return normalizeClipboardFragment(parsed);
    }
    return {
        text: clipboardData.getData("text/plain"),
        annotations: []
    };
}
export function readFragmentsFromClipboard(clipboardData) {
    const serialized = clipboardData.getData(COBALT_NOTEBOOK_CLIPBOARD_MIME);
    if (serialized) {
        const parsed = JSON.parse(serialized);
        if (Array.isArray(parsed.fragments)) {
            return parsed.fragments
                .map(fragment => normalizeClipboardFragment(fragment))
                .filter(fragment => fragment.text.length > 0);
        }
    }
    const fragment = readFragmentFromClipboard(clipboardData);
    return fragment.text.length > 0
        ? [fragment]
        : [];
}
export function getClipboardFragment(fragment, start, end) {
    return sliceFragment(fragment, start, end);
}
function normalizeClipboardFragment(fragment) {
    const text = typeof fragment.text === "string"
        ? fragment.text
        : "";
    const annotations = Array.isArray(fragment.annotations)
        ? fragment.annotations
            .filter(annotation => Array.isArray(annotation.range) &&
            annotation.range.length === 2 &&
            typeof annotation.range[0] === "number" &&
            typeof annotation.range[1] === "number" &&
            typeof annotation.tag === "string" &&
            typeof annotation.order === "number")
            .map(annotation => ({
            range: [
                Math.max(0, Math.min(text.length, annotation.range[0])),
                Math.max(0, Math.min(text.length, annotation.range[1]))
            ],
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
//# sourceMappingURL=clipboard.js.map