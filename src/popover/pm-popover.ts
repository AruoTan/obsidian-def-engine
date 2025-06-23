import {
	App,
	Component,
	MarkdownRenderer,
	Modal,
	normalizePath,
} from "obsidian";

export default class DefinitionModal extends Component {
	app: App;
	modal: Modal;

	constructor(app: App) {
		super();
		this.app = app;
		this.modal = new Modal(app);
	}

	open(definition: Definition) {
		this.modal.contentEl.empty();
		this.modal.contentEl.createEl("h1", {
			text: definition.word,
		});
		this.modal.contentEl.createEl("i", {
			text: definition.aliases.join(", "),
		});
		const defContent = this.modal.contentEl.createEl("div", {
			attr: {
				ctx: "def-popup",
			},
		});
		MarkdownRenderer.render(
			this.app,
			definition.contents,
			defContent,
			normalizePath(definition.file.path) ?? "",
			this
		);
		this.modal.open();
	}
}
