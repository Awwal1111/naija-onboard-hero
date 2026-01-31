import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import { Briefcase, Users, Shuffle } from 'lucide-react'
import { useUserMode, UserMode } from '@/hooks/useUserMode'
import { toast } from 'sonner'

export const UserModeSettings = () => {
  const { mode, setMode, isLoading } = useUserMode()

  const handleModeChange = async (newMode: UserMode) => {
    await setMode(newMode)
    
    const modeLabels = {
      freelancer: 'Freelancer',
      client: 'Client',
      both: 'Both'
    }
    
    toast.success(`Switched to ${modeLabels[newMode]} mode`)
  }

  const modes = [
    {
      value: 'freelancer' as UserMode,
      label: 'Freelancer',
      description: 'Focus on finding work, showcasing skills, and managing gigs',
      icon: Briefcase
    },
    {
      value: 'client' as UserMode,
      label: 'Client',
      description: 'Focus on hiring talent, posting jobs, and managing projects',
      icon: Users
    },
    {
      value: 'both' as UserMode,
      label: 'Both',
      description: 'Access all features for hiring and working',
      icon: Shuffle
    }
  ]

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Shuffle className="h-5 w-5" />
          Account Mode
        </CardTitle>
        <CardDescription>
          Choose how you want to use NaijaLancers. This customizes your experience.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <RadioGroup
          value={mode}
          onValueChange={handleModeChange}
          disabled={isLoading}
          className="space-y-3"
        >
          {modes.map((modeOption) => (
            <div key={modeOption.value} className="flex items-start space-x-3">
              <RadioGroupItem 
                value={modeOption.value} 
                id={modeOption.value}
                className="mt-1"
              />
              <Label 
                htmlFor={modeOption.value} 
                className="flex-1 cursor-pointer"
              >
                <div className="flex items-center gap-2">
                  <modeOption.icon className="h-4 w-4 text-primary" />
                  <span className="font-medium">{modeOption.label}</span>
                </div>
                <p className="text-sm text-muted-foreground mt-0.5">
                  {modeOption.description}
                </p>
              </Label>
            </div>
          ))}
        </RadioGroup>
      </CardContent>
    </Card>
  )
}
