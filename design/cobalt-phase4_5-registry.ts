export interface AnnotationDefinition {
    name: string;
    enableTag: string;
    disableTag: string;
    shortcut?: string;
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
): {
    name: string;
    enabled: boolean;
} | null {
    const result = registry.findByTag(tag);

    if (!result) {
        return null;
    }

    return {
        name: result.definition.name,
        enabled: result.enabled
    };
}

export function createAnnotationTag(
    name: string,
    enabled: boolean,
    registry: AnnotationRegistry = defaultRegistry
): string {
    const definition = registry.get(name);

    if (!definition) {
        throw new Error(
            `Unknown annotation type: ${name}`
        );
    }

    return enabled
        ? definition.enableTag
        : definition.disableTag;
}
