import { App, Plugin, PluginSettingTab, Setting, moment, Notice } from 'obsidian';

interface NoticeLoggerSettings {
  enableLogging: boolean;
  prefix: string;
  timestamp: string;
}

const DEFAULT_SETTINGS: NoticeLoggerSettings = {
  enableLogging: true,
  prefix: '',
  timestamp: 'YYYY-MM-DD HH:mm:ss'
}

export default class NoticeLoggerPlugin extends Plugin {
  settings!: NoticeLoggerSettings;
  private observers: MutationObserver[] = [];

  async onload() {
    
    await this.loadSettings();

    this.addCommand({
      id: "enable-notice-logging",
      name: "Enable notice logging",
      callback: async () => {
        await this.enableLogging();
      },
    });

    this.addCommand({
      id: "disable-notice-logging",
      name: "Disable notice logging",
      callback: async () => {
        await this.disableLogging();
      },
    });
    
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
              if (settings.enableLogging) {
                let noticeLogItem: string = '';
                if (settings.prefix !== '') {
                  noticeLogItem += settings.prefix + ' ';
                }
                if (settings.timestamp !== '') {
                  noticeLogItem += '[' + (moment as unknown as () => { format: (f: string) => string })().format(settings.timestamp) + '] ';
                }
                noticeLogItem += notice.textContent;
                // eslint-disable-next-line no-console, obsidianmd/rule-custom-message -- logging notices to console is this plugin's core feature
                console.log(noticeLogItem);
              }
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

    const parent = activeDocument.querySelector('body') as Node;
    
    startObserving(parent, 'notice', this.settings);

    this.addSettingTab(new NoticeLoggerSettingTab(this.app, this));

  }

  onunload() {
    // https://developer.mozilla.org/en-US/docs/Web/API/MutationObserver/disconnect
    // https://github.com/mdelobelle/obsidian_supercharged_links/blob/230ca9788a85622bd7abe5d45d3b57fd5869f2ce/main.ts#L220
    this.observers.forEach((obs) => {
      obs.disconnect();
    });
  }

  async enableLogging() {
    this.settings.enableLogging = true;
    await this.saveSettings();
    new Notice("Notice logging enabled");
  }

  async disableLogging() {
    this.settings.enableLogging = false;
    await this.saveSettings();
    new Notice("Notice logging disabled");
  }

  async loadSettings() {
    this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData() as Partial<NoticeLoggerSettings>);
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
      .setName('Enable logging')
      .setDesc('')
      .addToggle((toggle) => {
        toggle
          .setValue(this.plugin.settings.enableLogging)
          .onChange(async newValue => {
            this.plugin.settings.enableLogging = newValue;
            await this.plugin.saveSettings();
          })
      })

    new Setting(containerEl)
      .setName('Prefix')
      .setDesc('Prepend console log lines with this string. Leave blank to disable. (e.g. ✅)')
      .addText(text => text
        .setPlaceholder('Enter your prefix')
        .setValue(this.plugin.settings.prefix)
        .onChange(async (value) => {
          this.plugin.settings.prefix = value;
          await this.plugin.saveSettings();
        }));

    const timestampSetting = new Setting(containerEl)
      .setName('Timestamp');

    const descEl = timestampSetting.descEl;
    descEl.appendText("Prepend console log lines with [timestamp]. Leave blank to disable.");
    descEl.createEl('br');
    descEl.appendText("Learn about available formatting tokens in the ");
    descEl.createEl("a", {
      href: "https://momentjs.com/docs/#/displaying/format/",
      text: "moment.js documentation",
      attr: { "aria-label": "moment.js format documentation", "data-tooltip-position": "top", "tabindex": '0' }
    });
    descEl.appendText(".");

    timestampSetting
      .addText(text => text
        .setPlaceholder('YYYY-MM-DD HH:mm:ss')
        .setValue(this.plugin.settings.timestamp)
        .onChange(async (value) => {
          this.plugin.settings.timestamp = value;
          await this.plugin.saveSettings();
        }));

  }
}
