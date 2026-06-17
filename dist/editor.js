import { applyCommands, AddAnnotationCommand, DeleteRangeCommand, InsertTextCommand } from "./commands.js";
import { createEditorState, buildPendingAnnotations, clearPendingAnnotations } from "./editor-state.js";
import { createAnnotationTag, createLinkAnnotationTag, defaultRegistry } from "./registry.js";
import { render } from "./render.js";
import { getEffectiveState, getTypingEffectiveState } from "./runs.js";
import { getCaretClientRect, getOffsetAtPoint, getSelectionRange, isOffsetOnFirstVisualLine, isOffsetOnLastVisualLine, setSelectionRange } from "./selection.js";
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
        getCaretClientRect(offset) {
            if (offset !== undefined) {
                return getCaretClientRect(element, offset);
            }
            const selection = getSelectionRange(element);
            if (!selection || selection.start !== selection.end) {
                return null;
            }
            return getCaretClientRect(element, selection.start);
        },
        isCaretOnFirstVisualLine() {
            const selection = getSelectionRange(element);
            if (!selection || selection.start !== selection.end) {
                return false;
            }
            return isOffsetOnFirstVisualLine(element, selection.start);
        },
        isCaretOnLastVisualLine() {
            const selection = getSelectionRange(element);
            if (!selection || selection.start !== selection.end) {
                return false;
            }
            return isOffsetOnLastVisualLine(element, selection.start, fragment.text.length);
        },
        focusNearestPoint(x, y) {
            const offset = getOffsetAtPoint(element, x, y);
            this.focus(offset, offset);
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
        const definition = defaultRegistry.findByShortcut(event);
        if (!definition) {
            return;
        }
        event.preventDefault();
        if (definition.name === "link") {
            addLink();
            return;
        }
        toggleAnnotation(definition);
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
    function toggleAnnotation(definition) {
        const selection = getSelectionRange(element);
        if (!selection) {
            return;
        }
        if (selection.start === selection.end) {
            const inheritedState = getTypingEffectiveState(fragment.annotations, selection.start);
            if (!definition.supportsPending) {
                return;
            }
            const inheritedEnabled = inheritedState[definition.name] !== undefined;
            const currentTypingEnabled = state.pending[definition.name] ?? inheritedEnabled;
            const nextTypingEnabled = !currentTypingEnabled;
            if (nextTypingEnabled === inheritedEnabled) {
                delete state.pending[definition.name];
            }
            else {
                state.pending[definition.name] = nextTypingEnabled;
            }
            rerender(selection.start, selection.end);
            return;
        }
        const currentState = getEffectiveState(fragment.annotations, selection.start);
        const tag = createAnnotationTag(definition.name, currentState[definition.name] === undefined);
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
//# sourceMappingURL=editor.js.map