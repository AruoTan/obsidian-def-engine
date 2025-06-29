import {
	Component,
	MarkdownRenderer,
	MarkdownView,
	normalizePath,
	Plugin,
} from "obsidian";

interface Coordinates {
	left: number;
	right: number;
	top: number;
	bottom: number;
}

export default class DefinitionPopover extends Component {
	app: App;
	plugin: Plugin;
	// Code mirror editor object for capturing vim events
	cmEditor: any;
	// Ref to the currently mounted popover
	// There should only be one mounted popover at all times
	mountedPopover: HTMLElement | undefined;

	private readonly ID = "definition-popover";

	constructor(plugin: Plugin) {
		super();
		this.app = plugin.app;
		this.plugin = plugin;
		this.cmEditor = this.getCmEditor(this.app);
	}

	// Open at editor cursor's position
	openAtCursor(def: Definition) {
		this.unmount();
		this.mountAtCursor(def);

		if (!this.mountedPopover) {
			console.log("Mounting definition popover failed");
			return;
		}

		this.registerClosePopoverListeners();
	}

	// Open at coordinates (can use for opening at mouse position)
	openAtCoords(def: Definition, coords: Coordinates) {
		this.unmount();
		this.mountAtCoordinates(def, coords);

		if (!this.mountedPopover) {
			console.log("mounting definition popover failed");
			return;
		}
		this.registerClosePopoverListeners();
	}

	cleanUp() {
		console.log("Cleaning popover elements");
		const popoverEls = document.getElementsByClassName(this.ID);
		for (let i = 0; i < popoverEls.length; i++) {
			popoverEls[i].remove();
		}
	}

	close = () => {
		this.unmount();
	};

	clickClose = () => {
		if (this.mountedPopover?.matches(":hover")) {
			return;
		}
		this.close();
	};

	private getCmEditor(app: App) {
		const activeView = app.workspace.getActiveViewOfType(MarkdownView);
		const cmEditor = (activeView as any)?.editMode?.editor?.cm?.cm;
		if (!cmEditor) {
			console.log(
				"cmEditor object not found, will not handle vim events for definition popover"
			);
		}
		return cmEditor;
	}

	private shouldOpenToLeft(
		horizontalOffset: number,
		containerStyle: CSSStyleDeclaration
	): boolean {
		return horizontalOffset > parseInt(containerStyle.width) / 2;
	}

	private shouldOpenUpwards(
		verticalOffset: number,
		containerStyle: CSSStyleDeclaration
	): boolean {
		return verticalOffset > parseInt(containerStyle.height) / 2;
	}

	// Creates popover element and its children, without displaying it
	private createElement(
		def: Definition,
		parent: HTMLElement
	): HTMLDivElement {
		const popoverSettings = window.defSettings.defPopoverConfig;
		const el = parent.createEl("div", {
			cls: "definition-popover",
			attr: {
				id: this.ID,
				style: `visibility:hidden;`,
			},
		});

		el.createEl("h2", { text: def.word });
		if (def.aliases.length > 0 && popoverSettings.displayAliases) {
			el.createEl("i", { text: def.aliases.join(", ") });
		}
		const contentEl = el.createEl("div");
		contentEl.setAttr("ctx", "def-popup");

		const currComponent = this;
		MarkdownRenderer.render(
			this.app,
			def.contents,
			contentEl,
			normalizePath(def.file.path),
			currComponent
		);
		this.postprocessMarkdown(contentEl, def);

		if (popoverSettings.displayScope) {
			el.createEl("div", {
				text: def.file.parent.path,
				cls: "definition-popover-filename",
			});
		}
		el.onmouseleave = () => {
			this.close();
			el.onmouseleave = null;
		};
		return el;
	}

	// Internal links do not work properly in the popover
	// This is to manually open internal links
	private postprocessMarkdown(el: HTMLDivElement, def: Definition) {
		const internalLinks = el.getElementsByClassName("internal-link");
		for (let i = 0; i < internalLinks.length; i++) {
			const linkEl = internalLinks.item(i);
			if (linkEl) {
				linkEl.addEventListener("click", (e) => {
					e.preventDefault();
					const file = this.app.metadataCache.getFirstLinkpathDest(
						linkEl.getAttr("href") ?? "",
						normalizePath(def.file.path)
					);
					this.unmount();
					if (!file) {
						return;
					}
					this.app.workspace.getLeaf().openFile(file);
				});
			}
		}
	}

	private mountAtCursor(def: Definition) {
		let cursorCoords;
		try {
			cursorCoords = this.getCursorCoords();
		} catch (e) {
			console.log(
				"Could not open definition popover - could not get cursor coordinates"
			);
			return;
		}

		this.mountAtCoordinates(def, cursorCoords);
	}

	// Offset coordinates from viewport coordinates to coordinates relative to the parent container element
	private offsetCoordsToContainer(
		coords: Coordinates,
		container: HTMLElement
	): Coordinates {
		const containerRect = container.getBoundingClientRect();
		return {
			left: coords.left - containerRect.left,
			right: coords.right - containerRect.left,
			top: coords.top - containerRect.top,
			bottom: coords.bottom - containerRect.top,
		};
	}

	private mountAtCoordinates(def: Definition, coords: Coordinates) {
		const mdView = this.app.workspace.getActiveViewOfType(MarkdownView);
		if (!mdView) {
			console.log(
				"Could not mount popover: No active markdown view found"
			);
			return;
		}

		this.mountedPopover = this.createElement(def, mdView.containerEl);
		this.positionAndSizePopover(mdView, coords);
	}

	// Position and display popover
	private positionAndSizePopover(mdView: MarkdownView, coords: Coordinates) {
		if (!this.mountedPopover) {
			return;
		}
		const popoverSettings = window.defSettings.defPopoverConfig;
		const containerStyle = getComputedStyle(mdView.containerEl);
		const matchedClasses =
			mdView.containerEl.getElementsByClassName("view-header");
		// The container div has a header element that needs to be accounted for
		let offsetHeaderHeight = 0;
		if (matchedClasses.length > 0) {
			offsetHeaderHeight = parseInt(
				getComputedStyle(matchedClasses[0]).height
			);
		}

		// Offset coordinates to be relative to container
		coords = this.offsetCoordsToContainer(coords, mdView.containerEl);

		const positionStyle: Partial<CSSStyleDeclaration> = {
			visibility: "visible",
		};

		positionStyle.maxWidth =
			popoverSettings.enableCustomSize && popoverSettings.maxWidth
				? `${popoverSettings.maxWidth}px`
				: `${parseInt(containerStyle.width) / 2}px`;
		if (this.shouldOpenToLeft(coords.left, containerStyle)) {
			positionStyle.right = `${
				parseInt(containerStyle.width) - coords.right
			}px`;
		} else {
			positionStyle.left = `200px`;
		}

		if (this.shouldOpenUpwards(coords.top, containerStyle)) {
			positionStyle.bottom = `${
				parseInt(containerStyle.height) - coords.top
			}px`;
			positionStyle.maxHeight =
				popoverSettings.enableCustomSize && popoverSettings.maxHeight
					? `${popoverSettings.maxHeight}px`
					: `${coords.top - offsetHeaderHeight}px`;
		} else {
			positionStyle.top = `${coords.bottom}px`;
			positionStyle.maxHeight =
				popoverSettings.enableCustomSize && popoverSettings.maxHeight
					? `${popoverSettings.maxHeight}px`
					: `${parseInt(containerStyle.height) - coords.bottom}px`;
		}

		this.mountedPopover.setCssStyles(positionStyle);
	}

	private unmount() {
		if (!this.mountedPopover) {
			console.log("Nothing to unmount, could not find popover element");
			return;
		}
		this.mountedPopover.remove();
		this.mountedPopover = undefined;

		this.unregisterClosePopoverListeners();
	}

	// This uses internal non-exposed codemirror API to get cursor coordinates
	// Cursor coordinates seem to be relative to viewport
	private getCursorCoords(): Coordinates {
		const editor = this.app.workspace.activeEditor?.editor;
		// @ts-ignore
		return editor?.cm?.coordsAtPos(
			editor?.posToOffset(editor?.getCursor()),
			-1
		);
	}

	private registerClosePopoverListeners() {
		this.getActiveView()?.containerEl.addEventListener(
			"keypress",
			this.close
		);
		this.getActiveView()?.containerEl.addEventListener(
			"click",
			this.clickClose
		);

		if (this.cmEditor) {
			this.cmEditor.on("vim-keypress", this.close);
		}
		const scroller = this.getCmScroller();
		if (scroller) {
			scroller.addEventListener("scroll", this.close);
		}
	}

	private unregisterClosePopoverListeners() {
		this.getActiveView()?.containerEl.removeEventListener(
			"keypress",
			this.close
		);
		this.getActiveView()?.containerEl.removeEventListener(
			"click",
			this.clickClose
		);

		if (this.cmEditor) {
			this.cmEditor.off("vim-keypress", this.close);
		}
		const scroller = this.getCmScroller();
		if (scroller) {
			scroller.removeEventListener("scroll", this.close);
		}
	}

	private getCmScroller() {
		const scroller = document.getElementsByClassName("cm-scroller");
		if (scroller.length > 0) {
			return scroller[0];
		}
	}

	getPopoverElement() {
		return document.getElementById("definition-popover");
	}

	private getActiveView() {
		return this.app.workspace.getActiveViewOfType(MarkdownView);
	}
}
