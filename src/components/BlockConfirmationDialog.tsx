import React from 'react'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { UserX, AlertTriangle } from 'lucide-react'

interface BlockConfirmationDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  userName: string
  onConfirm: () => void
  loading?: boolean
}

const BlockConfirmationDialog: React.FC<BlockConfirmationDialogProps> = ({
  open,
  onOpenChange,
  userName,
  onConfirm,
  loading = false
}) => {
  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center">
              <UserX className="h-6 w-6 text-red-600" />
            </div>
            <div>
              <AlertDialogTitle>Block {userName}?</AlertDialogTitle>
            </div>
          </div>
        </AlertDialogHeader>
        
        <AlertDialogDescription className="space-y-3">
          <div className="flex items-start gap-2">
            <AlertTriangle className="h-5 w-5 text-amber-500 mt-0.5 shrink-0" />
            <div className="space-y-2">
              <p>
                Are you sure you want to block <strong>{userName}</strong>? This action will:
              </p>
              <ul className="list-disc list-inside space-y-1 text-sm text-muted-foreground">
                <li>Prevent them from sending you messages</li>
                <li>Hide their posts from your feed</li>
                <li>Remove them from your connections</li>
                <li>Stop all notifications from this user</li>
              </ul>
            </div>
          </div>
          
          <div className="bg-muted p-3 rounded-lg">
            <p className="text-sm">
              💡 <strong>Note:</strong> You can unblock users anytime from your blocked users list in settings.
            </p>
          </div>
        </AlertDialogDescription>

        <AlertDialogFooter>
          <AlertDialogCancel disabled={loading}>
            Cancel
          </AlertDialogCancel>
          <AlertDialogAction 
            onClick={onConfirm}
            disabled={loading}
            className="bg-red-600 hover:bg-red-700 focus:ring-red-600"
          >
            {loading ? 'Blocking...' : 'Block User'}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}

export default BlockConfirmationDialog