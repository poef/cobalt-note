import { Fragment, Annotation } from "./cobalt-phase1";

export interface Command {
    apply(fragment: Fragment): void;
}

export class InsertTextCommand implements Command {
    constructor(
        public offset: number,
        public text: string
    ) {}

    apply(fragment: Fragment): void {
        const delta = this.text.length;

        fragment.text =
            fragment.text.slice(0, this.offset) +
            this.text +
            fragment.text.slice(this.offset);

        for (const annotation of fragment.annotations) {
            let [start, end] = annotation.range;

            if (this.offset < start) {
                start += delta;
                end += delta;
            } else if (this.offset <= end) {
                end += delta;
            }

            annotation.range = [start, end];
        }
    }
}

export class DeleteRangeCommand implements Command {
    constructor(
        public startOffset: number,
        public endOffset: number
    ) {}

    apply(fragment: Fragment): void {

        if (this.endOffset <= this.startOffset) {
            return;
        }

        const delta =
            this.endOffset - this.startOffset;

        fragment.text =
            fragment.text.slice(0, this.startOffset) +
            fragment.text.slice(this.endOffset);

        for (const annotation of fragment.annotations) {
            let [start, end] = annotation.range;

            if (this.endOffset <= start) {
                start -= delta;
                end -= delta;
            } else if (this.startOffset >= end) {
                continue;
            } else {
                start = Math.min(start, this.startOffset);
                end = Math.max(start, end - delta);
            }

            annotation.range = [start, end];
        }

        fragment.annotations =
            fragment.annotations.filter(
                a => a.range[1] > a.range[0]
            );
    }
}

export class AddAnnotationCommand
implements Command {

    constructor(
        public range: [number, number],
        public tag: string
    ) {}

    apply(fragment: Fragment): void {

        let maxOrder = 0;

        for (const annotation of fragment.annotations) {
            maxOrder = Math.max(
                maxOrder,
                annotation.order
            );
        }

        const annotation: Annotation = {
            range: [...this.range] as [number, number],
            tag: this.tag,
            order: maxOrder + 1
        };

        fragment.annotations.push(annotation);
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
