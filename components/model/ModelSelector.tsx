'use client';

import { useState } from 'react';
import { Check, ChevronDown, Sparkles, Zap, Users, Languages, Info, Thermometer, Wand2, Layers, AudioLines } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Slider } from '@/components/ui/slider';
import { Switch } from '@/components/ui/switch';
import { cn } from '@/lib/utils';
import { TranscriptionModel } from '@/types/transcription';
import { MODELS, MODEL_LIST, LANGUAGES } from '@/lib/openai/models';
import { useTranscriptionStore } from '@/store/transcriptionStore';

const MODEL_ICONS: Record<TranscriptionModel, typeof Sparkles> = {
  'gpt-4o-transcribe': Sparkles,
  'gpt-4o-mini-transcribe': Zap,
  'gpt-4o-transcribe-diarize': Users,
  'whisper-1': Languages,
  'elevenlabs-scribe-v1': AudioLines,
};

const MODEL_BADGES: Record<TranscriptionModel, { text: string; variant: 'default' | 'secondary' | 'outline' }> = {
  'gpt-4o-transcribe': { text: 'Best Quality', variant: 'default' },
  'gpt-4o-mini-transcribe': { text: 'Fast', variant: 'secondary' },
  'gpt-4o-transcribe-diarize': { text: 'Speakers', variant: 'default' },
  'whisper-1': { text: 'Legacy', variant: 'outline' },
  'elevenlabs-scribe-v1': { text: '99 Languages', variant: 'default' },
};

const TRANSCRIPTION_PRESETS = [
  {
    id: 'meeting',
    name: 'Meeting',
    prompt: 'Business meeting with multiple participants. Technical terms, project names, and action items may be discussed.',
    temperature: 0
  },
  {
    id: 'podcast',
    name: 'Podcast',
    prompt: 'Podcast or interview conversation. Casual speech with potential humor and varied topics.',
    temperature: 0.2
  },
  {
    id: 'lecture',
    name: 'Lecture',
    prompt: 'Educational lecture or presentation. Academic terminology and structured content.',
    temperature: 0
  },
  {
    id: 'interview',
    name: 'Interview',
    prompt: 'Job interview or formal Q&A session. Professional language with industry-specific terms.',
    temperature: 0.1
  },
  {
    id: 'default',
    name: 'Default',
    prompt: undefined,
    temperature: 0
  },
];

export function ModelSelector() {
  const { options, setOptions, status } = useTranscriptionStore();
  const [showOptions, setShowOptions] = useState(false);

  const selectedModel = MODELS[options.model];
  const Icon = MODEL_ICONS[options.model];
  const badge = MODEL_BADGES[options.model];

  const handleModelSelect = (modelId: TranscriptionModel) => {
    const model = MODELS[modelId];
    setOptions({
      model: modelId,
      responseFormat: model.supportsDiarization ? 'diarized_json' : 'json',
      chunkingStrategy: model.requiresChunkingStrategy ? 'auto' : undefined,
    });
  };

  return (
    <div className="space-y-4">
      {/* Model Dropdown */}
      <div className="space-y-2">
        <Label className="text-sm font-medium">Transcription Model</Label>
        <DropdownMenu>
          <DropdownMenuTrigger asChild disabled={status !== 'idle'}>
            <Button
              variant="outline"
              className="w-full justify-between h-auto py-3 px-4"
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                  <Icon className="w-5 h-5 text-primary" />
                </div>
                <div className="text-left">
                  <div className="flex items-center gap-2">
                    <span className="font-medium">{selectedModel.name}</span>
                    <Badge variant={badge.variant} className="text-[10px] px-1.5 py-0">
                      {badge.text}
                    </Badge>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {selectedModel.description}
                  </p>
                </div>
              </div>
              <ChevronDown className="w-4 h-4 text-muted-foreground shrink-0" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start" className="w-[var(--radix-dropdown-menu-trigger-width)]">
            {MODEL_LIST.map((model) => {
              const ModelIcon = MODEL_ICONS[model.id];
              const modelBadge = MODEL_BADGES[model.id];
              return (
                <DropdownMenuItem
                  key={model.id}
                  className={cn(
                    'flex items-center gap-3 py-3 cursor-pointer',
                    options.model === model.id && 'bg-accent'
                  )}
                  onClick={() => handleModelSelect(model.id)}
                >
                  <div className="w-10 h-10 rounded-lg bg-muted flex items-center justify-center shrink-0">
                    <ModelIcon className="w-5 h-5 text-muted-foreground" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-medium">{model.name}</span>
                      <Badge variant={modelBadge.variant} className="text-[10px] px-1.5 py-0">
                        {modelBadge.text}
                      </Badge>
                    </div>
                    <p className="text-xs text-muted-foreground truncate">
                      {model.description}
                    </p>
                  </div>
                  {options.model === model.id && (
                    <Check className="w-4 h-4 text-primary shrink-0" />
                  )}
                </DropdownMenuItem>
              );
            })}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* Model Features */}
      <div className="flex flex-wrap gap-2">
        {selectedModel.supportsDiarization && (
          <Badge variant="outline" className="text-xs gap-1">
            <Users className="w-3 h-3" /> Speaker ID
          </Badge>
        )}
        {selectedModel.supportsStreaming && (
          <Badge variant="outline" className="text-xs gap-1">
            <Zap className="w-3 h-3" /> Streaming
          </Badge>
        )}
        {selectedModel.supportsTranslation && (
          <Badge variant="outline" className="text-xs gap-1">
            <Languages className="w-3 h-3" /> Translation
          </Badge>
        )}
        {selectedModel.supportsPrompt && (
          <Badge variant="outline" className="text-xs gap-1">
            <Sparkles className="w-3 h-3" /> Prompts
          </Badge>
        )}
      </div>

      {/* Dual Model Mode Toggle */}
      <div className="rounded-lg border border-primary/20 bg-primary/5 p-4 space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Layers className="w-4 h-4 text-primary" />
            <Label className="text-sm font-medium">Dual Model Mode</Label>
            <Badge variant="default" className="text-[10px] px-1.5 py-0 bg-gradient-to-r from-primary to-cyan-400">
              Best Results
            </Badge>
          </div>
          <Switch
            checked={options.dualModelMode ?? false}
            onCheckedChange={(checked) => setOptions({ dualModelMode: checked })}
            disabled={status !== 'idle'}
          />
        </div>
        <p className="text-xs text-muted-foreground">
          Run <strong>GPT-4o Transcribe</strong> (best quality text) + <strong>GPT-4o Diarize</strong> (speaker ID & timestamps) simultaneously, then merge the results for maximum accuracy with speaker identification.
        </p>
        {options.dualModelMode && (
          <div className="flex items-center gap-1 text-xs text-amber-500">
            <Info className="w-3 h-3" />
            <span>Uses 2x API calls for enhanced results</span>
          </div>
        )}
      </div>

      {/* Advanced Options Toggle */}
      <Button
        variant="ghost"
        size="sm"
        className="w-full text-muted-foreground hover:text-foreground"
        onClick={() => setShowOptions(!showOptions)}
      >
        {showOptions ? 'Hide Options' : 'Show Options'}
        <ChevronDown className={cn('w-4 h-4 ml-2 transition-transform', showOptions && 'rotate-180')} />
      </Button>

      {/* Advanced Options */}
      {showOptions && (
        <div className="space-y-4 pt-2 border-t border-border">
          {/* Language Selection */}
          <div className="space-y-2">
            <Label className="text-sm">Language</Label>
            <Select
              value={options.language || 'auto'}
              onValueChange={(value) => setOptions({ language: value === 'auto' ? undefined : value })}
              disabled={status !== 'idle'}
            >
              <SelectTrigger>
                <SelectValue placeholder="Auto-detect" />
              </SelectTrigger>
              <SelectContent>
                {LANGUAGES.map((lang) => (
                  <SelectItem key={lang.code} value={lang.code}>
                    {lang.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Presets */}
          <div className="space-y-2">
            <Label className="text-sm flex items-center gap-2">
              <Wand2 className="w-3.5 h-3.5" />
              Quick Presets
            </Label>
            <div className="flex flex-wrap gap-2">
              {TRANSCRIPTION_PRESETS.map((preset) => (
                <Button
                  key={preset.id}
                  variant="outline"
                  size="sm"
                  className={cn(
                    'text-xs h-7',
                    options.prompt === preset.prompt && options.temperature === preset.temperature
                      ? 'bg-primary/10 border-primary/50'
                      : ''
                  )}
                  onClick={() => setOptions({
                    prompt: preset.prompt,
                    temperature: preset.temperature,
                  })}
                  disabled={status !== 'idle'}
                >
                  {preset.name}
                </Button>
              ))}
            </div>
          </div>

          {/* Temperature */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Label className="text-sm flex items-center gap-2">
                <Thermometer className="w-3.5 h-3.5" />
                Temperature
              </Label>
              <span className="text-sm font-mono text-muted-foreground">
                {(options.temperature ?? 0).toFixed(1)}
              </span>
            </div>
            <Slider
              value={[options.temperature ?? 0]}
              min={0}
              max={1}
              step={0.1}
              onValueChange={([value]) => setOptions({ temperature: value })}
              disabled={status !== 'idle'}
              className="w-full"
            />
            <div className="flex justify-between text-[10px] text-muted-foreground">
              <span>Precise</span>
              <span>Balanced</span>
              <span>Creative</span>
            </div>
          </div>

          {/* Prompt (if supported) */}
          {selectedModel.supportsPrompt && (
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label className="text-sm">Prompt</Label>
                <span className="text-xs text-muted-foreground">Optional</span>
              </div>
              <Textarea
                placeholder="Add context to improve accuracy (e.g., technical terms, speaker names)"
                value={options.prompt || ''}
                onChange={(e) => setOptions({ prompt: e.target.value || undefined })}
                disabled={status !== 'idle'}
                className="min-h-[80px] text-sm"
              />
              <p className="text-xs text-muted-foreground flex items-start gap-1">
                <Info className="w-3 h-3 mt-0.5 shrink-0" />
                Helps the model recognize specific words, names, or jargon
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
