import { applyCommands, Command, AddAnnotationCommand, DeleteRangeCommand, InsertFragmentCommand, InsertTextCommand } from "./commands.js";
import { createEditorState, EditorState, buildPendingAnnotations, clearPendingAnnotations } from "./editor-state.js";
import { Annotation, Fragment } from "./fragment.js";
import { getClipboardFragment, readFragmentFromClipboard, writeFragmentToClipboard } from "./clipboard.js";
import { AnnotationDefinition, createAnnotationTag, createLinkAnnotationTag, defaultRegistry } from "./registry.js";
import { render } from "./render.js";
import { getEffectiveState, getTypingEffectiveState } from "./runs.js";
import {
    getCaretClientRect,
    getOffsetAtPoint,
    getParagraphRangeAtPoint,
    getSelectionRange,
    getWordRangeAtPoint,
    isOffsetOnFirstVisualLine,
    isOffsetOnLastVisualLine,
    setSelectionRange
} from "@cobalt/note-core";

export interface Editor {
    element: HTMLElement;
    fragment: Fragment;
    state: EditorState;
    focus(start?: number, end?: number): void;
    getSelection(): ReturnType<typeof getSelectionRange>;
    getCaretClientRect(offset?: number): DOMRect | null;
    isCaretOnFirstVisualLine(): boolean;
    isCaretOnLastVisualLine(): boolean;
    focusNearestPoint(x: number, y: number): void;
    getOffsetAtPoint(x: number, y: number): number;
    getWordRangeAtPoint(x: number, y: number): NonNullable<ReturnType<typeof getSelectionRange>>;
    getParagraphRangeAtPoint(x: number, y: number): NonNullable<ReturnType<typeof getSelectionRange>>;
    getClientRect(): DOMRect;
    showSelectionRanges(ranges: ReturnType<typeof getSelectionRange>[], active?: boolean): void;
    clearSelectionRanges(): void;
    destroy(): void;
}

function renderDecoratedFragment(
    fragment: Fragment,
    ranges: ReturnType<typeof getSelectionRange>[],
    active = true
): string {
    if (ranges.length === 0) {
        return render(fragment);
    }

    const maxOrder = fragment.annotations.reduce(
        (max, annotation) => Math.max(max, annotation.order),
        0
    );

    const annotations: Annotation[] = [
        ...fragment.annotations,
        ...ranges
            .filter((range): range is NonNullable<typeof range> =>
                range !== null && range.end > range.start
            )
            .map((range, index) => ({
                range: [range.start, range.end] as [number, number],
                tag: active
                    ? '<span data-cobalt-selection="true" data-cobalt-selection-active="true">'
                    : '<span data-cobalt-selection="true" data-cobalt-selection-active="false">',
                order: maxOrder + index + 1
            }))
    ];

    return render({
        text: fragment.text,
        annotations
    });
}

export function edit(
    element: HTMLElement,
    fragment: Fragment
): Editor {
    const state = createEditorState();
    let selectionDecorationRanges: ReturnType<typeof getSelectionRange>[] = [];
    let selectionDecorationActive = true;

    function rerender(
        start?: number,
        end?: number
    ): void {
        element.innerHTML = renderDecoratedFragment(
            fragment,
            selectionDecorationRanges,
            selectionDecorationActive
        );

        if (
            start !== undefined &&
            end !== undefined
        ) {
            setSelectionRange(element, start, end);
        }
    }

    const editor: Editor = {
        element,
        fragment,
        state,
        focus(start = 0, end = start): void {
            element.focus();
            setSelectionRange(element, start, end);
        },
        getSelection() {
            return getSelectionRange(element);
        },
        getCaretClientRect(offset?: number): DOMRect | null {
            if (offset !== undefined) {
                return getCaretClientRect(element, offset);
            }

            const selection = getSelectionRange(element);

            if (!selection || selection.start !== selection.end) {
                return null;
            }

            return getCaretClientRect(element, selection.start);
        },
        isCaretOnFirstVisualLine(): boolean {
            const selection = getSelectionRange(element);

            if (!selection || selection.start !== selection.end) {
                return false;
            }

            return isOffsetOnFirstVisualLine(element, selection.start);
        },
        isCaretOnLastVisualLine(): boolean {
            const selection = getSelectionRange(element);

            if (!selection || selection.start !== selection.end) {
                return false;
            }

            return isOffsetOnLastVisualLine(
                element,
                selection.start,
                fragment.text.length
            );
        },
        focusNearestPoint(x: number, y: number): void {
            const offset = getOffsetAtPoint(element, x, y);

            this.focus(offset, offset);
        },
        getOffsetAtPoint(x: number, y: number): number {
            return getOffsetAtPoint(element, x, y);
        },
        getWordRangeAtPoint(x: number, y: number) {
            return getWordRangeAtPoint(element, x, y);
        },
        getParagraphRangeAtPoint(x: number, y: number) {
            return getParagraphRangeAtPoint(element, x, y);
        },
        getClientRect(): DOMRect {
            return element.getBoundingClientRect();
        },
        showSelectionRanges(ranges, active = true): void {
            selectionDecorationActive = active;
            selectionDecorationRanges = ranges.filter((range): range is NonNullable<typeof range> =>
                range !== null && range.end > range.start
            );

            const selection = getSelectionRange(element);
            rerender(selection?.start, selection?.end);
        },
        clearSelectionRanges(): void {
            if (selectionDecorationRanges.length === 0) {
                return;
            }

            selectionDecorationRanges = [];
            const selection = getSelectionRange(element);
            rerender(selection?.start, selection?.end);
        },
        destroy(): void {
            element.removeEventListener("keydown", handleKeyDown);
            element.removeEventListener("beforeinput", handleBeforeInput);
            element.removeEventListener("copy", handleCopy);
            element.removeEventListener("cut", handleCut);
            element.removeEventListener("paste", handlePaste);
            element.removeAttribute("contenteditable");
        }
    };

    function handleKeyDown(event: KeyboardEvent): void {
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

    function handleBeforeInput(event: Event): void {
        const inputEvent = event as InputEvent;
        const selection = getSelectionRange(element);

        if (!selection) {
            return;
        }

        const commands = buildInputCommands(
            inputEvent,
            selection.start,
            selection.end
        );

        if (commands.length === 0) {
            return;
        }

        event.preventDefault();

        applyCommands(fragment, commands);

        const caret = getNextCaretPosition(
            inputEvent,
            selection.start,
            selection.end
        );

        rerender(caret, caret);
    }



    function handleCopy(event: ClipboardEvent): void {
        const selection = getSelectionRange(element);

        if (!selection || selection.start === selection.end || !event.clipboardData) {
            return;
        }

        event.preventDefault();

        writeFragmentToClipboard(
            event.clipboardData,
            getClipboardFragment(
                fragment,
                selection.start,
                selection.end
            )
        );
    }

    function handleCut(event: ClipboardEvent): void {
        const selection = getSelectionRange(element);

        if (!selection || selection.start === selection.end || !event.clipboardData) {
            return;
        }

        event.preventDefault();

        writeFragmentToClipboard(
            event.clipboardData,
            getClipboardFragment(
                fragment,
                selection.start,
                selection.end
            )
        );

        applyCommands(fragment, [
            new DeleteRangeCommand(
                selection.start,
                selection.end
            )
        ]);

        rerender(selection.start, selection.start);
    }

    function handlePaste(event: ClipboardEvent): void {
        const selection = getSelectionRange(element);

        if (!selection || !event.clipboardData) {
            return;
        }

        event.preventDefault();

        const pastedFragment = readFragmentFromClipboard(event.clipboardData);
        const commands: Command[] = [];

        if (selection.start !== selection.end) {
            commands.push(
                new DeleteRangeCommand(
                    selection.start,
                    selection.end
                )
            );
        }

        commands.push(
            new InsertFragmentCommand(
                selection.start,
                pastedFragment
            )
        );

        applyCommands(fragment, commands);

        const caret = selection.start + pastedFragment.text.length;
        rerender(caret, caret);
    }

    function toggleAnnotation(
        definition: AnnotationDefinition
    ): void {
        const selection = getSelectionRange(element);

        if (!selection) {
            return;
        }

        if (selection.start === selection.end) {
            const inheritedState = getTypingEffectiveState(
                fragment.annotations,
                selection.start
            );

            if (!definition.supportsPending) {
                return;
            }

            const inheritedEnabled = inheritedState[definition.name] !== undefined;
            const currentTypingEnabled = state.pending[definition.name] ?? inheritedEnabled;
            const nextTypingEnabled = !currentTypingEnabled;

            if (nextTypingEnabled === inheritedEnabled) {
                delete state.pending[definition.name];
            } else {
                state.pending[definition.name] = nextTypingEnabled;
            }

            rerender(selection.start, selection.end);
            return;
        }

        const currentState = getEffectiveState(
            fragment.annotations,
            selection.start
        );

        const tag = createAnnotationTag(
            definition.name,
            currentState[definition.name] === undefined
        );

        applyCommands(fragment, [
            new AddAnnotationCommand(
                [selection.start, selection.end],
                tag
            )
        ]);

        rerender(selection.start, selection.end);
    }

    function insertNewline(): void {
        const selection = getSelectionRange(element);

        if (!selection) {
            return;
        }

        const commands: Command[] = [];

        if (selection.start !== selection.end) {
            commands.push(
                new DeleteRangeCommand(
                    selection.start,
                    selection.end
                )
            );
        }

        commands.push(
            new InsertTextCommand(
                selection.start,
                "\n",
                { growAtEnd: false }
            )
        );

        applyCommands(fragment, commands);

        const caret = selection.start + 1;

        rerender(caret, caret);
    }

    function addLink(): void {
        const selection = getSelectionRange(element);

        if (!selection || selection.start === selection.end) {
            return;
        }

        const href = promptForHref();

        if (!href) {
            return;
        }

        applyCommands(fragment, [
            new AddAnnotationCommand(
                [selection.start, selection.end],
                createLinkAnnotationTag(href)
            )
        ]);

        rerender(selection.start, selection.end);
    }

    function promptForHref(): string | null {
        const href = window.prompt("Enter URL");

        if (href === null) {
            return null;
        }

        const trimmed = href.trim();

        return trimmed.length > 0
            ? trimmed
            : null;
    }

    function buildInputCommands(
        event: InputEvent,
        selectionStart: number,
        selectionEnd: number
    ): Command[] {
        switch (event.inputType) {
            case "insertText":
            case "insertFromPaste":
                return buildInsertCommands(
                    selectionStart,
                    selectionEnd,
                    event.data ?? ""
                );

            case "deleteContentBackward":
                return buildDeleteBackwardCommands(
                    selectionStart,
                    selectionEnd
                );

            case "deleteContentForward":
                return buildDeleteForwardCommands(
                    selectionStart,
                    selectionEnd
                );

            case "insertParagraph":
            case "insertLineBreak": {
                const commands: Command[] = [];

                if (selectionStart !== selectionEnd) {
                    commands.push(
                        new DeleteRangeCommand(
                            selectionStart,
                            selectionEnd
                        )
                    );
                }

                commands.push(
                    new InsertTextCommand(
                        selectionStart,
                        "\n",
                        { growAtEnd: false }
                    )
                );

                return commands;
            }

            default:
                return [];
        }
    }

    function buildInsertCommands(
        selectionStart: number,
        selectionEnd: number,
        text: string
    ): Command[] {
        const commands: Command[] = [];

        if (selectionStart !== selectionEnd) {
            commands.push(
                new DeleteRangeCommand(
                    selectionStart,
                    selectionEnd
                )
            );
        }

        if (text.length === 0) {
            return commands;
        }

        commands.push(
            new InsertTextCommand(
                selectionStart,
                text
            )
        );

        const pendingAnnotations = buildPendingAnnotations(
            state,
            selectionStart,
            selectionStart + text.length
        );

        for (const pending of pendingAnnotations) {
            commands.push(
                new AddAnnotationCommand(
                    [pending.start, pending.end],
                    pending.tag
                )
            );
        }

        if (pendingAnnotations.length > 0) {
            clearPendingAnnotations(state);
        }

        return commands;
    }

    function buildDeleteBackwardCommands(
        selectionStart: number,
        selectionEnd: number
    ): Command[] {
        if (selectionStart !== selectionEnd) {
            return [
                new DeleteRangeCommand(
                    selectionStart,
                    selectionEnd
                )
            ];
        }

        if (selectionStart === 0) {
            return [];
        }

        return [
            new DeleteRangeCommand(
                selectionStart - 1,
                selectionStart
            )
        ];
    }

    function buildDeleteForwardCommands(
        selectionStart: number,
        selectionEnd: number
    ): Command[] {
        if (selectionStart !== selectionEnd) {
            return [
                new DeleteRangeCommand(
                    selectionStart,
                    selectionEnd
                )
            ];
        }

        if (selectionStart >= fragment.text.length) {
            return [];
        }

        return [
            new DeleteRangeCommand(
                selectionStart,
                selectionStart + 1
            )
        ];
    }

    function getNextCaretPosition(
        event: InputEvent,
        selectionStart: number,
        selectionEnd: number
    ): number {
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
    element.addEventListener("copy", handleCopy);
    element.addEventListener("cut", handleCut);
    element.addEventListener("paste", handlePaste);

    return editor;
}

