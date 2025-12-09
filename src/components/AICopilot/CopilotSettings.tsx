import React from 'react';
import { Bot, Palette, MessageSquare, Code, Megaphone, Layers, ToggleLeft } from 'lucide-react';
import { useAICopilot } from '@/hooks/useAICopilot';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { Button } from '@/components/ui/button';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';

interface CopilotSettingsProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const expertiseOptions = [
  { value: 'all-rounder', label: 'All-Rounder', icon: Layers, description: 'Versatile assistant for any task' },
  { value: 'designer', label: 'Designer', icon: Palette, description: 'Focused on visuals & UI/UX' },
  { value: 'writer', label: 'Writer', icon: MessageSquare, description: 'Content, copy & documentation' },
  { value: 'developer', label: 'Developer', icon: Code, description: 'Code, scripts & technical help' },
  { value: 'marketer', label: 'Marketer', icon: Megaphone, description: 'Strategy, ads & growth' },
];

const toneOptions = [
  { value: 'casual', label: 'Casual', description: 'Friendly & relaxed' },
  { value: 'professional', label: 'Professional', description: 'Business-appropriate' },
  { value: 'formal', label: 'Formal', description: 'Precise & structured' },
  { value: 'creative', label: 'Creative', description: 'Imaginative & inspiring' },
];

const CopilotSettings: React.FC<CopilotSettingsProps> = ({ open, onOpenChange }) => {
  const { settings, updateSettings, clearHistory } = useAICopilot();

  if (!settings) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Bot className="h-5 w-5" />
            Copilot Settings
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Copilot Name */}
          <div className="space-y-2">
            <Label htmlFor="copilot-name">Copilot Name</Label>
            <Input
              id="copilot-name"
              value={settings.copilot_name}
              onChange={(e) => updateSettings({ copilot_name: e.target.value })}
              placeholder="e.g., My Design Guru"
            />
            <p className="text-xs text-muted-foreground">
              Give your AI assistant a custom name
            </p>
          </div>

          {/* Expertise */}
          <div className="space-y-3">
            <Label>Expertise</Label>
            <RadioGroup
              value={settings.expertise}
              onValueChange={(value) => updateSettings({ expertise: value as any })}
              className="grid gap-2"
            >
              {expertiseOptions.map((option) => (
                <div key={option.value} className="flex items-center space-x-2">
                  <RadioGroupItem value={option.value} id={option.value} />
                  <Label
                    htmlFor={option.value}
                    className="flex items-center gap-2 cursor-pointer flex-1"
                  >
                    <option.icon className="h-4 w-4 text-muted-foreground" />
                    <div>
                      <span className="font-medium">{option.label}</span>
                      <p className="text-xs text-muted-foreground">{option.description}</p>
                    </div>
                  </Label>
                </div>
              ))}
            </RadioGroup>
          </div>

          {/* Tone */}
          <div className="space-y-3">
            <Label>Communication Tone</Label>
            <RadioGroup
              value={settings.tone}
              onValueChange={(value) => updateSettings({ tone: value as any })}
              className="grid grid-cols-2 gap-2"
            >
              {toneOptions.map((option) => (
                <div
                  key={option.value}
                  className={`border rounded-lg p-3 cursor-pointer transition-colors ${
                    settings.tone === option.value
                      ? 'border-primary bg-primary/5'
                      : 'border-border hover:border-primary/50'
                  }`}
                  onClick={() => updateSettings({ tone: option.value as any })}
                >
                  <div className="flex items-center gap-2">
                    <RadioGroupItem value={option.value} id={`tone-${option.value}`} />
                    <div>
                      <Label htmlFor={`tone-${option.value}`} className="font-medium cursor-pointer">
                        {option.label}
                      </Label>
                      <p className="text-xs text-muted-foreground">{option.description}</p>
                    </div>
                  </div>
                </div>
              ))}
            </RadioGroup>
          </div>

          {/* Toggles */}
          <div className="space-y-4">
            {/* Client Mode */}
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>Client Mode</Label>
                <p className="text-xs text-muted-foreground">
                  Professional, client-safe language only
                </p>
              </div>
              <Switch
                checked={settings.client_mode}
                onCheckedChange={(checked) => updateSettings({ client_mode: checked })}
              />
            </div>

            {/* Memory */}
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>Memory</Label>
                <p className="text-xs text-muted-foreground">
                  Remember our conversations
                </p>
              </div>
              <Switch
                checked={settings.memory_enabled}
                onCheckedChange={(checked) => updateSettings({ memory_enabled: checked })}
              />
            </div>

            {/* Visibility */}
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>Show in Chat List</Label>
                <p className="text-xs text-muted-foreground">
                  Display Copilot in main chat list
                </p>
              </div>
              <Switch
                checked={settings.is_visible}
                onCheckedChange={(checked) => updateSettings({ is_visible: checked })}
              />
            </div>
          </div>

          {/* Clear History */}
          <div className="pt-4 border-t">
            <Button
              variant="outline"
              className="w-full text-destructive hover:text-destructive"
              onClick={() => {
                clearHistory();
                onOpenChange(false);
              }}
            >
              Clear Conversation History
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default CopilotSettings;
