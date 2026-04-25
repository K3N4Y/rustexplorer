import React from 'react';
import {
  ChevronDown,
  ChevronRight,
  Folder,
  FolderOpen,
  HardDrive,
  LoaderCircle,
  Monitor,
  Navigation,
  PanelTopOpen,
} from 'lucide-react';
import { SidebarContent, SidebarHeader } from './ui/sidebar';
import type { FileItem } from './file-types';
import { getAncestorPaths, getPathLabel, normalizePath } from '../lib/path-utils';

interface FileTreeSidebarProps {
  rootPath: string;
  currentPath: string;
  onNavigate: (path: string) => Promise<unknown>;
  onLoadFolder: (path: string) => Promise<FileItem[]>;
}

function getNodeName(path: string): string {
  return getPathLabel(normalizePath(path));
}

function isSelectedPath(path: string, currentPath: string): boolean {
  return normalizePath(path).toLowerCase() === normalizePath(currentPath).toLowerCase();
}

function getQuickAccessItems(rootPath: string, currentPath: string) {
  const root = normalizePath(rootPath);
  const current = normalizePath(currentPath);
  const parent = getAncestorPaths(current).slice(-2, -1)[0] ?? root;

  return [
    {
      label: 'Desktop',
      path: root,
      icon: Monitor,
    },
    {
      label: 'Current folder',
      path: current,
      icon: Navigation,
    },
    {
      label: 'Parent folder',
      path: parent,
      icon: PanelTopOpen,
    },
  ].filter((item, index, items) => items.findIndex((candidate) => candidate.path === item.path) === index);
}

const FileTreeSidebar: React.FC<FileTreeSidebarProps> = ({
  rootPath,
  currentPath,
  onNavigate,
  onLoadFolder,
}) => {
  const root = React.useMemo(() => normalizePath(rootPath), [rootPath]);
  const quickAccessItems = React.useMemo(
    () => getQuickAccessItems(rootPath, currentPath),
    [rootPath, currentPath],
  );
  const [expandedPaths, setExpandedPaths] = React.useState<Set<string>>(() => new Set([root]));
  const [directoriesByPath, setDirectoriesByPath] = React.useState<Record<string, FileItem[]>>({});
  const [loadingPaths, setLoadingPaths] = React.useState<Set<string>>(new Set());

  const ensureLoaded = React.useCallback(
    async (path: string) => {
      const normalized = normalizePath(path);

      if (directoriesByPath[normalized]) {
        return;
      }

      setLoadingPaths((prev) => {
        const next = new Set(prev);
        next.add(normalized);
        return next;
      });

      try {
        const items = await onLoadFolder(normalized);
        const onlyDirectories = items
          .filter((item) => item.isDirectory)
          .sort((left, right) => left.name.localeCompare(right.name));

        setDirectoriesByPath((prev) => ({
          ...prev,
          [normalized]: onlyDirectories,
        }));
      } catch (error) {
        console.error('Error loading tree node:', error);
      } finally {
        setLoadingPaths((prev) => {
          const next = new Set(prev);
          next.delete(normalized);
          return next;
        });
      }
    },
    [directoriesByPath, onLoadFolder],
  );

  React.useEffect(() => {
    void ensureLoaded(root);
  }, [root, ensureLoaded]);

  React.useEffect(() => {
    const ancestors = getAncestorPaths(currentPath);

    setExpandedPaths((prev) => {
      const next = new Set(prev);
      ancestors.forEach((ancestor) => next.add(normalizePath(ancestor)));
      return next;
    });

    ancestors.forEach((ancestor) => {
      void ensureLoaded(ancestor);
    });
  }, [currentPath, ensureLoaded]);

  const toggleExpand = async (path: string) => {
    const normalized = normalizePath(path);

    setExpandedPaths((prev) => {
      const next = new Set(prev);
      if (next.has(normalized)) {
        next.delete(normalized);
      } else {
        next.add(normalized);
      }
      return next;
    });

    await ensureLoaded(normalized);
  };

  const renderNode = (path: string, level: number) => {
    const normalized = normalizePath(path);
    const isExpanded = expandedPaths.has(normalized);
    const isLoading = loadingPaths.has(normalized);
    const children = directoriesByPath[normalized] ?? [];

    return (
      <div key={normalized}>
        <div
          className={`flex items-center gap-1 rounded-md px-2 py-1.5 text-[13px] transition-colors duration-200 ${
            isSelectedPath(normalized, currentPath)
              ? 'border-l-2 border-l-accent bg-muted text-foreground'
              : 'text-muted-foreground hover:bg-muted hover:text-foreground'
          }`}
          style={{ paddingLeft: `${8 + level * 14}px` }}
        >
          <button
            type="button"
            onClick={() => {
              void toggleExpand(normalized);
            }}
            className="inline-flex h-5 w-5 items-center justify-center rounded text-muted-foreground hover:text-foreground"
            aria-label={isExpanded ? 'Collapse folder' : 'Expand folder'}
          >
            {isExpanded ? (
              <ChevronDown className="h-4 w-4" aria-hidden="true" />
            ) : (
              <ChevronRight className="h-4 w-4" aria-hidden="true" />
            )}
          </button>

          <button
            type="button"
            onClick={() => {
              void onNavigate(normalized);
            }}
            className="flex min-w-0 flex-1 items-center gap-2 rounded px-1 py-0.5 text-left"
            title={normalized}
          >
            {isExpanded ? (
              <FolderOpen className="h-4 w-4 text-foreground" aria-hidden="true" />
            ) : (
              <Folder className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
            )}
            <span className="truncate leading-none">{getNodeName(normalized)}</span>
          </button>
        </div>

        {isExpanded && (
          <div>
            {isLoading && (
              <div
                className="flex items-center gap-2 px-2 py-1 font-mono text-[11px] font-bold uppercase tracking-[0.08em] text-muted-foreground"
                style={{ paddingLeft: `${22 + level * 14}px` }}
              >
                <LoaderCircle className="h-3.5 w-3.5 animate-spin" aria-hidden="true" />
                Loading folders...
              </div>
            )}

            {!isLoading && children.length === 0 && (
              <div
                className="px-2 py-1 font-mono text-[11px] font-bold uppercase tracking-[0.08em] text-muted-foreground"
                style={{ paddingLeft: `${22 + level * 14}px` }}
              >
                Empty
              </div>
            )}

            {!isLoading &&
              children.map((child) => renderNode(child.path, level + 1))}
          </div>
        )}
      </div>
    );
  };

  return (
    <>
      <SidebarHeader>
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <HardDrive className="h-4 w-4 text-foreground" aria-hidden="true" />
            <span className="font-mono text-[11px] font-bold uppercase tracking-[0.12em] text-foreground">File Tree</span>
          </div>

          <div className="space-y-1">
            <p className="px-2 font-mono text-[11px] font-bold uppercase tracking-[0.08em] text-muted-foreground">
              Quick Access
            </p>
            {quickAccessItems.map((item) => {
              const Icon = item.icon;
              const selected = isSelectedPath(item.path, currentPath);

              return (
                <button
                  key={item.path}
                  type="button"
                  onClick={() => {
                    void onNavigate(item.path);
                  }}
                  className={`flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-[13px] transition-colors duration-200 ${
                    selected
                      ? 'border-l-2 border-l-accent bg-muted text-foreground'
                      : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                  }`}
                  title={item.path}
                >
                  <Icon className="h-4 w-4" aria-hidden="true" />
                  <span className="truncate">{item.label}</span>
                </button>
              );
            })}
          </div>
        </div>
      </SidebarHeader>

      <SidebarContent>{renderNode(root, 0)}</SidebarContent>
    </>
  );
};

export default FileTreeSidebar;
