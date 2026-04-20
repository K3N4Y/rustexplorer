export interface FileItem {
  name: string;
  path: string;
  size: number;
  modified: string | null;
  isDirectory: boolean;
}
