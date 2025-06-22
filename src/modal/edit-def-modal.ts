import { Modal } from "obsidian";
import { updateFile } from "./utils";

export default class EditDefModal extends Modal {
	aliases: string;
	definition: string;

	activate(def: Definition) {
		this.setTitle(`Edit definition for '${def.word}'`);
		this.contentEl.createDiv({
			cls: "edit-modal-section-header",
			text: "Aliases",
		});
		const aliasText = this.contentEl.createEl("textarea", {
			cls: "edit-modal-aliases",
			attr: {
				placeholder: "Add comma-separated aliases here",
			},
			text: def.aliases.join(", "),
		});
		this.contentEl.createDiv({
			cls: "edit-modal-section-header",
			text: "Definition",
		});
		const defText = this.contentEl.createEl("textarea", {
			cls: "edit-modal-textarea",
			attr: {
				placeholder: "Add definition here",
			},
			text: def.contents,
		});
		const button = this.contentEl.createEl("button", {
			text: "Save",
			cls: "edit-modal-save-button",
		});
		button.addEventListener("click", () => {
			this.editDef({
				...def,
				aliases: aliasText.value
					? aliasText.value.split(",").map((alias) => alias.trim())
					: [],
				contents: defText.value,
			});
			this.close();
		});

		this.open();
	}

	async editDef(newDef: Definition) {
		const file = newDef.file;
		const fileContent = await this.app.vault.read(file);
		const fileLines = fileContent.split(/\r?\n/);

		const fileParser = window.defEngine.Parser?.(this.app, file);
		if (!fileParser) return;
		const defs = await fileParser.run();

		const oldDef = defs.find((def) => def.key === newDef.key);
		if (!oldDef?.position) return;
		const newContent = updateFile(fileLines, oldDef.position, newDef);
		await this.app.vault.modify(file, newContent);
	}
}
