export default class BasicDecorator {
	protected static isDefFile(): boolean {
		const filename = window.defEngine.getActiveFileName?.();
		if (!filename || filename == "concepts.md") return true;
		return false;
	}

	protected static getDecorAttrs(phrase: string): { [key: string]: string } {
		let attributes: { [key: string]: string } = {
			def: phrase,
		};
		attributes.onclick =
			"event.stopPropagation();window.defPopover.trigger?.(this);";
		return attributes;
	}
}
