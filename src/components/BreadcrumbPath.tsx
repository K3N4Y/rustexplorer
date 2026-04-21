import React from 'react';
import { ChevronRight, House } from 'lucide-react';

interface BreadcrumbItem {
  label: string;
  path: string;
}

interface BreadcrumbPathProps {
  currentPath: string;
  onNavigate: (path: string) => Promise<void>;
}

function buildBreadcrumbItems(path: string): BreadcrumbItem[] {
  const normalized = path.trim();

  if (!normalized || normalized === '/') {
    return [{ label: 'Root', path: '/' }];
  }

  const parts = normalized.split(/[\\/]+/).filter(Boolean);

  if (parts.length === 0) {
    return [{ label: 'Root', path: '/' }];
  }

  if (parts[0].endsWith(':')) {
    const drive = parts[0];
    const items: BreadcrumbItem[] = [{ label: drive, path: `${drive}\\` }];

    let current = `${drive}\\`;
    for (let index = 1; index < parts.length; index += 1) {
      const segment = parts[index];
      current = `${current}${segment}\\`;
      items.push({
        label: segment,
        path: current.replace(/[\\/]+$/, ''),
      });
    }

    return items;
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

const BreadcrumbPath: React.FC<BreadcrumbPathProps> = ({ currentPath, onNavigate }) => {
  const items = React.useMemo(() => buildBreadcrumbItems(currentPath), [currentPath]);

  return (
    <nav className="px-4 py-3 border-b border-border bg-transparent" aria-label="Breadcrumb">
      <ol className="flex items-center gap-1 text-sm text-muted-foreground overflow-x-auto whitespace-nowrap">
        <li>
          <button
            type="button"
            onClick={() => {
              void onNavigate(items[0].path);
            }}
            className="inline-flex items-center rounded-md px-2 py-1 hover:bg-accent hover:text-accent-foreground transition-colors"
            title={items[0].path}
          >
            <House className="h-4 w-4" aria-hidden="true" />
          </button>
        </li>

        {items.slice(1).map((item, index) => {
          const isLast = index === items.length - 2;

          return (
            <li key={item.path} className="inline-flex items-center gap-1">
              <ChevronRight className="h-4 w-4 text-muted-foreground/50" aria-hidden="true" />
              <button
                type="button"
                onClick={() => {
                  void onNavigate(item.path);
                }}
                disabled={isLast}
                className={`rounded-md px-2 py-1 transition-colors ${
                  isLast
                    ? 'text-foreground font-medium cursor-default'
                    : 'hover:bg-accent hover:text-accent-foreground'
                }`}
                title={item.path}
              >
                {item.label}
              </button>
            </li>
          );
        })}
      </ol>
    </nav>
  );
};

export default BreadcrumbPath;
