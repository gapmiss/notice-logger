import { App, Plugin, PluginManifest, PluginSettingTab, Setting } from 'obsidian';

interface NoticeLoggerSettings {
	prefix: string;
}

const DEFAULT_SETTINGS: NoticeLoggerSettings = {
	prefix: ''
}

export default class NoticeLoggerPlugin extends Plugin {
	settings: NoticeLoggerSettings;
  manifest: PluginManifest;
  plugin: NoticeLoggerPlugin;
	private observers: MutationObserver[] = [];

  constructor(app: App, manifest: PluginManifest) {
    super(app, manifest);
  }

	async onload() {
		
		await this.loadSettings();
		
		// https://bobbyhadz.com/blog/detect-when-element-is-added-or-removed-from-dom-using-javascript
		const startObserving = (domNode: Node, classToLookFor: string, settings: NoticeLoggerSettings) => {
			const observer = new MutationObserver(mutations => {
				mutations.forEach(function (mutation) {

					const elementAdded = Array.from(mutation.addedNodes).some(
						element => {
							if ((element as Element).classList) {
								if ((element as Element).classList.contains(classToLookFor)) {
									return true;
								}
							} else {
								return false;
							}
						},
					);

					if (elementAdded) {
						mutation.addedNodes.forEach((notice) => {
							console.log(
								(settings.prefix !== '') 
									? settings.prefix + ' ' + notice.textContent 
									: '' + notice.textContent
							);
						});
					}		

				});
			});
		
			observer.observe(domNode, {
				childList: true,
				attributes: true,
				characterData: true,
				subtree: true,
			});

			this.observers.push(observer);

			return observer;
		};

		// 
		const parent = document.querySelector('body') as Node;
		
		startObserving(parent, 'notice', this.settings);

		this.addSettingTab(new NoticeLoggerSettingTab(this.app, this));

		console.log('Notice logger plugin loaded');
	}

	onunload() {
		// https://developer.mozilla.org/en-US/docs/Web/API/MutationObserver/disconnect
		// https://github.com/mdelobelle/obsidian_supercharged_links/blob/230ca9788a85622bd7abe5d45d3b57fd5869f2ce/main.ts#L220
		this.observers.forEach((obs) => {
			obs.disconnect();
		});
		console.log('Notice logger plugin unloaded');
	}

	async loadSettings() {
		this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData());
	}

	async saveSettings() {
		await this.saveData(this.settings);
	}

}

class NoticeLoggerSettingTab extends PluginSettingTab {
	plugin: NoticeLoggerPlugin;

	constructor(app: App, plugin: NoticeLoggerPlugin) {
		super(app, plugin);
		this.plugin = plugin;
	}

	display(): void {
		const {containerEl} = this;

		containerEl.empty();

		new Setting(containerEl)
			.setName('Prefix')
			.setDesc('Prepend console log lines with this string. (i.e. ✅)')
			.addText(text => text
				.setPlaceholder('Enter your prefix')
				.setValue(this.plugin.settings.prefix)
				.onChange(async (value) => {
					this.plugin.settings.prefix = value;
					await this.plugin.saveSettings();
				}));
	}
}
