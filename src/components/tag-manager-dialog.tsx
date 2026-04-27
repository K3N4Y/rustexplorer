import { useState, useCallback } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useWorkspaces } from "@/hooks/use-workspaces";
import type { Tag } from "@/lib/workspace-provider";

interface TagManagerDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function TagManagerDialog({
  open,
  onOpenChange,
}: TagManagerDialogProps) {
  const { tags, createTag, renameTag, changeTagColor, deleteTag } =
    useWorkspaces();
  const [newName, setNewName] = useState("");
  const [newColor, setNewColor] = useState("#3b82f6");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");
  const [editColor, setEditColor] = useState("");

  const startEditing = useCallback((tag: Tag) => {
    setEditingId(tag.id);
    setEditName(tag.name);
    setEditColor(tag.color);
  }, []);

  const cancelEditing = useCallback(() => {
    setEditingId(null);
    setEditName("");
    setEditColor("");
  }, []);

  const handleCreate = useCallback(
    (e: React.FormEvent) => {
      e.preventDefault();
      const trimmed = newName.trim();
      if (!trimmed) return;
      void createTag(trimmed, newColor);
      setNewName("");
      setNewColor("#3b82f6");
    },
    [newName, newColor, createTag]
  );

  const handleSaveEdit = useCallback(
    (tagId: string) => {
      const trimmed = editName.trim();
      if (!trimmed) return;
      const existing = tags.find((t) => t.id === tagId);
      if (!existing) return;
      if (trimmed !== existing.name) {
        void renameTag(tagId, trimmed);
      }
      if (editColor !== existing.color) {
        void changeTagColor(tagId, editColor);
      }
      setEditingId(null);
    },
    [editName, editColor, tags, renameTag, changeTagColor]
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Manage Tags</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleCreate} className="space-y-4 py-4">
          <div className="space-y-2">
            <label className="font-mono text-[11px] font-bold uppercase tracking-[0.08em] text-muted-foreground">
              New Tag
            </label>
            <div className="flex items-center gap-2">
              <input
                type="color"
                value={newColor}
                onChange={(e) => setNewColor(e.target.value)}
                className="h-8 w-8 shrink-0 cursor-pointer rounded border-0 bg-transparent p-0"
              />
              <Input
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                placeholder="Tag name"
                className="flex-1"
              />
              <Button type="submit" size="sm" disabled={!newName.trim()}>
                Add
              </Button>
            </div>
          </div>
        </form>
        <div className="space-y-1">
          <label className="font-mono text-[11px] font-bold uppercase tracking-[0.08em] text-muted-foreground">
            Existing Tags
          </label>
          {tags.length === 0 && (
            <p className="py-2 text-[12px] text-muted-foreground">
              No tags yet
            </p>
          )}
          <div className="space-y-1">
            {tags.map((tag) => (
              <div
                key={tag.id}
                className="flex items-center gap-2 rounded-md px-2 py-1.5"
              >
                {editingId === tag.id ? (
                  <>
                    <input
                      type="color"
                      value={editColor}
                      onChange={(e) => setEditColor(e.target.value)}
                      className="h-6 w-6 shrink-0 cursor-pointer rounded border-0 bg-transparent p-0"
                    />
                    <Input
                      value={editName}
                      onChange={(e) => setEditName(e.target.value)}
                      className="h-8 flex-1 text-[13px]"
                      autoFocus
                    />
                    <Button
                      type="button"
                      size="xs"
                      onClick={() => handleSaveEdit(tag.id)}
                    >
                      Save
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      size="xs"
                      onClick={cancelEditing}
                    >
                      Cancel
                    </Button>
                  </>
                ) : (
                  <>
                    <span
                      className="h-3 w-3 shrink-0 rounded-full"
                      style={{ backgroundColor: tag.color }}
                    />
                    <span className="flex-1 text-[13px]">{tag.name}</span>
                    <Button
                      type="button"
                      variant="ghost"
                      size="xs"
                      onClick={() => startEditing(tag)}
                    >
                      Edit
                    </Button>
                    <Button
                      type="button"
                      variant="destructive"
                      size="xs"
                      onClick={() => void deleteTag(tag.id)}
                    >
                      Delete
                    </Button>
                  </>
                )}
              </div>
            ))}
          </div>
        </div>
        <div className="flex justify-end pt-4">
          <Button type="button" onClick={() => onOpenChange(false)}>
            Done
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
