import { useState, useCallback, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useWorkspaces } from "@/hooks/use-workspaces";
import type { AppData } from "@/lib/workspace-provider";

interface CreateWorkspaceDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  initialName?: string;
  initialColor?: string;
  onSubmit?: (name: string) => void;
  onCreated?: (data: AppData | undefined) => void;
}

export function CreateWorkspaceDialog({
  open,
  onOpenChange,
  initialName = "",
  initialColor = "",
  onSubmit,
  onCreated,
}: CreateWorkspaceDialogProps) {
  const { createWorkspace } = useWorkspaces();
  const [name, setName] = useState(initialName);
  const [color, setColor] = useState(initialColor);
  const isRename = !!onSubmit;

  useEffect(() => {
    if (open) {
      setName(initialName);
      setColor(initialColor);
    }
  }, [open, initialName, initialColor]);

  const handleSubmit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      const trimmed = name.trim();
      if (!trimmed) return;

      if (isRename) {
        onSubmit?.(trimmed);
      } else {
        const data = await createWorkspace(trimmed, color || undefined);
        onCreated?.(data);
      }
      onOpenChange(false);
    },
    [name, color, isRename, onSubmit, onCreated, createWorkspace, onOpenChange]
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>
              {isRename ? "Rename Workspace" : "Create Workspace"}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <label
                htmlFor="workspace-name"
                className="font-mono text-[11px] font-bold uppercase tracking-[0.08em] text-muted-foreground"
              >
                Name
              </label>
              <Input
                id="workspace-name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Workspace name"
                autoFocus
              />
            </div>
            {!isRename && (
              <div className="space-y-2">
                <label
                  htmlFor="workspace-color"
                  className="font-mono text-[11px] font-bold uppercase tracking-[0.08em] text-muted-foreground"
                >
                  Color
                </label>
                <div className="flex items-center gap-3">
                  <input
                    id="workspace-color"
                    type="color"
                    value={color || "#3b82f6"}
                    onChange={(e) => setColor(e.target.value)}
                    className="h-8 w-8 cursor-pointer rounded border-0 bg-transparent p-0"
                  />
                  <span className="text-[12px] text-muted-foreground">
                    {color || "None"}
                  </span>
                  {color && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="xs"
                      onClick={() => setColor("")}
                    >
                      Clear
                    </Button>
                  )}
                </div>
              </div>
            )}
          </div>
          <div className="flex justify-end gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={!name.trim()}>
              {isRename ? "Rename" : "Create"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
