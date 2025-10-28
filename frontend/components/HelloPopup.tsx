"use client";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

interface HelloPopupProps {
  open: boolean;
  onClose: () => void;
}

export function HelloPopup({ open, onClose }: HelloPopupProps) {
  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="text-center text-2xl font-bold">
            Hello! 👋
          </DialogTitle>
        </DialogHeader>
        <div className="flex flex-col items-center justify-center py-4">
          <div className="text-lg text-muted-foreground">
            You pressed Ctrl+P!
          </div>
          <div className="mt-2 text-sm text-muted-foreground">
            This popup appears when you press Ctrl+P anywhere on the page.
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
