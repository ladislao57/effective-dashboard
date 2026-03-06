import { App, PluginSettingTab, Setting } from "obsidian";
import type MinimalZenDashboardPlugin from "./main";

export interface ZenDashboardSettings {
  bannerImageUrl: string;
  fontFamily: string;
  primaryColor: string;
  secondaryColor: string;
  accentColor: string;
  surfaceColor: string;
  indexNotes: Record<string, string>;
  dailyNotesFolder: string;
  habitsEnabled: boolean;
  calendarEnabled: boolean;
  graphEnabled: boolean;
}

export const DEFAULT_SETTINGS: ZenDashboardSettings = {
  bannerImageUrl:
    "https://images.unsplash.com/photo-1469474968028-56623f02e42e?auto=format&fit=crop&w=1600&q=80",
  fontFamily: '"Noto Sans", sans-serif',
  primaryColor: "#2f5d3a",
  secondaryColor: "#1e2f25",
  accentColor: "#3c7a53",
  surfaceColor: "#e8efe9",
  indexNotes: {
    Inbox: "Inbox.md",
    Areas: "areas.md",
    Projects: "projects.md",
    Resources: "resources.md",
    Archives: "archives.md",
    People: "people.md"
  },
  dailyNotesFolder: "Daily",
  habitsEnabled: true,
  calendarEnabled: true,
  graphEnabled: true
};

export class ZenDashboardSettingTab extends PluginSettingTab {
  plugin: MinimalZenDashboardPlugin;

  constructor(app: App, plugin: MinimalZenDashboardPlugin) {
    super(app, plugin);
    this.plugin = plugin;
  }

  display(): void {
    const { containerEl } = this;
    containerEl.empty();

    containerEl.createEl("h2", { text: "Minimal Zen Dashboard Settings" });

    new Setting(containerEl)
      .setName("Banner image URL")
      .setDesc("A calm forest (or any) image URL for the dashboard header banner.")
      .addText((text) =>
        text
          .setPlaceholder("https://...")
          .setValue(this.plugin.settings.bannerImageUrl)
          .onChange((value) => this.updateSetting(() => (this.plugin.settings.bannerImageUrl = value.trim())))
      );

    new Setting(containerEl)
      .setName("Font family")
      .setDesc("Readable font stack used by the dashboard.")
      .addText((text) =>
        text
          .setValue(this.plugin.settings.fontFamily)
          .onChange((value) =>
            this.updateSetting(
              () =>
                (this.plugin.settings.fontFamily = value.trim() || DEFAULT_SETTINGS.fontFamily)
            )
          )
      );

    this.addColorSetting(containerEl, "Primary color", "primaryColor");
    this.addColorSetting(containerEl, "Secondary color", "secondaryColor");
    this.addColorSetting(containerEl, "Accent color", "accentColor");
    this.addColorSetting(containerEl, "Surface color", "surfaceColor");

    new Setting(containerEl)
      .setName("Daily notes folder")
      .setDesc("Folder containing daily notes in YYYY-MM-DD format.")
      .addText((text) =>
        text
          .setValue(this.plugin.settings.dailyNotesFolder)
          .onChange((value) => this.updateSetting(() => (this.plugin.settings.dailyNotesFolder = value.trim())))
      );

    this.addToggleSetting(containerEl, "Show calendar widget", "calendarEnabled");
    this.addToggleSetting(containerEl, "Show habits widget", "habitsEnabled");
    this.addToggleSetting(containerEl, "Show mini graph widget", "graphEnabled");

    containerEl.createEl("h3", { text: "Index note mapping" });
    containerEl.createEl("p", {
      text: "Each section reads wiki-links only from the configured index note file."
    });

    Object.entries(this.plugin.settings.indexNotes).forEach(([section, path]) => {
      new Setting(containerEl)
        .setName(`${section} index note`)
        .setDesc("Path to markdown file that contains [[links]].")
        .addText((text) =>
          text
            .setValue(path)
            .onChange((value) => this.updateSetting(() => (this.plugin.settings.indexNotes[section] = value.trim())))
        );
    });
  }

  private addColorSetting(
    containerEl: HTMLElement,
    name: string,
    key: "primaryColor" | "secondaryColor" | "accentColor" | "surfaceColor"
  ) {
    new Setting(containerEl)
      .setName(name)
      .addColorPicker((picker) =>
        picker
          .setValue(this.plugin.settings[key])
          .onChange((value) => this.updateSetting(() => (this.plugin.settings[key] = value)))
      );
  }

  private addToggleSetting(
    containerEl: HTMLElement,
    name: string,
    key: "calendarEnabled" | "habitsEnabled" | "graphEnabled"
  ) {
    new Setting(containerEl).setName(name).addToggle((toggle) =>
      toggle
        .setValue(this.plugin.settings[key])
        .onChange((value) => this.updateSetting(() => (this.plugin.settings[key] = value)))
    );
  }

  private updateSetting(mutator: () => void) {
    mutator();
    void this.plugin.saveSettings();
  }
}
