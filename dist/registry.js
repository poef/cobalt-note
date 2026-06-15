export class AnnotationRegistry {
    definitions = new Map();
    register(definition) {
        this.definitions.set(definition.name, definition);
    }
    get(name) {
        return this.definitions.get(name);
    }
    getAll() {
        return Array.from(this.definitions.values());
    }
    findByTag(tag) {
        const trimmed = tag.trim();
        for (const definition of this.definitions.values()) {
            if (trimmed === definition.tag) {
                return {
                    name: definition.name,
                    enabled: true,
                    tag: definition.tag,
                    closeTag: createHtmlCloseTag(definition.tag),
                    priority: definition.priority ?? 100
                };
            }
            if (trimmed === createInverseAnnotationTag(definition.tag)) {
                return {
                    name: definition.name,
                    enabled: false,
                    priority: definition.priority ?? 100
                };
            }
        }
        return null;
    }
}
export const defaultRegistry = new AnnotationRegistry();
defaultRegistry.register({
    name: "link",
    tag: "<a>",
    priority: 0,
    shortcut: "Ctrl+K"
});
defaultRegistry.register({
    name: "underline",
    tag: "<u>",
    priority: 10,
    shortcut: "Ctrl+U"
});
defaultRegistry.register({
    name: "em",
    tag: "<em>",
    priority: 20,
    shortcut: "Ctrl+I"
});
defaultRegistry.register({
    name: "strong",
    tag: "<strong>",
    priority: 30,
    shortcut: "Ctrl+B"
});
export function parseAnnotationTag(tag, registry = defaultRegistry) {
    const trimmed = tag.trim();
    const registryMatch = registry.findByTag(trimmed);
    if (registryMatch) {
        return registryMatch;
    }
    if (isOpeningTag(trimmed, "a")) {
        return {
            name: "link",
            enabled: true,
            tag: trimmed,
            closeTag: createHtmlCloseTag(trimmed),
            priority: registry.get("link")?.priority ?? 0
        };
    }
    if (isClosingTag(trimmed, "a")) {
        return {
            name: "link",
            enabled: false,
            priority: registry.get("link")?.priority ?? 0
        };
    }
    return null;
}
export function createAnnotationTag(name, enabled, registry = defaultRegistry) {
    const definition = registry.get(name);
    if (!definition) {
        throw new Error(`Unknown annotation type: ${name}`);
    }
    return enabled
        ? definition.tag
        : createInverseAnnotationTag(definition.tag);
}
export function createLinkAnnotationTag(href) {
    return `<a href="${escapeAttribute(href)}">`;
}
export function createInverseAnnotationTag(openingTag) {
    const trimmed = openingTag.trim();
    if (!trimmed.startsWith("<") || trimmed.startsWith("</")) {
        throw new Error(`Expected opening annotation tag: ${openingTag}`);
    }
    return `</${trimmed.slice(1)}`;
}
export function createHtmlCloseTag(tag) {
    const tagName = getTagName(tag);
    if (!tagName) {
        throw new Error(`Could not determine tag name: ${tag}`);
    }
    return `</${tagName}>`;
}
function getTagName(tag) {
    const match = tag.trim().match(/^<\/?\s*([^\s>/]+)/);
    return match?.[1] ?? null;
}
function isOpeningTag(tag, tagName) {
    return new RegExp(`^<${tagName}(?:\\s[^>]*)?>$`, "i").test(tag);
}
function isClosingTag(tag, tagName) {
    return new RegExp(`^</${tagName}(?:\\s[^>]*)?>$`, "i").test(tag);
}
function escapeAttribute(value) {
    return value
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;");
}
//# sourceMappingURL=registry.js.map