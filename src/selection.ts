export interface SelectionRange {
    start: number;
    end: number;
}

export interface DomPosition {
    node: Node;
    offset: number;
}

export interface CaretVisualPosition {
    rect: DOMRect;
    offset: number;
}

function getTextNodes(root: HTMLElement): Text[] {
    const walker = document.createTreeWalker(
        root,
        NodeFilter.SHOW_TEXT
    );

    const nodes: Text[] = [];
    let current = walker.nextNode();

    while (current) {
        const text = current as Text;

        if (!isSentinelTextNode(text)) {
            nodes.push(text);
        }

        current = walker.nextNode();
    }

    return nodes;
}

export function getOffset(
    root: HTMLElement,
    targetNode: Node,
    targetOffset: number
): number {
    const result = getOffsetFromPosition(
        root,
        targetNode,
        targetOffset
    );

    return result ?? getTextLength(root);
}

export function getDomPosition(
    root: HTMLElement,
    offset: number
): DomPosition {
    const textNodes = getTextNodes(root);

    if (textNodes.length === 0) {
        return {
            node: root,
            offset: 0
        };
    }

    let currentOffset = 0;

    for (const node of textNodes) {
        const length = node.textContent?.length ?? 0;

        if (offset <= currentOffset + length) {
            return {
                node,
                offset: offset - currentOffset
            };
        }

        currentOffset += length;
    }

    const lastNode = textNodes[textNodes.length - 1];

    return {
        node: lastNode,
        offset: lastNode.textContent?.length ?? 0
    };
}

export function getSelectionRange(
    root: HTMLElement
): SelectionRange | null {
    const selection = window.getSelection();

    if (!selection || selection.rangeCount === 0) {
        return null;
    }

    const range = selection.getRangeAt(0);

    if (
        !root.contains(range.startContainer) ||
        !root.contains(range.endContainer)
    ) {
        return null;
    }

    const start = getOffset(
        root,
        range.startContainer,
        range.startOffset
    );

    const end = getOffset(
        root,
        range.endContainer,
        range.endOffset
    );

    return {
        start: Math.min(start, end),
        end: Math.max(start, end)
    };
}

export function setSelectionRange(
    root: HTMLElement,
    start: number,
    end: number
): boolean {
    const startPosition = getDomPosition(root, start);
    const endPosition = getDomPosition(root, end);

    const range = document.createRange();

    range.setStart(
        startPosition.node,
        startPosition.offset
    );

    range.setEnd(
        endPosition.node,
        endPosition.offset
    );

    const selection = window.getSelection();

    if (!selection) {
        return false;
    }

    selection.removeAllRanges();
    selection.addRange(range);

    return true;
}

export function getCaretClientRect(
    root: HTMLElement,
    offset: number
): DOMRect | null {
    const position = getDomPosition(root, offset);
    const range = document.createRange();

    range.setStart(position.node, position.offset);
    range.collapse(true);

    const rect = firstRect(range);

    if (rect) {
        return rect;
    }

    return getMarkerRect(root, range);
}

export function getCurrentCaretClientRect(
    root: HTMLElement
): DOMRect | null {
    const selection = getSelectionRange(root);

    if (!selection || selection.start !== selection.end) {
        return null;
    }

    return getCaretClientRect(root, selection.start);
}

export function isOffsetOnFirstVisualLine(
    root: HTMLElement,
    offset: number,
    tolerance = 3
): boolean {
    const current = getCaretClientRect(root, offset);
    const first = getCaretClientRect(root, 0);

    if (!current || !first) {
        return false;
    }

    return current.top <= first.top + tolerance;
}

export function isOffsetOnLastVisualLine(
    root: HTMLElement,
    offset: number,
    textLength: number,
    tolerance = 3
): boolean {
    const current = getCaretClientRect(root, offset);
    const last = getCaretClientRect(root, textLength);

    if (!current || !last) {
        return false;
    }

    return current.bottom >= last.bottom - tolerance;
}

export function getOffsetAtPoint(
    root: HTMLElement,
    x: number,
    y: number
): number {
    const position = getDomPositionFromPoint(x, y);

    if (!position || !root.contains(position.node)) {
        return getNearestBoundaryOffset(root, y);
    }

    return getOffset(root, position.node, position.offset);
}

function getDomPositionFromPoint(
    x: number,
    y: number
): DomPosition | null {
    const doc = document as Document & {
        caretPositionFromPoint?: (x: number, y: number) => CaretPosition | null;
        caretRangeFromPoint?: (x: number, y: number) => Range | null;
    };

    if (doc.caretPositionFromPoint) {
        const position = doc.caretPositionFromPoint(x, y);

        if (position) {
            return {
                node: position.offsetNode,
                offset: position.offset
            };
        }
    }

    if (doc.caretRangeFromPoint) {
        const range = doc.caretRangeFromPoint(x, y);

        if (range) {
            return {
                node: range.startContainer,
                offset: range.startOffset
            };
        }
    }

    return null;
}

function getNearestBoundaryOffset(
    root: HTMLElement,
    y: number
): number {
    const rect = root.getBoundingClientRect();

    if (y <= rect.top) {
        return 0;
    }

    return getTextLength(root);
}

function firstRect(range: Range): DOMRect | null {
    const rects = Array.from(range.getClientRects());

    return rects.length > 0
        ? rects[0]
        : null;
}

function getMarkerRect(
    root: HTMLElement,
    range: Range
): DOMRect | null {
    const marker = document.createElement("span");

    marker.setAttribute("data-cobalt-caret-marker", "true");
    marker.textContent = "\u200B";

    range.insertNode(marker);

    const rect = marker.getBoundingClientRect();
    marker.remove();

    root.normalize();

    return rect.width === 0 && rect.height === 0
        ? null
        : rect;
}

function getOffsetFromPosition(
    root: Node,
    targetNode: Node,
    targetOffset: number
): number | null {
    let offset = 0;
    let found = false;

    function walk(node: Node): void {
        if (found) {
            return;
        }

        if (node === targetNode) {
            if (node.nodeType === Node.TEXT_NODE) {
                const text = node as Text;

                if (!isSentinelTextNode(text)) {
                    offset += Math.min(
                        targetOffset,
                        text.textContent?.length ?? 0
                    );
                }
            } else {
                for (let i = 0; i < targetOffset; i++) {
                    offset += getTextLength(node.childNodes[i]);
                }
            }

            found = true;
            return;
        }

        if (node.nodeType === Node.TEXT_NODE) {
            offset += getTextLength(node);
            return;
        }

        for (const child of Array.from(node.childNodes)) {
            walk(child);
        }
    }

    walk(root);

    return found
        ? offset
        : null;
}

function getTextLength(node: Node | undefined): number {
    if (!node) {
        return 0;
    }

    if (node.nodeType === Node.TEXT_NODE) {
        const text = node as Text;

        return isSentinelTextNode(text)
            ? 0
            : text.textContent?.length ?? 0;
    }

    let length = 0;

    for (const child of Array.from(node.childNodes)) {
        length += getTextLength(child);
    }

    return length;
}

function isSentinelTextNode(node: Text): boolean {
    return node.parentElement?.hasAttribute("data-cobalt-sentinel") ?? false;
}
