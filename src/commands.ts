import {
    addAnnotation,
    deleteRange,
    Fragment,
    insertFragment,
    insertText,
    InsertTextOptions
} from "./fragment.js";

export interface Command {
    apply(fragment: Fragment): void;
}

export class InsertTextCommand implements Command {
    constructor(
        public offset: number,
        public text: string,
        public options: InsertTextOptions = {}
    ) {}

    apply(fragment: Fragment): void {
        insertText(fragment, this.offset, this.text, this.options);
    }
}

export class InsertFragmentCommand implements Command {
    constructor(
        public offset: number,
        public fragmentToInsert: Fragment,
        public options: InsertTextOptions = {}
    ) {}

    apply(fragment: Fragment): void {
        insertFragment(
            fragment,
            this.offset,
            this.fragmentToInsert,
            this.options
        );
    }
}

export class DeleteRangeCommand implements Command {
    constructor(
        public startOffset: number,
        public endOffset: number
    ) {}

    apply(fragment: Fragment): void {
        deleteRange(fragment, this.startOffset, this.endOffset);
    }
}

export class AddAnnotationCommand implements Command {
    constructor(
        public range: [number, number],
        public tag: string
    ) {}

    apply(fragment: Fragment): void {
        addAnnotation(fragment, this.range, this.tag);
    }
}

export function applyCommand(
    fragment: Fragment,
    command: Command
): void {
    command.apply(fragment);
}

export function applyCommands(
    fragment: Fragment,
    commands: Command[]
): void {
    for (const command of commands) {
        command.apply(fragment);
    }
}
