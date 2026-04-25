import React from 'react';
import { ChevronRight, House } from 'lucide-react';
import { buildBreadcrumbItems } from '../lib/path-utils';

interface BreadcrumbPathProps {
  currentPath: string;
  onNavigate: (path: string) => Promise<void>;
  children?: React.ReactNode;
}

const BreadcrumbPath: React.FC<BreadcrumbPathProps> = ({ currentPath, onNavigate, children }) => {
  const items = React.useMemo(() => buildBreadcrumbItems(currentPath), [currentPath]);

  return (
    <nav className="flex items-center justify-between border-b border-border bg-transparent px-5 py-3" aria-label="Breadcrumb">
      <ol className="flex items-center gap-1 overflow-x-auto whitespace-nowrap font-mono text-[11px] font-bold uppercase tracking-[0.06em] text-muted-foreground">
        <li>
          <button
            type="button"
            onClick={() => {
              void onNavigate(items[0].path);
            }}
            className="inline-flex items-center rounded-md px-2 py-1 text-muted-foreground transition-colors hover:text-foreground"
            title={items[0].path}
          >
            <House className="h-3.5 w-3.5" aria-hidden="true" />
          </button>
        </li>

        {items.slice(1).map((item, index) => {
          const isLast = index === items.length - 2;

          return (
            <li key={item.path} className="inline-flex items-center gap-1">
              <ChevronRight className="h-3.5 w-3.5 text-muted-foreground/45" aria-hidden="true" />
              <button
                type="button"
                onClick={() => {
                  void onNavigate(item.path);
                }}
                disabled={isLast}
                className={`rounded-md px-2 py-1 transition-colors ${
                  isLast
                    ? 'cursor-default text-[12px] text-foreground'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
                title={item.path}
              >
                {item.label}
              </button>
            </li>
          );
        })}
      </ol>
      {children && <div className="flex-shrink-0 ml-4">{children}</div>}
    </nav>
  );
};

export default BreadcrumbPath;
