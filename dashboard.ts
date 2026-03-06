import {
  ItemView,
  Notice,
  TFile,
  WorkspaceLeaf,
  normalizePath,
  setIcon
} from "obsidian";
import type MinimalZenDashboardPlugin from "./main";
import { ParsedWikiLink, ensureFolderPath, findFileByLink, formatDate, getDailyFileForDate, getWeeklyHabitProgress, startOfWeek } from "./utils";

export const VIEW_TYPE_ZEN_DASHBOARD = "minimal-zen-dashboard-view";

const QUICK_LINK_SECTIONS = ["Inbox", "Projects", "Areas"] as const;

export class ZenDashboardView extends ItemView {
  plugin: MinimalZenDashboardPlugin;

  constructor(leaf: WorkspaceLeaf, plugin: MinimalZenDashboardPlugin) {
    super(leaf);
    this.plugin = plugin;
  }

  getViewType(): string {
    return VIEW_TYPE_ZEN_DASHBOARD;
  }

  getDisplayText(): string {
    return "Minimal Zen Dashboard";
  }

  getIcon(): string {
    return "layout-dashboard";
  }

  async onOpen(): Promise<void> {
    await this.render();
  }

  async refresh(): Promise<void> {
    await this.render();
  }

  private async render(): Promise<void> {
    const { contentEl } = this;
    contentEl.empty();
    contentEl.addClass("zen-dashboard-root");
    this.applyThemeVariables();

    const shell = contentEl.createDiv({ cls: "zen-dashboard-shell" });
    const mainColumn = shell.createDiv({ cls: "zen-dashboard-main" });
    const sidebarColumn = shell.createDiv({ cls: "zen-dashboard-sidebar" });

    this.renderTopBar(mainColumn);
    this.renderBanner(mainColumn);
    await this.renderFocusCard(mainColumn);
    await this.renderSectionCards(mainColumn);
    await this.renderWidgets(sidebarColumn);
  }

  private applyThemeVariables() {
    const { settings } = this.plugin;
    this.contentEl.style.setProperty("--zen-primary", settings.primaryColor);
    this.contentEl.style.setProperty("--zen-secondary", settings.secondaryColor);
    this.contentEl.style.setProperty("--zen-accent", settings.accentColor);
    this.contentEl.style.setProperty("--zen-surface", settings.surfaceColor);
    this.contentEl.style.setProperty("--zen-font", settings.fontFamily);
  }

  private renderTopBar(container: HTMLElement) {
    const bar = container.createDiv({ cls: "zen-topbar" });

    const searchInput = bar.createEl("input", {
      type: "search",
      cls: "zen-search",
      placeholder: "Quick search..."
    });
    searchInput.setAttr("aria-label", "Quick search notes");
    searchInput.addEventListener("keydown", (ev) => {
      if (ev.key !== "Enter") return;
      const query = (ev.currentTarget as HTMLInputElement).value.trim();

      if (!query) {
        this.plugin.app.commands.executeCommandById("switcher:open");
        return;
      }

      this.plugin.app.workspace.openLinkText(query, "", true);
    });

    const actions = bar.createDiv({ cls: "zen-actions" });
    this.addButton(actions, "+ New Note", () => this.createSimpleNote());
    this.addButton(actions, "Daily Note", () => this.createDatedNote("daily"));
    this.addButton(actions, "Weekly Note", () => this.createDatedNote("weekly"));
  }

  private renderBanner(container: HTMLElement) {
    const banner = container.createDiv({ cls: "zen-banner" });
    banner.style.backgroundImage = `linear-gradient(rgba(30,47,37,.34), rgba(30,47,37,.34)), url('${this.plugin.settings.bannerImageUrl}')`;

    const inner = banner.createDiv({ cls: "zen-banner__content" });
    inner.createEl("h1", { text: "Minimal Zen Dashboard" });
    inner.createEl("p", { text: "Calm structure for deep and meaningful work." });
  }

  private async renderFocusCard(container: HTMLElement) {
    const card = container.createDiv({ cls: "zen-card zen-focus" });
    card.createEl("h2", { text: "Focus Today" });

    const grid = card.createDiv({ cls: "zen-focus-grid" });
    await this.renderFocusTasks(grid.createDiv());
    this.renderFocusQuickLinks(grid.createDiv());
  }

  private async renderFocusTasks(container: HTMLElement) {
    container.createEl("h3", { text: "Top Tasks" });

    const todayFile = this.resolveTodayFile();
    if (!todayFile) {
      container.createEl("p", {
        text: "No daily note detected. Create one from the top bar to anchor your day.",
        cls: "zen-muted"
      });
      return;
    }

    const content = await this.plugin.app.vault.cachedRead(todayFile);
    const taskLines = content
      .split("\n")
      .filter((line) => /^- \[( |x)\]/.test(line))
      .slice(0, 6)
      .map((line) => line.replace(/^- \[( |x)\]\s*/, ""));

    if (taskLines.length === 0) {
      container.createEl("p", { text: "No tasks found yet in today's note.", cls: "zen-muted" });
      return;
    }

    const ul = container.createEl("ul", { cls: "zen-task-list" });
    taskLines.forEach((task) => ul.createEl("li", { text: task }));
  }

  private renderFocusQuickLinks(container: HTMLElement) {
    container.createEl("h3", { text: "Quick Links" });
    const quick = container.createDiv({ cls: "zen-quick-links" });

    QUICK_LINK_SECTIONS.forEach((section) => {
      const button = quick.createEl("button", { text: section, cls: "zen-pill" });
      button.addEventListener("click", async () => {
        const indexPath = this.plugin.settings.indexNotes[section];
        if (!indexPath) return;

        const file = this.plugin.app.vault.getAbstractFileByPath(normalizePath(indexPath));
        if (file instanceof TFile) {
          await this.plugin.app.workspace.getLeaf(true).openFile(file);
        }
      });
    });
  }

  private async renderSectionCards(container: HTMLElement) {
    const wrapper = container.createDiv({ cls: "zen-sections" });
    const sectionLinks = await this.plugin.dataStore.getSectionLinks(this.plugin.settings.indexNotes);

    Object.entries(this.plugin.settings.indexNotes).forEach(([section, indexPath]) => {
      const links = sectionLinks.get(section) ?? [];
      this.renderSectionCard(wrapper, section, indexPath, links);
    });
  }

  private renderSectionCard(
    container: HTMLElement,
    section: string,
    indexPath: string,
    links: ParsedWikiLink[]
  ) {
    const card = container.createDiv({ cls: "zen-card zen-collapsible" });
    const head = card.createDiv({ cls: "zen-collapsible__head" });
    const body = card.createDiv({ cls: "zen-collapsible__body" });

    head.tabIndex = 0;
    head.setAttribute("role", "button");
    head.setAttribute("aria-expanded", "false");
    head.createEl("h3", { text: section });

    const icon = head.createSpan({ cls: "zen-chevron" });
    setIcon(icon, "chevron-down");

    body.hide();
    if (links.length === 0) {
      body.createEl("p", {
        text: `No links found in ${indexPath}. Add wiki-links like [[Health]] to populate this section.`,
        cls: "zen-muted"
      });
    } else {
      const list = body.createEl("ul", { cls: "zen-link-list" });
      links.forEach((link) => {
        const li = list.createEl("li");
        const button = li.createEl("button", { cls: "zen-link-button", text: link.display });
        button.addEventListener("click", () => void this.openLink(link.target));
      });
    }

    const toggle = () => {
      const expanded = head.getAttribute("aria-expanded") === "true";
      head.setAttribute("aria-expanded", String(!expanded));
      card.toggleClass("is-open", !expanded);
      if (expanded) body.hide();
      else body.show();
    };

    head.addEventListener("click", toggle);
    head.addEventListener("keydown", (ev) => {
      if (ev.key === "Enter" || ev.key === " ") {
        ev.preventDefault();
        toggle();
      }
    });
  }

  private async openLink(linkTarget: string) {
    const file = findFileByLink(this.plugin.app, linkTarget);
    if (!file) {
      new Notice(`Could not resolve link: ${linkTarget}`);
      return;
    }

    await this.plugin.app.workspace.getLeaf(true).openFile(file);
  }

  private async renderWidgets(container: HTMLElement) {
    if (this.plugin.settings.calendarEnabled) this.renderCalendarWidget(container);
    if (this.plugin.settings.habitsEnabled) await this.renderHabitsWidget(container);
    if (this.plugin.settings.graphEnabled) await this.renderGraphWidget(container);
  }

  private renderCalendarWidget(container: HTMLElement) {
    const card = container.createDiv({ cls: "zen-card zen-widget" });
    card.createEl("h3", { text: "Calendar" });

    const now = new Date();
    card.createEl("p", { text: `Today: ${formatDate(now)}` });

    const weekStart = startOfWeek(now);
    const days = card.createDiv({ cls: "zen-calendar-days" });

    for (let i = 0; i < 7; i++) {
      const date = new Date(weekStart);
      date.setDate(weekStart.getDate() + i);
      const isToday = date.toDateString() === now.toDateString();
      days.createEl("span", {
        cls: isToday ? "zen-day is-today" : "zen-day",
        text: date.toLocaleDateString(undefined, { weekday: "short" })
      });
    }
  }

  private async renderHabitsWidget(container: HTMLElement) {
    const card = container.createDiv({ cls: "zen-card zen-widget" });
    card.createEl("h3", { text: "Habits Tracker (7 days)" });

    const progress = await getWeeklyHabitProgress(
      this.plugin.app,
      this.plugin.settings.dailyNotesFolder
    );

    const list = card.createDiv({ cls: "zen-habit-list" });
    progress.forEach((item) => {
      const row = list.createDiv({ cls: "zen-habit-row" });
      row.createSpan({ text: item.key.replace(/_/g, " ") });

      const bar = row.createDiv({ cls: "zen-progress" });
      const fill = bar.createDiv({ cls: "zen-progress__fill" });
      const width = Math.round((item.average / 10) * 100);
      fill.style.width = `${width}%`;
      fill.setAttribute("aria-label", `${item.key} average ${width}%`);
      row.createEl("small", { text: `${width}%` });
    });
  }

  private async renderGraphWidget(container: HTMLElement) {
    const card = container.createDiv({ cls: "zen-card zen-widget" });
    card.createEl("h3", { text: "Mini Graph Preview" });

    const sectionLinks = await this.plugin.dataStore.getSectionLinks(this.plugin.settings.indexNotes);
    const entries = [...sectionLinks.entries()].map(([name, links]) => [name, links.length] as const);

    const max = Math.max(...entries.map(([, count]) => count), 1);
    const graph = card.createDiv({ cls: "zen-mini-graph" });

    entries.forEach(([name, count]) => {
      const row = graph.createDiv({ cls: "zen-graph-row" });
      row.createSpan({ text: name });
      const bar = row.createDiv({ cls: "zen-progress" });
      const fill = bar.createDiv({ cls: "zen-progress__fill" });
      fill.style.width = `${Math.round((count / max) * 100)}%`;
      row.createEl("small", { text: String(count) });
    });
  }

  private addButton(container: HTMLElement, text: string, onClick: () => Promise<void> | void) {
    const button = container.createEl("button", { text, cls: "zen-btn" });
    button.addEventListener("click", () => void onClick());
  }

  private async createSimpleNote() {
    const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
    const path = `Untitled-${timestamp}.md`;
    const file = await this.plugin.app.vault.create(path, "# New Note\n");
    await this.plugin.app.workspace.getLeaf(true).openFile(file);
  }

  private async createDatedNote(type: "daily" | "weekly") {
    const date = new Date().toISOString().slice(0, 10);
    const name = type === "daily" ? date : `Week-${date}`;
    const folder = this.plugin.settings.dailyNotesFolder || "";

    await ensureFolderPath(this.plugin.app, folder);

    const path = normalizePath(folder ? `${folder}/${name}.md` : `${name}.md`);
    let file = this.plugin.app.vault.getAbstractFileByPath(path);
    if (!(file instanceof TFile)) {
      file = await this.plugin.app.vault.create(path, `# ${name}\n\n`);
    }

    await this.plugin.app.workspace.getLeaf(true).openFile(file);
  }

  private resolveTodayFile(): TFile | null {
    return getDailyFileForDate(this.plugin.app, this.plugin.settings.dailyNotesFolder, new Date());
  }
}
