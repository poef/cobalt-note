export interface AnnotationDefinition {
    name: string;
    enableTag: string;
    disableTag: string;
    shortcut?: string;
}

export interface ParsedAnnotationTag {
    name: string;
    enabled: boolean;
    href?: string;
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

    findByTag(tag: string): {
        definition: AnnotationDefinition;
        enabled: boolean;
    } | null {
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

export function parseAnnotationTag(
    tag: string,
    registry: AnnotationRegistry = defaultRegistry
): ParsedAnnotationTag | null {
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
        ? definition.enableTag
        : definition.disableTag;
}

export function createLinkAnnotationTag(
    href: string
): string {
    return `<a href="${escapeAttribute(href)}">`;
}

function escapeAttribute(value: string): string {
    return value
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;");
}

function unescapeAttribute(value: string): string {
    return value
        .replace(/&quot;/g, '"')
        .replace(/&gt;/g, ">")
        .replace(/&lt;/g, "<")
        .replace(/&amp;/g, "&");
}
