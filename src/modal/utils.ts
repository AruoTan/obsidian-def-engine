export function removeTrailingBlankNewlines(lines: string[]): string[] {
	let blankLines = 0;
	for (let i = 0; i < lines.length; i++) {
		const currLine = lines[lines.length - 1 - i];
		if (/\S/.test(currLine)) {
			blankLines = i;
			break;
		}
	}
	return lines.slice(0, lines.length - blankLines);
}

export function constructLinesFromDef(def: Definition): string[] {
	const lines = [`# ${def.word}`];
	if (def.aliases && def.aliases.length > 0) {
		const aliasStr = `*${def.aliases.join(", ")}*`;
		lines.push("", aliasStr);
	}
	const trimmedDef = def.contents ? def.contents.replace(/\s+$/g, "") : "";
	lines.push("", trimmedDef, "");
	return lines;
}

export function updateFile(
	fileLines: string[],
	defPos: DefPosition,
	newDef: Definition
) {
	const before = fileLines.slice(0, defPos.from);
	const after = fileLines.slice(defPos.to + 1);
	const newLines = constructLinesFromDef(newDef);
	return before.concat(newLines, after).join("\n");
}
