export default class BasicDecorator {
	protected static getDecorAttrs(phrase: string): { [key: string]: string } {
		let attributes: { [key: string]: string } = {
			def: phrase,
		};
		attributes.onclick =
			"event.stopPropagation();window.defPopover.trigger?.(this);";
		return attributes;
	}
}
