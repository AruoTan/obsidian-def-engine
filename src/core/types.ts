import { cloneDeep, orderBy } from "lodash";
import { dirname } from "path";

export class DefFileMap extends Map<string, DefFile> {
	addDefFile(file: TFile) {
		const scope = (file as DefFile).parent.path;
		this.set(scope, file as DefFile);
		return scope;
	}

	popDefFile(file: TFile) {
		const scope = dirname(file.path);
		this.delete(scope);
		return scope;
	}

	sortByDepth() {
		const files = Array.from(this);
		return orderBy(files, ([scope, _]) => {
			const cmps = scope == "/" ? [] : scope.split(/[\\/]/);
			return cmps.length;
		});
	}

	filter(scope: string) {
		scope = scope == "/" ? scope : `${scope}/`;
		const regex = new RegExp(`^${scope}`);
		const defFiles = this.sortByDepth();
		return defFiles.filter(([s]) => regex.test(`${s}/`));
	}
}

export class DefForest {
	/**
	 * Map: { Char -> DefForest | Definition }
	 */
	private children: Map<string, DefForest | Definition>;

	constructor() {
		this.children = new Map<string, DefForest | Definition>();
	}

	set(def: Definition): boolean {
		return this.setDef(def.key + "\n", def); // 使用 \n 作为结尾标记
	}

	get(key: string): Definition | undefined {
		key = key.trim().toLowerCase();
		return this.getDef(key);
	}

	match(line: string, ptr: number = 0): Definition | undefined {
		const child = this.children.get(line.charAt(ptr).toLowerCase());
		if (child instanceof DefForest) return child.match(line, ++ptr);
		if (child) return child;
		const def = this.children.get("\n") as Definition;
		return def;
	}

	clear(): void {
		this.children.clear();
	}

	clone(): DefForest {
		const defForest = new DefForest();
		this.children.forEach((child, char) => {
			if (child instanceof DefForest) {
				defForest.children.set(char, child.clone());
				return;
			}
			defForest.children.set(char, child);
		});
		return defForest;
	}

	private setDef(key: string, def: Definition, ptr: number = 0): boolean {
		const char = key.charAt(ptr);
		if (char == "\n") {
			const child = this.children.get("\n") as Definition;
			if (!child) {
				this.children.set("\n", def);
				return true;
			} else {
				const priorPath = child.file.parent.path;
				const defPath = def.file.parent.path;
				if (priorPath.length < defPath.length) {
					this.children.set("\n", def);
					return true;
				}
			}
			return false;
		}

		let child = this.children.get(char) as DefForest;
		if (!child) {
			child = new DefForest();
			this.children.set(char, child);
		}
		return child.setDef(key, def, ++ptr);
	}

	private getDef(key: string, ptr: number = 0): Definition | undefined {
		if (key.length == ptr) return this.children.get("\n") as Definition;
		const char = key.charAt(ptr);
		const child = this.children.get(char);
		if (child instanceof DefForest) {
			return child.getDef(key, ++ptr);
		}
	}
}

export class DefScopeTree {
	/**
	 * Map: { Scope Cmp -> PSTree }
	 */
	private children: Map<string, DefScopeTree>;
	private defForest: DefForest;
	private defKeys: Set<string>;
	private init: boolean;

	protected app: App;

	constructor(app: App) {
		this.app = app;
		this.init = false;
		this.children = new Map<string, DefScopeTree>();
	}

	getDef(key: string, scope?: string): Definition | undefined {
		const defScopeTree = this.get(scope);
		if (!defScopeTree) return;
		if (!defScopeTree.defKeys.has(key)) return;
		return defScopeTree.defForest.get(key);
	}

	getDefs(scope?: string): DefForest | undefined {
		const defScopeTree = this.get(scope);
		if (!defScopeTree) return;
		return defScopeTree.defForest;
	}

	setDef(def: Definition, scope?: string): void {
		const defScopeTree = this.get(scope);
		if (!defScopeTree) return;
		const keys = defScopeTree.defKeys;
		const defForest = defScopeTree.defForest;
		if (!defForest.set(def)) return;
		keys.add(def.key);
		for (const [scope, _] of defScopeTree.children) {
			defScopeTree.setDef(def, scope);
		}
	}

	setDefs(defs: Definition[], scope?: string): void {
		defs.forEach((def) => this.setDef(def, scope));
	}

	clear(scope?: string): void {
		const defScopeTree = this.get(scope);
		if (!defScopeTree) return;
		defScopeTree.clearAll();
	}

	clearAll(): void {
		this.children.forEach((child, _) => {
			child.clearAll();
		});
		this.children.clear();

		this.defKeys?.clear();
		this.defForest?.clear();

		this.init = false;
	}

	private get(scope?: string): DefScopeTree | undefined {
		const cmps = this.getScopeCmps(scope);
		if (!cmps) return;
		return this.getChild(cmps);
	}

	private getChild(
		cmps: string[],
		ptr: number = 0,
		parent?: DefScopeTree
	): DefScopeTree {
		if (!this.init) {
			if (parent) {
				this.defKeys = cloneDeep(parent.defKeys);
				this.defForest = parent.defForest.clone();
			}
			this.defKeys = this.defKeys ?? new Set<string>();
			this.defForest = this.defForest ?? new DefForest();
			this.init = true;
		}
		if (ptr == cmps.length) return this;
		const cmp = cmps[ptr];
		let child = this.children.get(cmp);
		if (!child) {
			child = new DefScopeTree(this.app);
			this.children.set(cmp, child);
		}
		return child.getChild(cmps, ++ptr, this);
	}

	private getScopeCmps(scope?: string): string[] | undefined {
		if (!scope) {
			const activeFile = this.app.workspace.getActiveFile();
			if (!activeFile) return;
			scope = dirname(activeFile.path);
		}
		return scope == "/" ? [] : scope.split(/[\\/]/);
	}
}

export class DefSearcher {
	private defForest: DefForest;

	constructor(defForest: DefForest) {
		this.defForest = defForest;
	}

	find(line: string, offset?: number): PhraseInfo[] {
		const phraseInfos: PhraseInfo[] = [];
		for (let i = 0; i < line.length; ) {
			const def = this.defForest.match(line, i);
			if (def) {
				phraseInfos.push({
					key: def.key,
					from: (offset ?? 0) + i,
					to: (offset ?? 0) + i + def.key.length,
				});
				i = i + def.key.length;
				continue;
			}
			i++;
		}
		return phraseInfos;
	}
}
