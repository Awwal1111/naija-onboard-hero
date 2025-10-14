import React from 'react'
import { MoreVertical, Edit, Trash2, Bookmark, BookmarkCheck, Flag, Link } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu'

interface PostOptionsMenuProps {
  isOwnPost: boolean
  postId: string
  isSaved?: boolean
  onEdit: () => void
  onDelete: () => void
  onSave: () => void
  onReport: () => void
  onCopyLink: () => void
}

const PostOptionsMenu: React.FC<PostOptionsMenuProps> = ({
  isOwnPost,
  postId,
  isSaved = false,
  onEdit,
  onDelete,
  onSave,
  onReport,
  onCopyLink
}) => {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="sm" className="h-8 w-8 p-0 hover:bg-primary/10">
          <MoreVertical className="h-4 w-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-48 z-50 bg-background border-border shadow-lg">
        {isOwnPost ? (
          <>
            <DropdownMenuItem onClick={onEdit}>
              <Edit className="h-4 w-4 mr-2" />
              Edit Post
            </DropdownMenuItem>
            <DropdownMenuItem onClick={onDelete} className="text-destructive">
              <Trash2 className="h-4 w-4 mr-2" />
              Delete Post
            </DropdownMenuItem>
            <DropdownMenuItem onClick={onSave}>
              {isSaved ? (
                <>
                  <BookmarkCheck className="h-4 w-4 mr-2 text-primary" />
                  Saved
                </>
              ) : (
                <>
                  <Bookmark className="h-4 w-4 mr-2" />
                  Save Post
                </>
              )}
            </DropdownMenuItem>
            <DropdownMenuItem onClick={onCopyLink}>
              <Link className="h-4 w-4 mr-2" />
              Copy Link
            </DropdownMenuItem>
          </>
        ) : (
          <>
            <DropdownMenuItem onClick={onSave}>
              {isSaved ? (
                <>
                  <BookmarkCheck className="h-4 w-4 mr-2 text-primary" />
                  Saved
                </>
              ) : (
                <>
                  <Bookmark className="h-4 w-4 mr-2" />
                  Save Post
                </>
              )}
            </DropdownMenuItem>
            <DropdownMenuItem onClick={onReport} className="text-destructive">
              <Flag className="h-4 w-4 mr-2" />
              Report Post
            </DropdownMenuItem>
            <DropdownMenuItem onClick={onCopyLink}>
              <Link className="h-4 w-4 mr-2" />
              Copy Link
            </DropdownMenuItem>
          </>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

export default PostOptionsMenu