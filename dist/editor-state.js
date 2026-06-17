import { createAnnotationTag, defaultRegistry } from "./registry.js";
export function createEditorState() {
    return {
        pending: {}
    };
}
export function buildPendingAnnotations(state, start, end, registry = defaultRegistry) {
    const result = [];
    for (const name of Object.keys(state.pending)) {
        const enabled = state.pending[name];
        if (enabled === undefined) {
            continue;
        }
        result.push({
            start,
            end,
            tag: createAnnotationTag(name, enabled, registry)
        });
    }
    return result;
}
export function clearPendingAnnotations(state) {
    for (const name of Object.keys(state.pending)) {
        delete state.pending[name];
    }
}
//# sourceMappingURL=editor-state.js.map