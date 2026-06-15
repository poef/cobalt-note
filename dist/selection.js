function getTextNodes(root) {
    const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
    const nodes = [];
    let current = walker.nextNode();
    while (current) {
        nodes.push(current);
        current = walker.nextNode();
    }
    return nodes;
}
export function getOffset(root, targetNode, targetOffset) {
    const range = document.createRange();
    range.setStart(root, 0);
    range.setEnd(targetNode, targetOffset);
    return range.toString().length;
}
export function getDomPosition(root, offset) {
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
export function getSelectionRange(root) {
    const selection = window.getSelection();
    if (!selection || selection.rangeCount === 0) {
        return null;
    }
    const range = selection.getRangeAt(0);
    if (!root.contains(range.startContainer) ||
        !root.contains(range.endContainer)) {
        return null;
    }
    const start = getOffset(root, range.startContainer, range.startOffset);
    const end = getOffset(root, range.endContainer, range.endOffset);
    return {
        start: Math.min(start, end),
        end: Math.max(start, end)
    };
}
export function setSelectionRange(root, start, end) {
    const startPosition = getDomPosition(root, start);
    const endPosition = getDomPosition(root, end);
    const range = document.createRange();
    range.setStart(startPosition.node, startPosition.offset);
    range.setEnd(endPosition.node, endPosition.offset);
    const selection = window.getSelection();
    if (!selection) {
        return false;
    }
    selection.removeAllRanges();
    selection.addRange(range);
    return true;
}
//# sourceMappingURL=selection.js.map