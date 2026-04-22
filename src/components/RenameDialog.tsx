import React from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import type { FileItem } from './file-types';

interface RenameDialogProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  fileToRename: FileItem | null;
  newFileName: string;
  setNewFileName: (name: string) => void;
  onSubmit: (e: React.FormEvent) => void;
}

export const RenameDialog: React.FC<RenameDialogProps> = ({
  isOpen,
  onOpenChange,
  fileToRename,
  newFileName,
  setNewFileName,
  onSubmit,
}) => {
  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>
            Renombrar {fileToRename?.isDirectory ? 'carpeta' : 'archivo'}
          </DialogTitle>
          <DialogDescription>
            Introduce el nuevo nombre para "{fileToRename?.name}".
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={onSubmit}>
          <div className="grid gap-4 py-4">
            <Input
              id="name"
              value={newFileName}
              onChange={(e) => setNewFileName(e.target.value)}
              autoFocus
              className="col-span-3"
            />
          </div>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
            >
              Cancelar
            </Button>
            <Button
              type="submit"
              disabled={!newFileName.trim() || newFileName === fileToRename?.name}
            >
              Guardar
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};
