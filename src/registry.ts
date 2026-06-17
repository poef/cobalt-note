export interface AnnotationDefinition {
    /** Unique internal annotation identity, for example "strong" or "highlight". */
    name: string;

    /** Exact opening annotation tag to emit when this annotation is enabled. */
    tag: string;

    /** Lower values render farther outside in the generated HTML. */
    priority?: number;

    shortcut?: string;

    /** If true, collapsed shortcut toggles create a one-shot pending annotation for the next input. */
    supportsPending?: boolean;
}

export interface ParsedAnnotationTag {
    name: string;
    enabled: boolean;
    tag?: string;
    closeTag?: string;
    priority: number;
}

export class AnnotationRegistry {
    private definitions = new Map<string, AnnotationDefinition>();

    register(definition: AnnotationDefinition): void {
        this.definitions.set(definition.name, definition);
    }

    get(name: string): AnnotationDefinition | undefined {
        return this.definitions.get(name);
    }

    getAll(): AnnotationDefinition[] {
        return Array.from(this.definitions.values());
    }

    findByShortcut(event: KeyboardEvent): AnnotationDefinition | undefined {
        const key = shortcutFromKeyboardEvent(event);

        return this.getAll().find(definition =>
            definition.shortcut?.toLowerCase() === key
        );
    }

    findByTag(tag: string): ParsedAnnotationTag | null {
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
    shortcut: "Ctrl+K",
    supportsPending: false
});

defaultRegistry.register({
    name: "underline",
    tag: "<u>",
    priority: 10,
    shortcut: "Ctrl+U",
    supportsPending: true
});

defaultRegistry.register({
    name: "em",
    tag: "<em>",
    priority: 20,
    shortcut: "Ctrl+I",
    supportsPending: true
});

defaultRegistry.register({
    name: "strong",
    tag: "<strong>",
    priority: 30,
    shortcut: "Ctrl+B",
    supportsPending: true
});

export function parseAnnotationTag(
    tag: string,
    registry: AnnotationRegistry = defaultRegistry
): ParsedAnnotationTag | null {
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

export function createAnnotationTag(
    name: string,
    enabled: boolean,
    registry: AnnotationRegistry = defaultRegistry
): string {
    const definition = registry.get(name);

    if (!definition) {
        throw new Error(`Unknown annotation type: ${name}`);
    }

    return enabled
        ? definition.tag
        : createInverseAnnotationTag(definition.tag);
}

export function createLinkAnnotationTag(
    href: string
): string {
    return `<a href="${escapeAttribute(href)}">`;
}

export function createInverseAnnotationTag(
    openingTag: string
): string {
    const trimmed = openingTag.trim();

    if (!trimmed.startsWith("<") || trimmed.startsWith("</")) {
        throw new Error(`Expected opening annotation tag: ${openingTag}`);
    }

    return `</${trimmed.slice(1)}`;
}

export function createHtmlCloseTag(tag: string): string {
    const tagName = getTagName(tag);

    if (!tagName) {
        throw new Error(`Could not determine tag name: ${tag}`);
    }

    return `</${tagName}>`;
}

function getTagName(tag: string): string | null {
    const match = tag.trim().match(/^<\/?\s*([^\s>/]+)/);
    return match?.[1] ?? null;
}

function isOpeningTag(tag: string, tagName: string): boolean {
    return new RegExp(`^<${tagName}(?:\\s[^>]*)?>$`, "i").test(tag);
}

function isClosingTag(tag: string, tagName: string): boolean {
    return new RegExp(`^</${tagName}(?:\\s[^>]*)?>$`, "i").test(tag);
}


function shortcutFromKeyboardEvent(event: KeyboardEvent): string {
    const parts: string[] = [];

    if (event.ctrlKey) {
        parts.push("ctrl");
    }

    if (event.metaKey) {
        parts.push("meta");
    }

    if (event.altKey) {
        parts.push("alt");
    }

    if (event.shiftKey) {
        parts.push("shift");
    }

    parts.push(event.key.toLowerCase());

    return parts.join("+");
}

function escapeAttribute(value: string): string {
    return value
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;");
}
