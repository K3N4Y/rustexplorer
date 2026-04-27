type CommandCategory =
  | "Navigation"
  | "File Operations"
  | "Dual Pane"
  | "Search"
  | "Git"
  | "Settings"
  | (string & {});

export interface Command {
  id: string;
  label: string;
  description?: string;
  icon?: string; // Lucide icon name
  keywords: string[];
  category: CommandCategory;
  shortcut?: string; // Display-only, e.g., "Ctrl+P"
  action: () => void | Promise<void>;
  isEnabled?: () => boolean;
}
