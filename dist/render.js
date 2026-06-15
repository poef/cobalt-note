import { generateRuns } from "./runs.js";
export function render(fragment) {
    return generateRuns(fragment)
        .map(run => renderRun(fragment.text.slice(run.start, run.end), run.state))
        .join("");
}
function renderRun(text, state) {
    let html = escapeHtml(text);
    if (state.strong) {
        html = `<strong>${html}</strong>`;
    }
    if (state.em) {
        html = `<em>${html}</em>`;
    }
    if (state.underline) {
        html = `<u>${html}</u>`;
    }
    if (state.link) {
        html = `<a href="${escapeAttribute(state.link)}">${html}</a>`;
    }
    return html;
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