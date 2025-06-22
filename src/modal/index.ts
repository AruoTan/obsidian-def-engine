import AddDefModal from "./add-def-modal";
import EditDefModal from "./edit-def-modal";

type Mode = "add" | "edit";

type Modal = {
	add: AddDefModal;
	edit: EditDefModal;
};

export function DefModal<T extends Mode>(mode: T, app: App): Modal[T] {
	let modal;
	switch (mode) {
		case "add":
			modal = new AddDefModal(app);
			break;
		case "edit":
			modal = new EditDefModal(app);
			break;
	}
	return modal as Modal[T];
}
