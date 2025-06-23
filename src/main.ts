import { Notice, Plugin, TFile, TFolder } from "obsidian";

import { LiveViewPlugin, ReadDecorator } from "./decor";
import { DEFAULT_SETTINGS, SettingsTab } from "./settings";

import initCore from "./core";
import initModal from "./modal";
import initPopover from "./popover";

export default class DefEngine extends Plugin {
	core: DefCore;

	async onload() {
		const settings = Object.assign(
			{},
			DEFAULT_SETTINGS,
			await this.loadData()
		);
		window.defSettings = settings;

		this.app.workspace.onLayoutReady(async () => {
			await initCore(this.app);
			this.core = window.defEngine.core as DefCore;
			this.core.events.forEach((event) => this.registerEvent(event));

			initPopover(this);

			this.registerEvents();

			this.registerEditorExtension(LiveViewPlugin);
			this.registerMarkdownPostProcessor(ReadDecorator.process);
		});

		this.addSettingTab(
			new SettingsTab(this.app, this, this.saveSettings.bind(this))
		);
	}

	async saveSettings() {
		await this.saveData(window.defSettings);
	}

	registerEvents() {
		// 监听编辑器菜单项
		this.registerEvent(
			this.app.workspace.on("editor-menu", (menu, editor) => {
				window.defPopover.close?.();
				const defEngine = window.defEngine;
				const key = defEngine.getPhraseUnderCursor?.(editor);
				if (!key) {
					if (editor.getSelection()) {
						menu.addItem((item) => {
							item.setTitle("添加定义")
								.setIcon("plus")
								.onClick(() => {
									const addModal = initModal("add", this.app);
									addModal.activate(editor.getSelection());
								});
						});
					}
					return;
				}
				const def = this.core.getDef(key);
				if (!def) return;
				menu.addItem((item) => {
					item.setTitle("跳转到定义")
						.setIcon("arrow-left-from-line")
						.onClick(() => {
							this.app.workspace.openLinkText(def.linkText, "");
						});
				});
				menu.addItem((item) => {
					item.setTitle("编辑定义")
						.setIcon("pencil")
						.onClick(() => {
							const editModal = initModal("edit", this.app);
							editModal.activate(def);
						});
				});
			})
		);

		// 监听资源管理器菜单项
		this.registerEvent(
			this.app.workspace.on("file-menu", (menu, filder) => {
				if (filder instanceof TFolder) {
					menu.addItem((item) => {
						item.setTitle("创建概念库文件")
							.setIcon("book-open")
							.onClick(() => {
								const path = `${filder.path}/concepts.md`;
								const open = () => {
									const file =
										this.app.vault.getFileByPath(path);
									if (file) {
										this.app.workspace
											.getLeaf(false)
											.openFile(file);
										return true;
									}
									return false;
								};
								if (open()) return;
								this.app.vault
									.create(
										path,
										"# 示例概念\n\n*别名1, 别名2*\n\n这是一个示例概念的定义。\n\n---\n"
									)
									.then(() => {
										if (!open()) return;
									})
									.catch((error) => {
										new Notice(
											`创建文件失败: ${error.message}`
										);
									});
							});
					});
				} else if (
					filder instanceof TFile &&
					filder.name === "concepts.md"
				) {
					menu.addItem((item) => {
						item.setTitle("刷新概念库")
							.setIcon("refresh-cw")
							.onClick(() => {
								this.core.rebuild(
									(filder as DefFile).parent.path
								);
								new Notice("概念库已刷新");
							});
					});
				}
			})
		);
	}

	onunload() {
		window.defPopover.cleanUp?.();
	}
}
