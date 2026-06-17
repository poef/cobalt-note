function getTextNodes(root) {
    const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
    const nodes = [];
    let current = walker.nextNode();
    while (current) {
        const text = current;
        if (!isSentinelTextNode(text)) {
            nodes.push(text);
        }
        current = walker.nextNode();
    }
    return nodes;
}
export function getOffset(root, targetNode, targetOffset) {
    const result = getOffsetFromPosition(root, targetNode, targetOffset);
    return result ?? getTextLength(root);
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
function getOffsetFromPosition(root, targetNode, targetOffset) {
    let offset = 0;
    let found = false;
    function walk(node) {
        if (found) {
            return;
        }
        if (node === targetNode) {
            if (node.nodeType === Node.TEXT_NODE) {
                const text = node;
                if (!isSentinelTextNode(text)) {
                    offset += Math.min(targetOffset, text.textContent?.length ?? 0);
                }
            }
            else {
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
function getTextLength(node) {
    if (!node) {
        return 0;
    }
    if (node.nodeType === Node.TEXT_NODE) {
        const text = node;
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
function isSentinelTextNode(node) {
    return node.parentElement?.hasAttribute("data-cobalt-sentinel") ?? false;
}
//# sourceMappingURL=selection.js.map