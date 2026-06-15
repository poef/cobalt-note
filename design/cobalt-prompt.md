# cobalt note editor

Goal: use cobalt annotation as the data format to render and edit notes with a limited set of inline only annotations. Make sure this editor is easy to include in a larger web application.

## Behaviour

You instantiate a cobalt editor using `cobalt.edit(element, fragment)`. The element is a HTMLElement, e.g. a `<DIV>`. The fragment is a valid cobalt fragment, consisting of a text portion and a list of annotations.

The edit method will render the fragment to HTML and inject that into the element. It will add the contenteditable attribute. It will prevent the default action of the return or enter key.

If the user has selected a part of the HTML, these keys will affect it like this:
- control-b: this adds a `<strong>` annotation on the selected range.
- control-i: this adds an `<em>` annotation on the selected range.
- control-u: this adds an `<u>` annotation on the selected range.
- control-k: this shows the user a prompt to enter a URL. It will then add a `<a href="${url}">` annotation on the selected range.

If the selection starts in a part of the HTML that already has the same annotation, these same keys will instead add an inverse annotation, e.g. `</strong>`, `</em>`, `</u>`.

If the has not selected a part of the HTML, these same keypresses instead will toggle the applyAnnotationState set. So for control-b for example, the next input will either add or inverse the `<strong>` annotation on that specific input.

The list of annotations and corresponding keys must be extendible on a later date.

## Architecture

A cobalt fragment is a JSON structure with this format:

```json
{
	"text": "Any plain text, may include\nmultiple lines",
	"annotations": [
		{
			"range": [0,3],
			"tag": "<strong>"
		}
	]
}
```

Each annotation has a range and a tag. Tags may contain attributes. Tags may also use `</tagName>`, in which case when rendered, that tag is removed from the HTML for that range, instead of added.

A range is an array with two positive integer values. The first value is the 0-based start offset, the second is the end offset. The end offset must always be larger than the start offset. There are no empty ranges. If a user deletes some text content that have annotations, those annotations will also be removed.

# HTML rendering

The cobalt api implements a function `cobalt.render(fragment)` which returns a valid HTML string.

Annotations are applied in order, later annotations win over earlier annotations, if the HTML rendering does not allow for both annotations to be expressed. The render function returns a HTML structure that allows the most annotations to be expressed. But it will also try to optimize the HTML so that it contains the least amount of open and close tags as possible to do so.