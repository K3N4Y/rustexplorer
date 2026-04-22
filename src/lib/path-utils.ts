export function getParentPath(path: string): string {
  const normalized = path.replace(/[\\/]+$/, "");
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

  return parts.join("\\") || path;
}

export function getPathLabel(path: string): string {
  const normalized = path.replace(/[\\/]+$/, "");
  const parts = normalized.split(/[\\/]+/).filter(Boolean);
  return parts[parts.length - 1] ?? path;
}
