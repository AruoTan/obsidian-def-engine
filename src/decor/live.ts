import { RangeSetBuilder } from "@codemirror/state";
import { Decoration } from "@codemirror/view";

import BasicDecorator from "./types";

export default class LiveDecorator
	extends BasicDecorator
	implements PluginValue
{
	private static DEF_DECOR_CLS = "live-def-decoration";

	decorations: DecorationSet;
	editorView: EditorView;

	constructor(view: EditorView) {
		super();
		this.editorView = view;
		this.decorations = LiveDecorator.buildDecors(view);
	}

	update(update: ViewUpdate) {
		if (update.docChanged || update.viewportChanged || update.focusChanged)
			this.decorations = LiveDecorator.buildDecors(update.view);
	}

	private static buildDecors(view: EditorView): DecorationSet {
		const builder = new RangeSetBuilder<Decoration>();
		const phraseInfos: PhraseInfo[] = [];

		for (let { from, to } of view.visibleRanges) {
			const text = view.state.sliceDoc(from, to);
			phraseInfos.push(...this.scan(text, from));
		}

		phraseInfos.forEach((wordPos) => {
			const attributes = this.getDecorAttrs(wordPos.key);
			builder.add(
				wordPos.from,
				wordPos.to,
				Decoration.mark({
					class: this.DEF_DECOR_CLS,
					attributes: attributes,
				})
			);
		});
		window.defEngine.scopePhrases = phraseInfos;
		return builder.finish();
	}

	private static scan(content: string, offset: number): PhraseInfo[] {
		const lines = content.split(/\r?\n/);
		const phraseInfos: PhraseInfo[] = [];
		const searcher = window.defEngine.Searcher?.();
		if (!searcher) return [];
		lines.forEach((line) => {
			phraseInfos.push(...searcher.find(line, offset));
			offset += line.length + 1; // 1 stands for an additional char \n
		});

		// Decorations need to be sorted by 'from' ascending, then 'to' descending
		// This allows us to prefer longer words over shorter ones
		phraseInfos.sort((a, b) => b.to - a.to);
		phraseInfos.sort((a, b) => a.from - b.from);

		let cursor = 0;
		return phraseInfos.filter((info) => {
			if (info.from >= cursor) {
				cursor = info.to;
				return true;
			}
			return false;
		});
	}
}
