import { createHtmlCloseTag } from "./registry.js";
import { generateRuns } from "./runs.js";
export function render(fragment) {
    const runs = generateRuns(fragment);
    let html = "";
    let openTags = [];
    for (const run of runs) {
        const nextTags = getRenderTags(run.state);
        const sharedPrefixLength = getSharedPrefixLength(openTags, nextTags);
        for (let i = openTags.length - 1; i >= sharedPrefixLength; i--) {
            html += openTags[i].close;
        }
        for (let i = sharedPrefixLength; i < nextTags.length; i++) {
            html += nextTags[i].open;
        }
        html += escapeHtml(fragment.text.slice(run.start, run.end));
        openTags = nextTags;
    }
    for (let i = openTags.length - 1; i >= 0; i--) {
        html += openTags[i].close;
    }
    return appendTrailingNewlineSentinel(fragment, html);
}
function appendTrailingNewlineSentinel(fragment, html) {
    if (!fragment.text.endsWith("\n")) {
        return html;
    }
    return `${html}<span data-cobalt-sentinel="true">\u200B</span>`;
}
function getRenderTags(state) {
    return Object
        .values(state)
        .sort(compareActiveAnnotations)
        .map(annotation => ({
        key: `${annotation.name}:${annotation.tag}`,
        open: annotation.tag,
        close: createHtmlCloseTag(annotation.tag)
    }));
}
function compareActiveAnnotations(a, b) {
    if (a.priority !== b.priority) {
        return a.priority - b.priority;
    }
    return a.name.localeCompare(b.name);
}
function getSharedPrefixLength(current, next) {
    const length = Math.min(current.length, next.length);
    for (let i = 0; i < length; i++) {
        if (current[i].key !== next[i].key) {
            return i;
        }
    }
    return length;
}
function escapeHtml(text) {
    return text
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;");
}
//# sourceMappingURL=render.js.map