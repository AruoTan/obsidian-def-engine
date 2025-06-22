import { PluginSpec, ViewPlugin } from "@codemirror/view";
import LiveDecorator from "./live";
import ReadDecorator from "./read";

const pluginSpec: PluginSpec<LiveDecorator> = {
	decorations: (value: LiveDecorator) => value.decorations,
};

const LiveViewPlugin = ViewPlugin.fromClass(LiveDecorator, pluginSpec);

export { LiveViewPlugin, ReadDecorator };
