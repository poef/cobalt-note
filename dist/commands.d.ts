import { Fragment, InsertTextOptions } from "./fragment.js";
export interface Command {
    apply(fragment: Fragment): void;
}
export declare class InsertTextCommand implements Command {
    offset: number;
    text: string;
    options: InsertTextOptions;
    constructor(offset: number, text: string, options?: InsertTextOptions);
    apply(fragment: Fragment): void;
}
export declare class InsertFragmentCommand implements Command {
    offset: number;
    fragmentToInsert: Fragment;
    options: InsertTextOptions;
    constructor(offset: number, fragmentToInsert: Fragment, options?: InsertTextOptions);
    apply(fragment: Fragment): void;
}
export declare class DeleteRangeCommand implements Command {
    startOffset: number;
    endOffset: number;
    constructor(startOffset: number, endOffset: number);
    apply(fragment: Fragment): void;
}
export declare class AddAnnotationCommand implements Command {
    range: [number, number];
    tag: string;
    constructor(range: [number, number], tag: string);
    apply(fragment: Fragment): void;
}
export declare function applyCommand(fragment: Fragment, command: Command): void;
export declare function applyCommands(fragment: Fragment, commands: Command[]): void;
