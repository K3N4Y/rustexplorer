interface BreadcrumbItem {
  label: string;
  path: string;
}

export function normalizeWindowsPath(path: string): string {
  // Strip Windows extended-length path prefix (\\?\)
  if (path.startsWith('\\\\?\\')) {
    return path.slice(4);
  }
  return path;
}

export function normalizePath(path: string): string {
  const trimmed = path.trim();

  if (!trimmed || trimmed === '/') {
    return trimmed;
  }

  let normalized = trimmed.replace(/\//g, '\\').replace(/\\+$/, '');
  normalized = normalizeWindowsPath(normalized);

  if (normalized.endsWith(':')) {
    return `${normalized}\\`;
  }

  return normalized;
}

export function getParentPath(path: string): string {
  const normalized = path.replace(/[\\/]+$/, '');
  const parts = normalized.split(/[\\/]+/);

  if (parts.length <= 1) {
    return path;
  }

  const lastSegment = parts.pop();
  if (!lastSegment) {
    return path;
  }

  if (parts.length === 1 && parts[0].endsWith(":")) {
    return `${parts[0]}\\`;
  }

  return parts.join('\\') || path;
}

export function getPathLabel(path: string): string {
  const normalized = path.replace(/[\\/]+$/, '');
  const parts = normalized.split(/[\\/]+/).filter(Boolean);
  return parts[parts.length - 1] ?? path;
}

export function getAncestorPaths(path: string): string[] {
  const normalized = normalizePath(path);
  const parts = normalized.split('\\').filter(Boolean);

  if (parts.length === 0) {
    return [];
  }

  if (parts[0]?.endsWith(':')) {
    const ancestors: string[] = [];
    let current = `${parts[0]}\\`;
    ancestors.push(current);

    for (let index = 1; index < parts.length; index += 1) {
      current = `${current}${parts[index]}\\`;
      ancestors.push(current.replace(/[\\/]+$/, ''));
    }

    return ancestors;
  }

  return [normalized];
}

export function buildBreadcrumbItems(path: string): BreadcrumbItem[] {
  const normalized = path.trim();

  if (!normalized || normalized === '/') {
    return [{ label: 'Root', path: '/' }];
  }

  const parts = normalized.split(/[\\/]+/).filter(Boolean);

  if (parts.length === 0) {
    return [{ label: 'Root', path: '/' }];
  }

  if (parts[0].endsWith(':')) {
    return getAncestorPaths(normalized).map((ancestor) => ({
      label: ancestor.endsWith('\\') ? ancestor.replace(/[\\/]+$/, '') : getPathLabel(ancestor),
      path: ancestor,
    }));
  }

  let current = '';

  return parts.map((segment) => {
    current += `/${segment}`;
    return {
      label: segment,
      path: current,
    };
  });
}
