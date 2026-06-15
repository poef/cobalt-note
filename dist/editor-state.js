import { createAnnotationTag, createLinkAnnotationTag } from "./registry.js";
export function createEditorState() {
    return {
        pending: {
            strong: false,
            em: false,
            underline: false
        },
        pendingLink: undefined
    };
}
export function buildPendingAnnotations(state, start, end) {
    const result = [];
    for (const name of Object.keys(state.pending)) {
        if (!state.pending[name]) {
            continue;
        }
        result.push({
            start,
            end,
            tag: createAnnotationTag(name, true)
        });
    }
    if (state.pendingLink !== undefined) {
        result.push({
            start,
            end,
            tag: state.pendingLink === null
                ? "</a>"
                : createLinkAnnotationTag(state.pendingLink)
        });
    }
    return result;
}
export function clearPendingAnnotations(state) {
    for (const name of Object.keys(state.pending)) {
        state.pending[name] = false;
    }
    state.pendingLink = undefined;
}
//# sourceMappingURL=editor-state.js.map