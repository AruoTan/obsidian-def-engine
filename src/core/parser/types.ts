export class FormatParser {
	static isEndOfBlock(line: string): boolean {
		return line.startsWith("---");
	}

	static istDefWord(line: string): boolean {
		return line.startsWith("# ");
	}

	static isDefAliases(line: string): boolean {
		line = line.trimEnd();
		return line.startsWith("*") && line.endsWith("*");
	}
}

export class DefBuffer {
	static word?: string;
	static aliases: string[] = [];
	static contents?: string;
	static filePosition: Partial<DefPosition> = {};

	static register(file: DefFile, defs: Definition[]): void {
		if (this.valid()) {
			const def = this.build(file);
			defs.push(def);
			// for aliases
			if (this.aliases && this.aliases.length > 0) {
				this.aliases.forEach((alias) => {
					const temp = Object.assign({}, def);
					temp.key = alias.toLowerCase();
					defs.push(temp);
				});
			}
		}
		this.clear();
	}

	static clear(): void {
		this.word = undefined;
		this.aliases = [];
		this.contents = undefined;
		this.filePosition = {};
	}

	private static valid(): boolean {
		return !!this.word;
	}

	private static build(file: DefFile): Definition {
		return {
			key: this.word?.toLowerCase() ?? "",
			word: this.word ?? "",
			aliases: this.aliases ?? [],
			contents: (this.contents ?? "").trim(),
			file: file,
			linkText: `${file.path}${this.word ? "#" + this.word : ""}`,
			position: {
				from: this.filePosition?.from ?? 0,
				to: this.filePosition?.to ?? 0,
			},
		};
	}
}
