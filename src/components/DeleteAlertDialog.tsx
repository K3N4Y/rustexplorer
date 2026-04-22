import React from 'react';
import { TriangleAlert } from 'lucide-react';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogMedia,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import type { FileItem } from './file-types';

interface DeleteAlertDialogProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  fileToDelete: FileItem | null;
  onConfirm: () => void;
}

export const DeleteAlertDialog: React.FC<DeleteAlertDialogProps> = ({
  isOpen,
  onOpenChange,
  fileToDelete,
  onConfirm,
}) => {
  return (
    <AlertDialog open={isOpen} onOpenChange={onOpenChange}>
      <AlertDialogContent size="sm">
        <AlertDialogHeader>
          <AlertDialogMedia>
            <TriangleAlert className="h-5 w-5 text-destructive" />
          </AlertDialogMedia>
          <AlertDialogTitle>
            Eliminar {fileToDelete?.isDirectory ? 'carpeta' : 'archivo'}
          </AlertDialogTitle>
          <AlertDialogDescription>
            {fileToDelete?.isDirectory
              ? `Se eliminara "${fileToDelete?.name}" y todo su contenido. Esta accion no se puede deshacer.`
              : `Se eliminara "${fileToDelete?.name}". Esta accion no se puede deshacer.`}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel onClick={() => onOpenChange(false)}>
            Cancelar
          </AlertDialogCancel>
          <AlertDialogAction variant="destructive" onClick={onConfirm}>
            Eliminar
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
};
