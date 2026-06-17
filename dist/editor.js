import { applyCommands, AddAnnotationCommand, DeleteRangeCommand, InsertTextCommand } from "./commands.js";
import { createEditorState, buildPendingAnnotations, clearPendingAnnotations } from "./editor-state.js";
import { createAnnotationTag, createLinkAnnotationTag } from "./registry.js";
import { render } from "./render.js";
import { getEffectiveState } from "./runs.js";
import { getSelectionRange, setSelectionRange } from "./selection.js";
export const COBALT_JOIN_REQUEST_EVENT = "cobalt:joinrequest";
export function edit(element, fragment) {
    const state = createEditorState();
    function rerender(start, end) {
        element.innerHTML = render(fragment);
        if (start !== undefined &&
            end !== undefined) {
            setSelectionRange(element, start, end);
        }
    }
    const editor = {
        element,
        fragment,
        state,
        focus(start = 0, end = start) {
            element.focus();
            setSelectionRange(element, start, end);
        },
        getSelection() {
            return getSelectionRange(element);
        },
        destroy() {
            element.removeEventListener("keydown", handleKeyDown);
            element.removeEventListener("beforeinput", handleBeforeInput);
            element.removeAttribute("contenteditable");
        }
    };
    function handleKeyDown(event) {
        if (event.key === "Enter") {
            if (event.ctrlKey || event.metaKey || event.altKey) {
                return;
            }
            event.preventDefault();
            insertNewline();
            return;
        }
        if (!event.ctrlKey) {
            return;
        }
        if (event.key.toLowerCase() === "k") {
            event.preventDefault();
            addLink();
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
        if (requestNotebookJoin(inputEvent, selection)) {
            event.preventDefault();
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
    function requestNotebookJoin(event, selection) {
        if (selection.start !== selection.end) {
            return false;
        }
        let direction = null;
        if (event.inputType === "deleteContentBackward" &&
            selection.start === 0) {
            direction = "backward";
        }
        if (event.inputType === "deleteContentForward" &&
            selection.start === fragment.text.length) {
            direction = "forward";
        }
        if (!direction) {
            return false;
        }
        const joinEvent = new CustomEvent(COBALT_JOIN_REQUEST_EVENT, {
            bubbles: true,
            cancelable: true,
            detail: {
                direction,
                editor,
                selection
            }
        });
        return !element.dispatchEvent(joinEvent);
    }
    function toggleAnnotation(annotation) {
        const selection = getSelectionRange(element);
        if (!selection) {
            return;
        }
        if (selection.start === selection.end) {
            const currentState = getEffectiveState(fragment.annotations, selection.start);
            state.pending[annotation] = currentState[annotation] === undefined;
            rerender(selection.start, selection.end);
            return;
        }
        const currentState = getEffectiveState(fragment.annotations, selection.start);
        const tag = createAnnotationTag(annotation, currentState[annotation] === undefined);
        applyCommands(fragment, [
            new AddAnnotationCommand([selection.start, selection.end], tag)
        ]);
        rerender(selection.start, selection.end);
    }
    function insertNewline() {
        const selection = getSelectionRange(element);
        if (!selection) {
            return;
        }
        const commands = [];
        if (selection.start !== selection.end) {
            commands.push(new DeleteRangeCommand(selection.start, selection.end));
        }
        commands.push(new InsertTextCommand(selection.start, "\n", { growAtEnd: false }));
        applyCommands(fragment, commands);
        const caret = selection.start + 1;
        rerender(caret, caret);
    }
    function addLink() {
        const selection = getSelectionRange(element);
        if (!selection || selection.start === selection.end) {
            return;
        }
        const href = promptForHref();
        if (!href) {
            return;
        }
        applyCommands(fragment, [
            new AddAnnotationCommand([selection.start, selection.end], createLinkAnnotationTag(href))
        ]);
        rerender(selection.start, selection.end);
    }
    function promptForHref() {
        const href = window.prompt("Enter URL");
        if (href === null) {
            return null;
        }
        const trimmed = href.trim();
        return trimmed.length > 0
            ? trimmed
            : null;
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
            case "insertParagraph":
            case "insertLineBreak": {
                const commands = [];
                if (selectionStart !== selectionEnd) {
                    commands.push(new DeleteRangeCommand(selectionStart, selectionEnd));
                }
                commands.push(new InsertTextCommand(selectionStart, "\n", { growAtEnd: false }));
                return commands;
            }
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
            case "insertParagraph":
            case "insertLineBreak":
                return selectionStart + 1;
            default:
                return selectionStart;
        }
    }
    element.contentEditable = "true";
    rerender();
    element.addEventListener("keydown", handleKeyDown);
    element.addEventListener("beforeinput", handleBeforeInput);
    return editor;
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