import { DefBuffer, FormatParser } from "./types";

export default class DefParser {
	app: App;
	file: DefFile;
	definitions: Definition[] = [];

	constructor(app: App, file: DefFile) {
		this.app = app;
		this.file = file;
	}

	async run(): Promise<Definition[]> {
		const fileContent = await this.app.vault.cachedRead(this.file);
		return this.build(fileContent);
	}

	/**
	 * when file cache may not be updated and we know the new contents of the file
	 */
	async update(fileContent: string): Promise<Definition[]> {
		return this.build(fileContent);
	}

	// Parse from string, no dependency on App
	// For ease of testing
	private build(fileContent: string) {
		const fileMetadata = this.app.metadataCache.getFileCache(this.file);
		const fmPos = fileMetadata?.frontmatterPosition;
		if (fmPos) {
			fileContent = fileContent.slice(fmPos.end.offset + 1);
		}
		const lines = fileContent.split(/\r?\n/);

		let currLine = -1;
		let inContents = false;
		DefBuffer.clear();
		for (const line of lines) {
			currLine++;

			if (FormatParser.isEndOfBlock(line)) {
				DefBuffer.filePosition.to = currLine - 1;
				DefBuffer.register(this.file, this.definitions);
				inContents = false;
				continue;
			}
			if (inContents) {
				DefBuffer.contents += line + "\n";
				continue;
			}

			// If not within definition, ignore empty lines
			if (line == "") {
				continue;
			}
			if (FormatParser.istDefWord(line)) {
				DefBuffer.filePosition.from = currLine;
				DefBuffer.word = this.extractDefWord(line);
				continue;
			}
			if (FormatParser.isDefAliases(line)) {
				DefBuffer.aliases = this.extractDefAliases(line);
				continue;
			}
			// Begin definition
			inContents = true;
			DefBuffer.contents = line + "\n";
		}
		DefBuffer.filePosition.to = currLine;
		DefBuffer.register(this.file, this.definitions);
		return this.definitions;
	}

	private extractDefWord(line: string): string {
		const sepLine = line.split(" ");
		if (sepLine.length <= 1) {
			// Invalid word
			return "";
		}
		return sepLine.slice(1).join(" ");
	}

	private extractDefAliases(line: string): string[] {
		line = line.trimEnd().replace(/\*+/g, "");
		const aliases = line.split(/[,|]/);
		return aliases.map((alias) => alias.trim());
	}
}
