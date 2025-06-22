import { DropdownComponent, Modal, Notice, Setting } from "obsidian";
import { constructLinesFromDef, removeTrailingBlankNewlines } from "./utils";

export default class AddDefModal extends Modal {
	aliases: string;
	definition: string;

	defFilePicker: DropdownComponent;

	activate(text?: string) {
		this.setTitle("Add Definition");
		this.contentEl.createDiv({
			cls: "edit-modal-section-header",
			text: "Word/Phrase",
		});
		const phraseText = this.contentEl.createEl("textarea", {
			cls: "edit-modal-aliases",
			attr: {
				placeholder: "Word/phrase to be defined",
			},
			text: text ?? "",
		});
		this.contentEl.createDiv({
			cls: "edit-modal-section-header",
			text: "Aliases",
		});
		const aliasText = this.contentEl.createEl("textarea", {
			cls: "edit-modal-aliases",
			attr: {
				placeholder: "Add comma-separated aliases here",
			},
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
		});

		const defFiles = window.defEngine.getDefFileMap?.();
		if (!defFiles) return;
		new Setting(this.contentEl)
			.setName("Definition file")
			.addDropdown((component) => {
				defFiles.forEach((file, scope) => {
					component.addOption(scope, file.path);
				});
				this.defFilePicker = component;
			});

		const button = this.contentEl.createEl("button", {
			text: "Save",
			cls: "edit-modal-save-button",
		});
		button.addEventListener("click", () => {
			if (!phraseText.value || !defText.value) {
				new Notice("Please fill in a definition value");
				return;
			}
			if (!this.defFilePicker.getValue()) {
				new Notice(
					"Please choose a definition file. If you do not have any definition files, please create one."
				);
				return;
			}
			const defFile = defFiles.get(
				this.defFilePicker.getValue()
			) as DefFile;
			this.addDef({
				key: phraseText.value.toLowerCase(),
				word: phraseText.value,
				aliases: aliasText.value
					? aliasText.value.split(",").map((alias) => alias.trim())
					: [],
				contents: defText.value,
				linkText: `${defFile.path}${
					phraseText.value ? "#" + phraseText.value : ""
				}`,
				file: defFile,
			});
			this.close();
		});

		this.open();
	}

	async addDef(newDef: Definition) {
		const file = newDef.file;
		const fileContent = await this.app.vault.read(file);
		const fileLines = removeTrailingBlankNewlines(
			fileContent.split(/\r?\n/)
		);
		if (!fileLines[fileLines.length - 1].startsWith("---")) {
			fileLines.push("", "---");
		}
		const newLines = constructLinesFromDef(newDef);
		const newContent = fileLines.concat(newLines).join("\n");
		await this.app.vault.modify(file, newContent);
	}
}
