import { addAnnotation, deleteRange, insertText } from "./fragment.js";
export class InsertTextCommand {
    offset;
    text;
    constructor(offset, text) {
        this.offset = offset;
        this.text = text;
    }
    apply(fragment) {
        insertText(fragment, this.offset, this.text);
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