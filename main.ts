import { debounce, Plugin, TAbstractFile, WorkspaceLeaf } from "obsidian";
import {
  VIEW_TYPE_ZEN_DASHBOARD,
  ZenDashboardView
} from "./dashboard";
import { DashboardDataStore } from "./dashboard-data";
import {
  DEFAULT_SETTINGS,
  ZenDashboardSettingTab,
  ZenDashboardSettings
} from "./settings";

export default class MinimalZenDashboardPlugin extends Plugin {
  settings: ZenDashboardSettings;
  dataStore: DashboardDataStore;

  private readonly scheduleRefresh = debounce(
    () => void this.refreshDashboardView(),
    180,
    true
  );

  async onload() {
    await this.loadSettings();
    this.dataStore = new DashboardDataStore(this.app);

    this.registerView(
      VIEW_TYPE_ZEN_DASHBOARD,
      (leaf: WorkspaceLeaf) => new ZenDashboardView(leaf, this)
    );

    this.addRibbonIcon("layout-dashboard", "Open Minimal Zen Dashboard", () => {
      void this.activateView();
    });

    this.addCommand({
      id: "open-minimal-zen-dashboard",
      name: "Open Minimal Zen Dashboard",
      callback: () => void this.activateView()
    });

    this.addSettingTab(new ZenDashboardSettingTab(this.app, this));

    this.registerEvent(this.app.workspace.on("layout-change", this.scheduleRefresh));
    this.registerEvent(this.app.vault.on("create", this.onVaultUpdate));
    this.registerEvent(this.app.vault.on("modify", this.onVaultUpdate));
    this.registerEvent(this.app.vault.on("delete", this.onVaultDelete));
    this.registerEvent(this.app.vault.on("rename", this.onVaultRename));
    this.registerEvent(this.app.metadataCache.on("resolved", this.scheduleRefresh));
  }

  async onunload() {
    this.app.workspace.detachLeavesOfType(VIEW_TYPE_ZEN_DASHBOARD);
    this.scheduleRefresh.cancel();
  }

  async activateView() {
    const { workspace } = this.app;
    let leaf = workspace.getLeavesOfType(VIEW_TYPE_ZEN_DASHBOARD)[0];

    if (!leaf) {
      leaf = workspace.getRightLeaf(false);
      if (!leaf) return;
      await leaf.setViewState({
        type: VIEW_TYPE_ZEN_DASHBOARD,
        active: true
      });
    }

    workspace.revealLeaf(leaf);
  }

  async refreshDashboardView() {
    const leaves = this.app.workspace.getLeavesOfType(VIEW_TYPE_ZEN_DASHBOARD);
    await Promise.all(
      leaves.map(async (leaf) => {
        const view = leaf.view;
        if (view instanceof ZenDashboardView) {
          await view.refresh();
        }
      })
    );
  }

  async loadSettings() {
    this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData());
  }

  async saveSettings() {
    this.dataStore?.clearAllCaches();
    await this.saveData(this.settings);
    this.scheduleRefresh();
  }

  private readonly onVaultUpdate = (file: TAbstractFile) => {
    this.dataStore?.invalidatePath(file.path);
    this.scheduleRefresh();
  };

  private readonly onVaultDelete = (file: TAbstractFile) => {
    this.dataStore?.invalidatePath(file.path);
    this.scheduleRefresh();
  };

  private readonly onVaultRename = (file: TAbstractFile, oldPath: string) => {
    this.dataStore?.invalidatePath(oldPath);
    this.dataStore?.invalidatePath(file.path);
    this.scheduleRefresh();
  };
}
