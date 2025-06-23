import { Platform, Plugin } from "obsidian";

import DefinitionPopover from "./pc-popover";
import DefinitionModal from "./pm-popover";

declare global {
	interface Window {
		defPopover: Partial<{
			close: () => void;
			cleanUp: () => void;
			trigger: (el: HTMLElement) => void;
		}>;
	}
}

export default function initPopover(plugin: Plugin) {
	const getDef = (el: HTMLElement): Definition | undefined => {
		const word = el.getAttr("def");
		if (!word) return;
		return window.defEngine.core?.getDef(word);
	};

	if (Platform.isMobile) {
		const popover = new DefinitionModal(plugin.app);
		window.defPopover = {
			trigger: (el: HTMLElement) => {
				const def = getDef(el);
				if (def) popover.open(def);
			},
		};
	} else {
		const popover = new DefinitionPopover(plugin);
		window.defPopover = {
			close: () => popover.close(),
			cleanUp: () => popover.cleanUp(),
			trigger: (el: HTMLElement) => {
				const def = getDef(el);
				if (!def) return;
				popover.openAtCoords(def, el.getBoundingClientRect());
			},
		};
	}
}
