export interface SelectionRange {
    start: number;
    end: number;
}

export interface DomPosition {
    node: Text;
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
        nodes.push(current as Text);
        current = walker.nextNode();
    }

    return nodes;
}

export function getOffset(
    root: HTMLElement,
    targetNode: Node,
    targetOffset: number
): number {
    const textNodes = getTextNodes(root);

    let offset = 0;

    for (const node of textNodes) {
        if (node === targetNode) {
            return offset + targetOffset;
        }

        offset += node.textContent?.length ?? 0;
    }

    return offset;
}

export function getDomPosition(
    root: HTMLElement,
    offset: number
): DomPosition | null {
    const textNodes = getTextNodes(root);

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

    if (!lastNode) {
        return null;
    }

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
    const startPos = getDomPosition(root, start);
    const endPos = getDomPosition(root, end);

    if (!startPos || !endPos) {
        return false;
    }

    const range = document.createRange();

    range.setStart(
        startPos.node,
        startPos.offset
    );

    range.setEnd(
        endPos.node,
        endPos.offset
    );

    const selection = window.getSelection();

    if (!selection) {
        return false;
    }

    selection.removeAllRanges();
    selection.addRange(range);

    return true;
}
