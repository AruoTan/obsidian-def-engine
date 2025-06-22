import { TFile } from "obsidian";
import { dirname } from "path";

import { DefFileMap, DefScopeTree, DefSearcher } from "./types";

import DefParser from "./parser";

const defFileMap: DefFileMap = new DefFileMap();
class DefManager extends DefScopeTree {
	events: EventRef[] = [];

	constructor(app: App) {
		super(app);
		this.registerEvents();
	}

	public async rebuild(scope: string) {
		this.clear(scope);
		const files = defFileMap.filter(scope);
		for (const [scope, file] of files) {
			const parser = new DefParser(this.app, file);
			const defs = await parser.run();
			this.setDefs(defs, scope);
		}
	}

	private async update(scope: string) {
		const defFile = defFileMap.get(scope);
		if (!defFile) return;
		const parser = new DefParser(this.app, defFile);
		const defs = await parser.run();
		this.setDefs(defs, scope);
	}

	private registerEvents(): void {
		const vault = this.app.vault;

		// 监听文件创建事件
		this.events.push(
			vault.on("create", (file) => {
				if (file instanceof TFile && file.name === "concepts.md") {
					defFileMap.addDefFile(file);
				}
			})
		);

		// 监听文件删除事件
		this.events.push(
			vault.on("delete", async (file) => {
				if (file instanceof TFile && file.name === "concepts.md") {
					const scope = defFileMap.popDefFile(file);
					await this.rebuild(scope);
				}
			})
		);

		// 监听文件修改事件
		this.events.push(
			vault.on("modify", async (file) => {
				if (file instanceof TFile && file.name === "concepts.md") {
					const scope = dirname(file.path);
					await this.update(scope);
				}
			})
		);

		// 监听文件重命名事件
		this.events.push(
			vault.on("rename", async (file, oldPath) => {
				if (file instanceof TFile) {
					if (oldPath.endsWith("/concepts.md")) {
						const scope = dirname(oldPath);
						defFileMap.delete(scope);
						await this.rebuild(scope);
					}
					if (file.name === "concepts.md") {
						const scope = defFileMap.addDefFile(file);
						await this.update(scope);
					}
				}
			})
		);
	}
}

declare global {
	type DefManager = InstanceType<typeof DefManager>;
	type DefSearcher = InstanceType<typeof DefSearcher>;

	interface Window {
		defEngine: Partial<{
			manager: DefManager;
			scopePhrases: PhraseInfo[];
			Searcher: () => DefSearcher | undefined;
			Parser: (app: App, file: DefFile) => DefParser | undefined;
			getDefFileMap: () => DefFileMap;
			getPhraseUnderCursor: (editor: Editor) => string;
		}>;
	}
}

let state = false;
export async function init(app: App) {
	if (state) return;

	app.vault.getMarkdownFiles().forEach((file) => {
		if (file.name == "concepts.md") defFileMap.addDefFile(file);
	});

	const manager = new DefManager(app);
	const files = defFileMap.sortByDepth();
	for (const [scope, file] of files) {
		const parser = new DefParser(this.app, file);
		const defs = await parser.run();
		manager.setDefs(defs, scope);
	}

	window.defEngine = {
		manager,
		scopePhrases: [],
		Searcher: () => {
			const defForest = manager.getDefs();
			if (!defForest) return;
			return new DefSearcher(defForest);
		},
		Parser: (app: App, file: DefFile) => {
			return new DefParser(app, file);
		},
		getDefFileMap: () => {
			const activeFile = app.workspace.getActiveFile();
			if (!activeFile) return defFileMap;
			const map = new DefFileMap();
			map.forEach((file, scope) => {
				const regex = RegExp(`^${scope}`);
				if (regex.test(activeFile.path)) {
					map.addDefFile(file);
					return;
				}
				if (scope == "/") map.addDefFile(file);
			});
			return map;
		},
		getPhraseUnderCursor: (editor: Editor) => {
			const offset = editor.posToOffset(editor.getCursor());
			const scopePhrases = window.defEngine.scopePhrases;
			if (!scopePhrases || scopePhrases.length == 0) return "";
			let start = 0;
			let end = scopePhrases.length - 1;

			// Binary search to get marked word at provided position
			while (start <= end) {
				let mid = Math.floor((start + end) / 2);

				let currPhrase = scopePhrases[mid];
				if (offset >= currPhrase.from && offset <= currPhrase.to) {
					return currPhrase.key;
				}
				if (offset < currPhrase.from) {
					end = mid - 1;
				}
				if (offset > currPhrase.to) {
					start = mid + 1;
				}
			}
			return "";
		},
	};
	state = true;
}
