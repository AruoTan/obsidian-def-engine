import { Platform } from "obsidian";
import { getDefinitionPopover } from "./popover/pc-popover";
import { getDefinitionModal } from "./popover/pm-popover";

declare global {
	interface Window {
		NoteDefinition: GlobalVars;
	}
}

export interface GlobalVars {
	triggerDefPreview: (el: HTMLElement) => void;
}

// Initialise and inject globals
export function injectGlobals(targetWindow: Window) {
	targetWindow.NoteDefinition = {
		triggerDefPreview: (el: HTMLElement) => {
			const word = el.getAttr("def");
			if (!word) return;

			const def = activeWindow.defEngine.manager?.getDef(word);
			if (!def) return;

			if (Platform.isMobile) {
				const defModal = getDefinitionModal();
				defModal.open(def);
				return;
			}

			const defPopover = getDefinitionPopover();
			let isOpen = false;

			if (el.onmouseenter) {
				const openPopover = setTimeout(() => {
					defPopover.openAtCoords(def, el.getBoundingClientRect());
					isOpen = true;
				}, 200);

				el.onmouseleave = () => {
					if (!isOpen) {
						clearTimeout(openPopover);
					}
				};
				return;
			}
			defPopover.openAtCoords(def, el.getBoundingClientRect());
		},
	};
}
