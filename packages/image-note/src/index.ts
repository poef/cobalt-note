import type {
    LocalSelectionRange,
    NotebookNoteAdapter,
    NotebookNoteFragment,
    NotebookNoteMergeResult
} from "@cobalt/notebook";
import {
    edit,
    RICH_TEXT_NOTE_FRAGMENT_TYPE,
    type Fragment,
    type Editor as RichTextEditor
} from "@cobalt/rich-text-note";

export const IMAGE_NOTE_FRAGMENT_TYPE = "image";

export interface ImageNoteValue {
    src: string;
    alt?: string;
    caption?: string | Fragment;
}

export interface NormalizedImageNoteValue {
    src: string;
    alt?: string;
    caption: Fragment;
}

export interface ImageNoteFragment {
    type: typeof IMAGE_NOTE_FRAGMENT_TYPE;
    data: NormalizedImageNoteValue;
}

export interface ImageNoteEditor extends NotebookNoteAdapter {
    element: HTMLElement;
    destroy(): void;
}

export interface ImageNoteOptions {
    className?: string;
}

export function editImageNote(
    element: HTMLElement,
    value: ImageNoteValue,
    options: ImageNoteOptions = {}
): ImageNoteEditor {
    if (!isImageNoteValue(value)) {
        throw new Error("Expected an image note value.");
    }

    const captionFragment = normalizeCaption(value.caption);
    value.caption = captionFragment;

    element.className = options.className ?? "cobalt-image-note";
    element.tabIndex = 0;
    element.setAttribute("role", "figure");

    const image = document.createElement("img");
    image.className = "cobalt-image-note__image";

    const captionElement = document.createElement("figcaption");
    captionElement.className = "cobalt-image-note__caption";
    captionElement.setAttribute("aria-label", "Image caption");

    element.textContent = "";
    element.append(image, captionElement);

    const captionEditor = edit(captionElement, captionFragment);

    let selection: LocalSelectionRange = { start: 0, end: 0 };
    let imageSelected = false;

    function syncStaticDom(): void {
        image.src = value.src;
        image.alt = value.alt ?? "";
        element.setAttribute("aria-label", value.alt || getCaptionText() || "Image note");
    }

    function getCaptionText(): string {
        return captionFragment.text;
    }

    function getLength(): number {
        return 1 + captionEditor.getLength();
    }

    function clampOffset(offset: number): number {
        return Math.max(0, Math.min(getLength(), offset));
    }

    function isCaptionOffset(offset: number): boolean {
        return offset > 1 || (offset === 1 && document.activeElement === captionElement);
    }

    function setImageSelection(start: number, end = start): void {
        selection = {
            start: clampOffset(start),
            end: clampOffset(end)
        };
    }

    function focusImageOffset(offset: number): void {
        element.focus();
        setImageSelection(offset, offset);
    }

    function getImageRect(): DOMRect {
        const rect = image.getBoundingClientRect();
        if (rect.width || rect.height) {
            return rect;
        }

        return element.getBoundingClientRect();
    }

    function getCaptionRect(): DOMRect {
        const rect = captionElement.getBoundingClientRect();
        if (rect.width || rect.height) {
            return rect;
        }

        const imageRect = getImageRect();
        return new DOMRect(imageRect.left, imageRect.bottom, imageRect.width, 1);
    }

    function updateImageSelectionClass(active = true): void {
        element.toggleAttribute("data-cobalt-image-selected", imageSelected);
        if (imageSelected) {
            element.toggleAttribute("data-cobalt-selection-active", active);
        } else {
            element.removeAttribute("data-cobalt-selection-active");
        }
    }

    function getCaptionRange(range: LocalSelectionRange): LocalSelectionRange | null {
        const start = Math.max(1, range.start);
        const end = Math.min(getLength(), range.end);

        if (end <= start) {
            return null;
        }

        return {
            start: start - 1,
            end: end - 1
        };
    }

    const editor: ImageNoteEditor = {
        element,
        getType(): typeof IMAGE_NOTE_FRAGMENT_TYPE {
            return IMAGE_NOTE_FRAGMENT_TYPE;
        },
        getValue(): NormalizedImageNoteValue {
            return cloneImageNoteValue({
                src: value.src,
                alt: value.alt,
                caption: captionFragment
            });
        },
        setValue(nextValue: unknown): void {
            if (!isImageNoteValue(nextValue)) {
                throw new Error("Expected an image note value.");
            }

            value.src = nextValue.src;
            value.alt = nextValue.alt;
            const nextCaption = normalizeCaption(nextValue.caption);
            replaceCaptionFragment(captionFragment, nextCaption);
            value.caption = captionFragment;
            captionEditor.setValue(captionFragment);
            syncStaticDom();
        },
        getLength,
        getText(start = 0, end = getLength()): string {
            const normalizedStart = clampOffset(start);
            const normalizedEnd = clampOffset(end);
            const parts: string[] = [];

            if (normalizedStart < 1 && normalizedEnd > 0) {
                parts.push(value.alt ?? "");
            }

            if (normalizedEnd > 1) {
                parts.push(captionEditor.getText(
                    Math.max(0, normalizedStart - 1),
                    normalizedEnd - 1
                ));
            }

            return parts.filter(Boolean).join("\n");
        },
        focus(start = 0, end = start): void {
            const normalizedStart = clampOffset(start);
            const normalizedEnd = clampOffset(end);

            if (normalizedStart > 1 || normalizedEnd > 1) {
                captionEditor.focus(
                    Math.max(0, normalizedStart - 1),
                    Math.max(0, normalizedEnd - 1)
                );
                selection = { start: normalizedStart, end: normalizedEnd };
                return;
            }

            focusImageOffset(normalizedEnd);
        },
        getSelection(): LocalSelectionRange | null {
            if (document.activeElement === captionElement || captionElement.contains(document.activeElement)) {
                const captionSelection = captionEditor.getSelection();

                if (captionSelection) {
                    return {
                        start: captionSelection.start + 1,
                        end: captionSelection.end + 1
                    };
                }
            }

            return { ...selection };
        },
        getCaretClientRect(offset?: number): DOMRect | null {
            const requestedOffset = offset ?? editor.getSelection()?.end ?? 0;
            const normalizedOffset = clampOffset(requestedOffset);

            if (normalizedOffset > 1 || isCaptionOffset(normalizedOffset)) {
                return captionEditor.getCaretClientRect(Math.max(0, normalizedOffset - 1));
            }

            const rect = getImageRect();
            const x = normalizedOffset === 0 ? rect.left : rect.right;

            return new DOMRect(x, rect.top, 1, rect.height || 1);
        },
        isCaretOnFirstVisualLine(): boolean {
            const current = this.getSelection();
            return !current || current.start <= 1;
        },
        isCaretOnLastVisualLine(): boolean {
            const current = this.getSelection();

            if (!current || current.start <= 1) {
                return false;
            }

            return captionEditor.isCaretOnLastVisualLine();
        },
        focusNearestPoint(x: number, y: number): void {
            const captionRect = getCaptionRect();

            if (y >= captionRect.top) {
                captionEditor.focusNearestPoint(x, y);
                const captionSelection = captionEditor.getSelection();
                if (captionSelection) {
                    selection = {
                        start: captionSelection.start + 1,
                        end: captionSelection.end + 1
                    };
                }
                return;
            }

            const imageRect = getImageRect();
            this.focus(x < imageRect.left + imageRect.width / 2 ? 0 : 1);
        },
        getOffsetAtPoint(x: number, y: number): number {
            const captionRect = getCaptionRect();

            if (y >= captionRect.top) {
                return captionEditor.getOffsetAtPoint(x, y) + 1;
            }

            const rect = getImageRect();
            return x < rect.left + rect.width / 2 ? 0 : 1;
        },
        getClientRect(): DOMRect {
            return element.getBoundingClientRect();
        },
        showSelectionRanges(ranges: LocalSelectionRange[], active = true): void {
            imageSelected = ranges.some(range => range.start <= 0 && range.end >= 1);
            const captionRanges = ranges
                .map(getCaptionRange)
                .filter((range): range is LocalSelectionRange => range !== null);

            if (captionRanges.length > 0) {
                captionEditor.showSelectionRanges(captionRanges, active);
            } else {
                captionEditor.clearSelectionRanges();
            }

            updateImageSelectionClass(active);
        },
        clearSelectionRanges(): void {
            imageSelected = false;
            captionEditor.clearSelectionRanges();
            updateImageSelectionClass();
        },
        deleteRange(start: number, end: number): void {
            const captionRange = getCaptionRange({ start, end });

            if (captionRange) {
                captionEditor.deleteRange(captionRange.start, captionRange.end);
                syncStaticDom();
            }
        },
        insertText(offset: number, text: string): void {
            if (offset >= 1) {
                captionEditor.insertText(offset - 1, text);
                syncStaticDom();
            }
        },
        sliceFragment(start: number, end: number): NotebookNoteFragment {
            const normalizedStart = clampOffset(start);
            const normalizedEnd = clampOffset(end);

            if (normalizedStart >= 1) {
                return captionEditor.sliceFragment(normalizedStart - 1, normalizedEnd - 1);
            }

            const captionRange = getCaptionRange({ start: normalizedStart, end: normalizedEnd });
            const caption = captionRange
                ? captionEditor.sliceFragment(captionRange.start, captionRange.end).data as Fragment
                : { text: "", annotations: [] };

            return wrapImageNoteValue({
                src: value.src,
                alt: value.alt,
                caption
            });
        },
        canInsertFragment(fragment: NotebookNoteFragment): boolean {
            return fragment.type === RICH_TEXT_NOTE_FRAGMENT_TYPE;
        },
        insertFragment(offset: number, fragment: NotebookNoteFragment): number {
            if (fragment.type !== RICH_TEXT_NOTE_FRAGMENT_TYPE || offset < 1) {
                return clampOffset(offset);
            }

            const nextOffset = captionEditor.insertFragment(offset - 1, fragment) + 1;
            syncStaticDom();
            return nextOffset;
        },
        canSplit(): boolean {
            return false;
        },
        splitFragment(): { before: ImageNoteFragment; after: ImageNoteFragment } {
            const fragment = wrapImageNoteValue({
                src: value.src,
                alt: value.alt,
                caption: captionFragment
            });
            return { before: fragment, after: fragment };
        },
        canMergeFragment(): boolean {
            return false;
        },
        mergeFragment(): NotebookNoteMergeResult | null {
            return null;
        },
        canApplyCommand(command: string, range: LocalSelectionRange, nextValue?: unknown): boolean {
            if (command === "set-alt") {
                return range.start <= 0 && range.end >= 1;
            }

            if (command === "set-caption") {
                return typeof nextValue === "string";
            }

            if (range.start >= 1 && captionEditor.canApplyCommand) {
                return captionEditor.canApplyCommand(command, {
                    start: range.start - 1,
                    end: range.end - 1
                }, nextValue);
            }

            return false;
        },
        getCommandState(command: string, offset: number): unknown {
            if (command === "set-alt") {
                return value.alt;
            }

            if (command === "set-caption") {
                return captionFragment.text;
            }

            if (offset >= 1) {
                return captionEditor.getCommandState(command, offset - 1);
            }

            return undefined;
        },
        applyCommand(command: string, range: LocalSelectionRange, nextValue?: unknown): boolean {
            if (command === "set-alt") {
                value.alt = typeof nextValue === "string" ? nextValue : "";
                syncStaticDom();
                return true;
            }

            if (command === "set-caption") {
                replaceCaptionFragment(captionFragment, {
                    text: typeof nextValue === "string" ? nextValue : "",
                    annotations: []
                });
                captionEditor.setValue(captionFragment);
                syncStaticDom();
                return true;
            }

            if (range.start >= 1) {
                const applied = captionEditor.applyCommand(command, {
                    start: range.start - 1,
                    end: range.end - 1
                }, nextValue);
                syncStaticDom();
                return applied;
            }

            return false;
        },
        destroy(): void {
            captionEditor.destroy();
            element.textContent = "";
            element.classList.remove("cobalt-image-note");
            element.removeAttribute("data-cobalt-image-selected");
            element.removeAttribute("data-cobalt-selection-active");
        }
    };

    element.addEventListener("keydown", event => {
        const current = editor.getSelection();

        if (!current || current.start !== current.end || document.activeElement === captionElement) {
            return;
        }

        if (event.key === "ArrowLeft" && current.start > 0) {
            event.preventDefault();
            editor.focus(current.start - 1);
        }

        if (event.key === "ArrowRight" && current.start < 1) {
            event.preventDefault();
            editor.focus(current.start + 1);
        }

        if (event.key === "ArrowRight" && current.start === 1 && captionEditor.getLength() > 0) {
            event.preventDefault();
            editor.focus(1);
            captionEditor.focus(0);
        }
    });

    syncStaticDom();

    return editor;
}

export function isImageNoteValue(value: unknown): value is ImageNoteValue {
    return !!value &&
        typeof value === "object" &&
        typeof (value as Partial<ImageNoteValue>).src === "string" &&
        ((value as Partial<ImageNoteValue>).alt === undefined || typeof (value as Partial<ImageNoteValue>).alt === "string") &&
        ((value as Partial<ImageNoteValue>).caption === undefined ||
            typeof (value as Partial<ImageNoteValue>).caption === "string" ||
            isFragment((value as Partial<ImageNoteValue>).caption));
}

export function isImageNoteFragment(fragment: NotebookNoteFragment): fragment is ImageNoteFragment {
    return fragment.type === IMAGE_NOTE_FRAGMENT_TYPE && isNormalizedImageNoteValue(fragment.data);
}

export function wrapImageNoteValue(value: ImageNoteValue): ImageNoteFragment {
    return {
        type: IMAGE_NOTE_FRAGMENT_TYPE,
        data: cloneImageNoteValue({
            src: value.src,
            alt: value.alt,
            caption: normalizeCaption(value.caption)
        })
    };
}

function isNormalizedImageNoteValue(value: unknown): value is NormalizedImageNoteValue {
    return !!value &&
        typeof value === "object" &&
        typeof (value as Partial<NormalizedImageNoteValue>).src === "string" &&
        ((value as Partial<NormalizedImageNoteValue>).alt === undefined || typeof (value as Partial<NormalizedImageNoteValue>).alt === "string") &&
        isFragment((value as Partial<NormalizedImageNoteValue>).caption);
}

function isFragment(value: unknown): value is Fragment {
    return !!value &&
        typeof value === "object" &&
        typeof (value as Partial<Fragment>).text === "string" &&
        Array.isArray((value as Partial<Fragment>).annotations);
}

function normalizeCaption(caption: ImageNoteValue["caption"]): Fragment {
    if (typeof caption === "string") {
        return { text: caption, annotations: [] };
    }

    if (isFragment(caption)) {
        return cloneFragment(caption);
    }

    return { text: "", annotations: [] };
}

function cloneImageNoteValue(value: NormalizedImageNoteValue): NormalizedImageNoteValue {
    return {
        src: value.src,
        alt: value.alt,
        caption: cloneFragment(value.caption)
    };
}

function cloneFragment(fragment: Fragment): Fragment {
    return {
        text: fragment.text,
        annotations: fragment.annotations.map(annotation => ({
            ...annotation,
            range: [...annotation.range]
        }))
    };
}

function replaceCaptionFragment(target: Fragment, source: Fragment): void {
    target.text = source.text;
    target.annotations = source.annotations.map(annotation => ({
        ...annotation,
        range: [...annotation.range]
    }));
}
