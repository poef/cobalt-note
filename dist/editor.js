import { applyCommands, AddAnnotationCommand, DeleteRangeCommand, InsertTextCommand } from "./commands.js";
import { createEditorState, buildPendingAnnotations, clearPendingAnnotations } from "./editor-state.js";
import { createAnnotationTag } from "./registry.js";
import { render } from "./render.js";
import { getEffectiveState } from "./runs.js";
import { getSelectionRange, setSelectionRange } from "./selection.js";
export function edit(element, fragment) {
    const state = createEditorState();
    function rerender(start, end) {
        element.innerHTML = render(fragment);
        if (start !== undefined &&
            end !== undefined) {
            setSelectionRange(element, start, end);
        }
    }
    function handleKeyDown(event) {
        if (event.key === "Enter") {
            event.preventDefault();
            return;
        }
        if (!event.ctrlKey) {
            return;
        }
        const annotation = getShortcutAnnotation(event);
        if (!annotation) {
            return;
        }
        event.preventDefault();
        toggleAnnotation(annotation);
    }
    function handleBeforeInput(event) {
        const inputEvent = event;
        const selection = getSelectionRange(element);
        if (!selection) {
            return;
        }
        const commands = buildInputCommands(inputEvent, selection.start, selection.end);
        if (commands.length === 0) {
            return;
        }
        event.preventDefault();
        applyCommands(fragment, commands);
        const caret = getNextCaretPosition(inputEvent, selection.start, selection.end);
        rerender(caret, caret);
    }
    function toggleAnnotation(annotation) {
        const selection = getSelectionRange(element);
        if (!selection) {
            return;
        }
        if (selection.start === selection.end) {
            const currentState = getEffectiveState(fragment.annotations, selection.start);
            state.pending[annotation] = !currentState[annotation];
            rerender(selection.start, selection.end);
            return;
        }
        const currentState = getEffectiveState(fragment.annotations, selection.start);
        const tag = createAnnotationTag(annotation, !currentState[annotation]);
        applyCommands(fragment, [
            new AddAnnotationCommand([selection.start, selection.end], tag)
        ]);
        rerender(selection.start, selection.end);
    }
    function buildInputCommands(event, selectionStart, selectionEnd) {
        switch (event.inputType) {
            case "insertText":
            case "insertFromPaste":
                return buildInsertCommands(selectionStart, selectionEnd, event.data ?? "");
            case "deleteContentBackward":
                return buildDeleteBackwardCommands(selectionStart, selectionEnd);
            case "deleteContentForward":
                return buildDeleteForwardCommands(selectionStart, selectionEnd);
            default:
                return [];
        }
    }
    function buildInsertCommands(selectionStart, selectionEnd, text) {
        const commands = [];
        if (selectionStart !== selectionEnd) {
            commands.push(new DeleteRangeCommand(selectionStart, selectionEnd));
        }
        if (text.length === 0) {
            return commands;
        }
        commands.push(new InsertTextCommand(selectionStart, text));
        const pendingAnnotations = buildPendingAnnotations(state, selectionStart, selectionStart + text.length);
        for (const pending of pendingAnnotations) {
            commands.push(new AddAnnotationCommand([pending.start, pending.end], pending.tag));
        }
        if (pendingAnnotations.length > 0) {
            clearPendingAnnotations(state);
        }
        return commands;
    }
    function buildDeleteBackwardCommands(selectionStart, selectionEnd) {
        if (selectionStart !== selectionEnd) {
            return [
                new DeleteRangeCommand(selectionStart, selectionEnd)
            ];
        }
        if (selectionStart === 0) {
            return [];
        }
        return [
            new DeleteRangeCommand(selectionStart - 1, selectionStart)
        ];
    }
    function buildDeleteForwardCommands(selectionStart, selectionEnd) {
        if (selectionStart !== selectionEnd) {
            return [
                new DeleteRangeCommand(selectionStart, selectionEnd)
            ];
        }
        if (selectionStart >= fragment.text.length) {
            return [];
        }
        return [
            new DeleteRangeCommand(selectionStart, selectionStart + 1)
        ];
    }
    function getNextCaretPosition(event, selectionStart, selectionEnd) {
        switch (event.inputType) {
            case "insertText":
            case "insertFromPaste":
                return selectionStart + (event.data?.length ?? 0);
            case "deleteContentBackward":
                return selectionStart === selectionEnd
                    ? Math.max(0, selectionStart - 1)
                    : selectionStart;
            case "deleteContentForward":
                return selectionStart;
            default:
                return selectionStart;
        }
    }
    element.contentEditable = "true";
    rerender();
    element.addEventListener("keydown", handleKeyDown);
    element.addEventListener("beforeinput", handleBeforeInput);
    return {
        element,
        fragment,
        state,
        destroy() {
            element.removeEventListener("keydown", handleKeyDown);
            element.removeEventListener("beforeinput", handleBeforeInput);
            element.removeAttribute("contenteditable");
        }
    };
}
function getShortcutAnnotation(event) {
    switch (event.key.toLowerCase()) {
        case "b":
            return "strong";
        case "i":
            return "em";
        case "u":
            return "underline";
        default:
            return null;
    }
}
//# sourceMappingURL=editor.js.map