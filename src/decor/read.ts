import BasicDecorator from "./types";

export default class ReadDecorator extends BasicDecorator {
	private static DEF_DECOR_CLS = "read-def-decoration";

	static process: MdPostProcessor = (
		el: HTMLElement,
		ctx: MdPostProcessorCtx
	): void => {
		const searcher = window.defEngine.Searcher?.();
		if (!searcher) return;
		this.buildDecors(el, searcher);
	};

	private static buildDecors(node: Node, searcher: DefSearcher) {
		for (let i = 0; i < node.childNodes.length; i++) {
			const childNode = node.childNodes[i];
			if (childNode.nodeType != Node.TEXT_NODE) {
				this.buildDecors(childNode, searcher);
				continue;
			}
			const content = childNode.textContent;
			if (!content || content == "\n") continue;
			const phraseInfos = searcher.find(content);
			if (phraseInfos.length == 0) continue;

			// Decorations need to be sorted by 'from' ascending, then 'to' descending
			// This allows us to prefer longer words over shorter ones
			phraseInfos.sort((a, b) => b.to - a.to);
			phraseInfos.sort((a, b) => a.from - b.from);

			let cursor = 0;
			const wrapper = node.createSpan();
			phraseInfos.forEach((info) => {
				if (info.from < cursor) return;
				wrapper.appendText(content.slice(cursor, info.from));

				const span = this.getDecorSpan(wrapper, info, content);
				wrapper.appendChild(span);

				cursor = info.to;
			});
			wrapper.appendText(content.slice(cursor));
			childNode.replaceWith(wrapper);
		}
	}

	private static getDecorSpan(
		wrapper: HTMLElement,
		info: PhraseInfo,
		content: string
	): HTMLSpanElement {
		const attributes = this.getDecorAttrs(info.key);
		const span = wrapper.createSpan({
			cls: this.DEF_DECOR_CLS,
			attr: attributes,
			text: content.slice(info.from, info.to),
		});
		return span;
	}
}
