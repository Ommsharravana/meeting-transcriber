'use client';

import { useState } from 'react';
import { Eye, EyeOff, Key, Check, X, ExternalLink } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { useProviderApiKey } from '@/hooks/useApiKey';
import { cn } from '@/lib/utils';
import { TranscriptionProvider } from '@/types/transcription';

interface ApiKeyInputProps {
  provider: TranscriptionProvider;
  onSaved?: () => void;
}

const PROVIDER_CONFIG: Record<TranscriptionProvider, {
  label: string;
  placeholder: string;
  helpUrl: string;
  helpText: string;
  getLink: string;
}> = {
  openai: {
    label: 'OpenAI API Key',
    placeholder: 'sk-...',
    helpUrl: 'https://platform.openai.com/api-keys',
    helpText: 'Your API key is stored locally in your browser and only sent directly to OpenAI.',
    getLink: 'Get your API key from OpenAI',
  },
  elevenlabs: {
    label: 'ElevenLabs API Key',
    placeholder: 'Enter your ElevenLabs API key',
    helpUrl: 'https://elevenlabs.io/app/settings/api-keys',
    helpText: 'Your API key is stored locally in your browser and only sent directly to ElevenLabs.',
    getLink: 'Get your API key from ElevenLabs',
  },
};

export function ApiKeyInput({ provider, onSaved }: ApiKeyInputProps) {
  const { apiKey, isValid, saveApiKey, removeApiKey } = useProviderApiKey(provider);
  const [inputValue, setInputValue] = useState(apiKey || '');
  const [showKey, setShowKey] = useState(false);
  const [isDirty, setIsDirty] = useState(false);

  const config = PROVIDER_CONFIG[provider];

  const handleSave = () => {
    if (inputValue.trim()) {
      saveApiKey(inputValue.trim());
      setIsDirty(false);
      onSaved?.();
    }
  };

  const handleClear = () => {
    setInputValue('');
    removeApiKey();
    setIsDirty(false);
  };

  const handleChange = (value: string) => {
    setInputValue(value);
    setIsDirty(value !== apiKey);
  };

  const getMaskedKey = () => {
    if (!apiKey) return '';
    if (provider === 'openai') {
      return `sk-...${apiKey.slice(-8)}`;
    }
    return `...${apiKey.slice(-8)}`;
  };

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor={`api-key-${provider}`} className="text-sm font-medium flex items-center gap-2">
          <Key className="w-4 h-4 text-primary" />
          {config.label}
        </Label>
        <div className="relative">
          <Input
            id={`api-key-${provider}`}
            type={showKey ? 'text' : 'password'}
            value={inputValue}
            onChange={(e) => handleChange(e.target.value)}
            placeholder={config.placeholder}
            className={cn(
              'pr-20 font-mono text-sm',
              isValid && !isDirty && 'border-emerald-500/50',
              !isValid && inputValue && 'border-destructive/50'
            )}
          />
          <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-1">
            {isValid && !isDirty && (
              <Check className="w-4 h-4 text-emerald-500" />
            )}
            {!isValid && inputValue && (
              <X className="w-4 h-4 text-destructive" />
            )}
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="h-7 w-7"
              onClick={() => setShowKey(!showKey)}
            >
              {showKey ? (
                <EyeOff className="w-4 h-4 text-muted-foreground" />
              ) : (
                <Eye className="w-4 h-4 text-muted-foreground" />
              )}
            </Button>
          </div>
        </div>
        {apiKey && !isDirty && (
          <p className="text-xs text-muted-foreground font-mono">
            Saved: {getMaskedKey()}
          </p>
        )}
      </div>

      <div className="flex gap-2">
        <Button
          onClick={handleSave}
          disabled={!inputValue.trim() || !isDirty}
          className="flex-1"
        >
          Save Key
        </Button>
        {apiKey && (
          <Button
            variant="outline"
            onClick={handleClear}
            className="text-destructive hover:text-destructive"
          >
            Clear
          </Button>
        )}
      </div>

      <div className="pt-2 border-t border-border">
        <a
          href={config.helpUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="text-xs text-muted-foreground hover:text-primary transition-colors flex items-center gap-1"
        >
          {config.getLink}
          <ExternalLink className="w-3 h-3" />
        </a>
        <p className="text-xs text-muted-foreground mt-2">
          {config.helpText}
        </p>
      </div>
    </div>
  );
}
