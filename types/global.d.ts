import * as cms from "@codemirror/state";
import * as cmv from "@codemirror/view";
import * as ob from "obsidian";

declare global {
	type App = ob.App;
	type Editor = ob.Editor;
	type EventRef = ob.EventRef;
	type MdPostProcessor = ob.MarkdownPostProcessor;
	type MdPostProcessorCtx = ob.MarkdownPostProcessorContext;
	type TFile = ob.TFile;
	type TFolder = ob.TFolder;
	type View = ob.View;

	type Extension = cms.Extension;

	type DecorationSet = cmv.DecorationSet;
	type EditorView = cmv.EditorView;
	type PluginValue = cmv.PluginValue;
	type ViewUpdate = cmv.ViewUpdate;

	interface DefFile extends TFile {
		parent: TFolder;
	}

	interface DefPosition {
		from: number;
		to: number;
	}

	interface Definition {
		key: string;
		word: string;
		aliases: string[];
		contents: string;
		file: DefFile;
		linkText: string;
		position?: DefPosition;
	}

	interface PhraseInfo {
		key: string;
		from: number;
		to: number;
	}

	interface Settings {
		defPopoverConfig: {
			displayAliases: boolean;
			displayDefFileName: boolean;
			enableCustomSize: boolean;
			maxWidth: number;
			maxHeight: number;
		};
	}

	interface Window {
		defSettings: Settings;
	}
}
