import { sliceFragment } from "./fragment.js";
export const COBALT_CLIPBOARD_MIME = "application/x-cobalt-fragment+json";
export function writeFragmentToClipboard(clipboardData, fragment) {
    clipboardData.setData("text/plain", fragment.text);
    clipboardData.setData(COBALT_CLIPBOARD_MIME, JSON.stringify(fragment));
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