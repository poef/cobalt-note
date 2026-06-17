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
export declare class AnnotationRegistry {
    private definitions;
    register(definition: AnnotationDefinition): void;
    get(name: string): AnnotationDefinition | undefined;
    getAll(): AnnotationDefinition[];
    findByShortcut(event: KeyboardEvent): AnnotationDefinition | undefined;
    findByTag(tag: string): ParsedAnnotationTag | null;
}
export declare const defaultRegistry: AnnotationRegistry;
export declare function parseAnnotationTag(tag: string, registry?: AnnotationRegistry): ParsedAnnotationTag | null;
export declare function createAnnotationTag(name: string, enabled: boolean, registry?: AnnotationRegistry): string;
export declare function createLinkAnnotationTag(href: string): string;
export declare function createInverseAnnotationTag(openingTag: string): string;
export declare function createHtmlCloseTag(tag: string): string;
