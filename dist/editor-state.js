import { createAnnotationTag } from "./registry.js";
export function createEditorState() {
    return {
        pending: {
            strong: false,
            em: false,
            underline: false
        }
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
    return result;
}
export function clearPendingAnnotations(state) {
    for (const name of Object.keys(state.pending)) {
        state.pending[name] = false;
    }
}
//# sourceMappingURL=editor-state.js.map