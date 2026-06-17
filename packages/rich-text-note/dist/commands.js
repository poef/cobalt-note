import { addAnnotation, deleteRange, insertFragment, insertText } from "./fragment.js";
export class InsertTextCommand {
    offset;
    text;
    options;
    constructor(offset, text, options = {}) {
        this.offset = offset;
        this.text = text;
        this.options = options;
    }
    apply(fragment) {
        insertText(fragment, this.offset, this.text, this.options);
    }
}
export class InsertFragmentCommand {
    offset;
    fragmentToInsert;
    options;
    constructor(offset, fragmentToInsert, options = {}) {
        this.offset = offset;
        this.fragmentToInsert = fragmentToInsert;
        this.options = options;
    }
    apply(fragment) {
        insertFragment(fragment, this.offset, this.fragmentToInsert, this.options);
    }
}
export class DeleteRangeCommand {
    startOffset;
    endOffset;
    constructor(startOffset, endOffset) {
        this.startOffset = startOffset;
        this.endOffset = endOffset;
    }
    apply(fragment) {
        deleteRange(fragment, this.startOffset, this.endOffset);
    }
}
export class AddAnnotationCommand {
    range;
    tag;
    constructor(range, tag) {
        this.range = range;
        this.tag = tag;
    }
    apply(fragment) {
        addAnnotation(fragment, this.range, this.tag);
    }
}
export function applyCommand(fragment, command) {
    command.apply(fragment);
}
export function applyCommands(fragment, commands) {
    for (const command of commands) {
        command.apply(fragment);
    }
}
//# sourceMappingURL=commands.js.map