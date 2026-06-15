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
        for (const definition of this.definitions.values()) {
            if (tag === definition.enableTag) {
                return {
                    definition,
                    enabled: true
                };
            }
            if (tag === definition.disableTag) {
                return {
                    definition,
                    enabled: false
                };
            }
        }
        return null;
    }
}
export const defaultRegistry = new AnnotationRegistry();
defaultRegistry.register({
    name: "strong",
    enableTag: "<strong>",
    disableTag: "</strong>",
    shortcut: "Ctrl+B"
});
defaultRegistry.register({
    name: "em",
    enableTag: "<em>",
    disableTag: "</em>",
    shortcut: "Ctrl+I"
});
defaultRegistry.register({
    name: "underline",
    enableTag: "<u>",
    disableTag: "</u>",
    shortcut: "Ctrl+U"
});
export function parseAnnotationTag(tag, registry = defaultRegistry) {
    const trimmed = tag.trim();
    const registryMatch = registry.findByTag(trimmed);
    if (registryMatch) {
        return {
            name: registryMatch.definition.name,
            enabled: registryMatch.enabled
        };
    }
    const linkMatch = trimmed.match(/^<a\s+href="([^"]+)">$/);
    if (linkMatch) {
        return {
            name: "link",
            enabled: true,
            href: unescapeAttribute(linkMatch[1])
        };
    }
    if (trimmed === "</a>") {
        return {
            name: "link",
            enabled: false
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
        ? definition.enableTag
        : definition.disableTag;
}
export function createLinkAnnotationTag(href) {
    return `<a href="${escapeAttribute(href)}">`;
}
function escapeAttribute(value) {
    return value
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;");
}
function unescapeAttribute(value) {
    return value
        .replace(/&quot;/g, '"')
        .replace(/&gt;/g, ">")
        .replace(/&lt;/g, "<")
        .replace(/&amp;/g, "&");
}
//# sourceMappingURL=registry.js.map