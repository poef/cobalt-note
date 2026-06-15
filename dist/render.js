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
    return html;
}
function getRenderTags(state) {
    const tags = [];
    if (state.link) {
        tags.push({
            key: `link:${state.link}`,
            open: `<a href="${escapeAttribute(state.link)}">`,
            close: "</a>"
        });
    }
    if (state.underline) {
        tags.push({
            key: "underline",
            open: "<u>",
            close: "</u>"
        });
    }
    if (state.em) {
        tags.push({
            key: "em",
            open: "<em>",
            close: "</em>"
        });
    }
    if (state.strong) {
        tags.push({
            key: "strong",
            open: "<strong>",
            close: "</strong>"
        });
    }
    return tags;
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
function escapeAttribute(value) {
    return escapeHtml(value).replace(/"/g, "&quot;");
}
//# sourceMappingURL=render.js.map