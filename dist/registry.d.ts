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
export declare class AnnotationRegistry {
    private definitions;
    register(definition: AnnotationDefinition): void;
    get(name: string): AnnotationDefinition | undefined;
    getAll(): AnnotationDefinition[];
    findByTag(tag: string): {
        definition: AnnotationDefinition;
        enabled: boolean;
    } | null;
}
export declare const defaultRegistry: AnnotationRegistry;
export declare function parseAnnotationTag(tag: string, registry?: AnnotationRegistry): ParsedAnnotationTag | null;
export declare function createAnnotationTag(name: string, enabled: boolean, registry?: AnnotationRegistry): string;
