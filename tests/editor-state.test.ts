import {
    buildPendingAnnotations,
    clearPendingAnnotations,
    createEditorState
} from "../src/editor-state.js";
import { AnnotationRegistry } from "../src/registry.js";

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

test("pending annotations use registry definitions generically", () => {
    const registry = new AnnotationRegistry();
    registry.register({
        name: "highlight",
        tag: "<mark>",
        supportsPending: true
    });

    const state = createEditorState();

    state.pending.highlight = true;

    expect(buildPendingAnnotations(state, 1, 4, registry)).toEqual([
        { start: 1, end: 4, tag: "<mark>" }
    ]);
});
