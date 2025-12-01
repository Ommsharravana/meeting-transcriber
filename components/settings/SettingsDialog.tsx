'use client';

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ApiKeyInput } from './ApiKeyInput';
import { Badge } from '@/components/ui/badge';
import { useProviderApiKey } from '@/hooks/useApiKey';

interface SettingsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function SettingsDialog({ open, onOpenChange }: SettingsDialogProps) {
  const openaiKey = useProviderApiKey('openai');
  const elevenlabsKey = useProviderApiKey('elevenlabs');

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Settings</DialogTitle>
          <DialogDescription>
            Configure your API keys for transcription services
          </DialogDescription>
        </DialogHeader>
        <Tabs defaultValue="openai" className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="openai" className="relative">
              OpenAI
              {openaiKey.isValid && (
                <Badge variant="outline" className="ml-2 h-5 px-1.5 text-[10px] bg-emerald-500/10 text-emerald-500 border-emerald-500/30">
                  Active
                </Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value="elevenlabs" className="relative">
              ElevenLabs
              {elevenlabsKey.isValid && (
                <Badge variant="outline" className="ml-2 h-5 px-1.5 text-[10px] bg-emerald-500/10 text-emerald-500 border-emerald-500/30">
                  Active
                </Badge>
              )}
            </TabsTrigger>
          </TabsList>
          <TabsContent value="openai" className="mt-4">
            <ApiKeyInput provider="openai" onSaved={() => {}} />
          </TabsContent>
          <TabsContent value="elevenlabs" className="mt-4">
            <ApiKeyInput provider="elevenlabs" onSaved={() => {}} />
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
