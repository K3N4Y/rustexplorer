import type { Tag } from "@/lib/workspace-provider";

interface TagChipsProps {
  tags: Tag[];
  max?: number;
}

export function TagChips({ tags, max = 3 }: TagChipsProps) {
  if (tags.length === 0) return null;

  const visible = tags.slice(0, max);
  const remaining = tags.slice(max);
  const remainingNames = remaining.map((t) => t.name).join(", ");

  return (
    <div className="flex flex-wrap items-center gap-1">
      {visible.map((tag) => (
        <span
          key={tag.id}
          className="inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-medium text-white"
          style={{ backgroundColor: tag.color }}
        >
          {tag.name}
        </span>
      ))}
      {remaining.length > 0 && (
        <span
          className="inline-flex items-center rounded-full bg-muted px-2 py-0.5 text-[11px] font-medium text-muted-foreground"
          title={remainingNames}
        >
          +{remaining.length}
        </span>
      )}
    </div>
  );
}
