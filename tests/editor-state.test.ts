import {
    buildPendingAnnotations,
    clearPendingAnnotations,
    createEditorState
} from "../src/editor-state.js";

describe("editor pending annotation state", () => {
    test("pending annotations build one-shot enable and disable annotation ranges", () => {
        const state = createEditorState();

        state.pending.strong = true;
        state.pending.em = false;

        expect(buildPendingAnnotations(state, 4, 5)).toEqual([
            { start: 4, end: 5, tag: "<strong>" },
            { start: 4, end: 5, tag: "</em>" }
        ]);
    });

    test("pending annotations can be cleared", () => {
        const state = createEditorState();

        state.pending.strong = true;
        state.pending.em = false;
        clearPendingAnnotations(state);

        expect(state.pending).toEqual({});
    });
});
