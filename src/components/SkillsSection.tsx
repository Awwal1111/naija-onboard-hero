import React, { useState } from 'react'
import { Plus, ThumbsUp, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Card, CardContent } from '@/components/ui/card'
import { useSkills } from '@/hooks/useSkills'
import { useAuth } from '@/hooks/useAuth'

interface SkillsSectionProps {
  userId?: string
  isOwnProfile?: boolean
}

const SkillsSection: React.FC<SkillsSectionProps> = ({ userId, isOwnProfile = false }) => {
  const { user } = useAuth()
  const { skills, loading, addSkill, endorseSkill, removeEndorsement, deleteSkill } = useSkills(userId)
  const [isAdding, setIsAdding] = useState(false)
  const [newSkillName, setNewSkillName] = useState('')

  const handleAddSkill = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newSkillName.trim()) return

    const { error } = await addSkill(newSkillName.trim())
    if (!error) {
      setNewSkillName('')
      setIsAdding(false)
    }
  }

  const handleEndorse = async (skillId: string, isEndorsed: boolean) => {
    if (isEndorsed) {
      await removeEndorsement(skillId)
    } else {
      await endorseSkill(skillId)
    }
  }

  if (loading) {
    return (
      <div className="space-y-4">
        <h3 className="text-xl font-semibold text-text-primary">Skills</h3>
        <div className="flex flex-wrap gap-2">
          {[1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="h-8 w-20 bg-background-secondary rounded animate-pulse"></div>
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-xl font-semibold text-text-primary">Skills</h3>
        {isOwnProfile && !isAdding && (
          <Button size="sm" variant="outline" onClick={() => setIsAdding(true)} className="gap-2">
            <Plus className="h-4 w-4" />
            Add Skill
          </Button>
        )}
      </div>

      {isAdding && (
        <Card>
          <CardContent className="p-4">
            <form onSubmit={handleAddSkill} className="flex gap-2">
              <Input
                value={newSkillName}
                onChange={(e) => setNewSkillName(e.target.value)}
                placeholder="Enter skill name"
                className="flex-1"
                autoFocus
              />
              <Button type="submit" size="sm">
                Add
              </Button>
              <Button 
                type="button" 
                size="sm" 
                variant="outline"
                onClick={() => {
                  setIsAdding(false)
                  setNewSkillName('')
                }}
              >
                Cancel
              </Button>
            </form>
          </CardContent>
        </Card>
      )}

      {skills.length === 0 ? (
        <Card>
          <CardContent className="p-6 text-center">
            <p className="text-text-secondary">
              {isOwnProfile ? "Add skills to showcase your expertise" : "No skills listed yet"}
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="flex flex-wrap gap-2">
          {skills.map((skill) => (
            <div key={skill.id} className="group relative">
              <Badge 
                variant="secondary" 
                className="pr-8 cursor-pointer hover:bg-background-hover flex items-center gap-2"
              >
                <span>{skill.skill_name}</span>
                
                {skill.endorsements_count > 0 && (
                  <span className="flex items-center gap-1 text-xs text-text-secondary">
                    <ThumbsUp className="h-3 w-3" />
                    {skill.endorsements_count}
                  </span>
                )}
                
                {/* Show endorse button for other users' skills */}
                {!isOwnProfile && user?.id && (
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => handleEndorse(skill.id, skill.is_endorsed_by_me || false)}
                    className={`p-0 h-auto ml-1 ${
                      skill.is_endorsed_by_me 
                        ? 'text-primary' 
                        : 'text-text-secondary hover:text-primary'
                    }`}
                  >
                    <ThumbsUp className="h-3 w-3" />
                  </Button>
                )}
                
                {/* Show delete button for own skills */}
                {isOwnProfile && (
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => deleteSkill(skill.id)}
                    className="absolute right-1 top-1/2 -translate-y-1/2 p-0 h-auto opacity-0 group-hover:opacity-100 transition-opacity text-text-secondary hover:text-destructive"
                  >
                    <X className="h-3 w-3" />
                  </Button>
                )}
              </Badge>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

export default SkillsSection