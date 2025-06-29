import { Plugin, PluginSettingTab, Setting } from "obsidian";

export const DEFAULT_SETTINGS: Partial<Settings> = {
	defPopoverConfig: {
		displayAliases: true,
		displayScope: false,
		enableCustomSize: false,
		maxWidth: 150,
		maxHeight: 150,
	},
};

export class SettingsTab extends PluginSettingTab {
	plugin: Plugin;
	settings: Settings;
	saveCallback: () => Promise<void>;

	constructor(app: App, plugin: Plugin, saveCallback: () => Promise<void>) {
		super(app, plugin);
		this.plugin = plugin;
		this.settings = window.defSettings;
		this.saveCallback = saveCallback;
	}

	display(): void {
		let { containerEl } = this;

		containerEl.empty();

		new Setting(containerEl).setHeading().setName("定义弹窗设置");

		new Setting(containerEl)
			.setName("显示定义别名")
			.addToggle((component) => {
				component.setValue(
					this.settings.defPopoverConfig.displayAliases
				);
				component.onChange(async (value) => {
					this.settings.defPopoverConfig.displayAliases = value;
					await this.saveCallback();
				});
			});

		new Setting(containerEl)
			.setName("显示定义作用域")
			.addToggle((component) => {
				component.setValue(this.settings.defPopoverConfig.displayScope);
				component.onChange(async (value) => {
					this.settings.defPopoverConfig.displayScope = value;
					await this.saveCallback();
				});
			});

		new Setting(containerEl)
			.setName("自定义弹窗大小")
			.setDesc(
				"自定义弹窗的最大大小。不推荐，因为它会阻止根据视口动态调整弹窗大小。"
			)
			.addToggle((component) => {
				component.setValue(
					this.settings.defPopoverConfig.enableCustomSize
				);
				component.onChange(async (value) => {
					this.settings.defPopoverConfig.enableCustomSize = value;
					await this.saveCallback();
					this.display();
				});
			});

		if (this.settings.defPopoverConfig.enableCustomSize) {
			new Setting(containerEl)
				.setName("弹窗宽度 (px)")
				.setDesc("定义弹窗的最大宽度")
				.addSlider((component) => {
					component.setLimits(150, window.innerWidth, 1);
					component.setValue(this.settings.defPopoverConfig.maxWidth);
					component.setDynamicTooltip();
					component.onChange(async (val) => {
						this.settings.defPopoverConfig.maxWidth = val;
						await this.saveCallback();
					});
				});

			new Setting(containerEl)
				.setName("弹窗高度 (px)")
				.setDesc("定义弹窗的最大高度")
				.addSlider((component) => {
					component.setLimits(150, window.innerHeight, 1);
					component.setValue(
						this.settings.defPopoverConfig.maxHeight
					);
					component.setDynamicTooltip();
					component.onChange(async (val) => {
						this.settings.defPopoverConfig.maxHeight = val;
						await this.saveCallback();
					});
				});
		}
	}
}
