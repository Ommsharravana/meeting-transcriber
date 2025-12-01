'use client';

import { useState } from 'react';
import { Sparkles, FileText, CheckSquare, List, HelpCircle, Loader2, Copy, Check, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
  DropdownMenuLabel,
} from '@/components/ui/dropdown-menu';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

type SummaryType = 'summary' | 'action-items' | 'key-points' | 'questions';

interface AISummaryProps {
  transcript: string;
  disabled?: boolean;
}

const SUMMARY_OPTIONS: { type: SummaryType; label: string; icon: typeof FileText; description: string }[] = [
  { type: 'summary', label: 'Meeting Summary', icon: FileText, description: 'Full summary with key points and decisions' },
  { type: 'action-items', label: 'Action Items', icon: CheckSquare, description: 'Extract tasks and assignments' },
  { type: 'key-points', label: 'Key Points', icon: List, description: 'Bullet points of important info' },
  { type: 'questions', label: 'Q&A Extract', icon: HelpCircle, description: 'Questions asked and answers given' },
];

export function AISummary({ transcript, disabled }: AISummaryProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [result, setResult] = useState<string | null>(null);
  const [currentType, setCurrentType] = useState<SummaryType | null>(null);
  const [copied, setCopied] = useState(false);

  const handleSummarize = async (type: SummaryType) => {
    setCurrentType(type);
    setIsLoading(true);
    setResult(null);
    setIsOpen(true);

    try {
      const response = await fetch('/api/summarize', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          transcript,
          type,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData?.error?.message || 'Failed to generate summary');
      }

      const data = await response.json();
      setResult(data.result);
      toast.success(`${SUMMARY_OPTIONS.find(o => o.type === type)?.label} generated!`);
    } catch (error: any) {
      console.error('Summary error:', error);
      toast.error(error.message || 'Failed to generate summary');
      setResult(null);
    } finally {
      setIsLoading(false);
    }
  };

  const handleCopy = async () => {
    if (!result) return;

    try {
      await navigator.clipboard.writeText(result);
      setCopied(true);
      toast.success('Copied to clipboard');
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error('Failed to copy');
    }
  };

  const currentOption = SUMMARY_OPTIONS.find(o => o.type === currentType);

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="outline"
            size="sm"
            disabled={disabled || !transcript}
            className="gap-2"
            aria-label="Generate AI summary"
          >
            <Sparkles className="w-4 h-4" aria-hidden="true" />
            AI Summary
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-64">
          <DropdownMenuLabel className="flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-primary" />
            Claude AI Analysis
          </DropdownMenuLabel>
          <DropdownMenuSeparator />
          {SUMMARY_OPTIONS.map((option) => {
            const Icon = option.icon;
            return (
              <DropdownMenuItem
                key={option.type}
                onClick={() => handleSummarize(option.type)}
                className="flex items-start gap-3 py-2 cursor-pointer"
              >
                <Icon className="w-4 h-4 mt-0.5 shrink-0" />
                <div>
                  <div className="font-medium">{option.label}</div>
                  <div className="text-xs text-muted-foreground">{option.description}</div>
                </div>
              </DropdownMenuItem>
            );
          })}
          <DropdownMenuSeparator />
          <div className="px-2 py-2 text-xs text-muted-foreground">
            Powered by Claude Code CLI
          </div>
        </DropdownMenuContent>
      </DropdownMenu>

      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogContent className="max-w-2xl max-h-[80vh]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              {currentOption && <currentOption.icon className="w-5 h-5 text-primary" />}
              {currentOption?.label || 'AI Analysis'}
              {isLoading && (
                <Badge variant="secondary" className="ml-2">
                  <Loader2 className="w-3 h-3 mr-1 animate-spin" />
                  Processing
                </Badge>
              )}
            </DialogTitle>
            <DialogDescription>
              {currentOption?.description || 'Analyzing your transcript with Claude AI'}
            </DialogDescription>
          </DialogHeader>

          <div className="relative">
            {isLoading ? (
              <div className="flex flex-col items-center justify-center py-12" role="status" aria-live="polite">
                <Loader2 className="w-8 h-8 animate-spin text-primary mb-4" aria-hidden="true" />
                <p className="text-sm text-muted-foreground">Analyzing with Claude AI...</p>
                <p className="text-xs text-muted-foreground mt-1">This may take a moment</p>
              </div>
            ) : result ? (
              <>
                <div className="absolute top-2 right-2 z-10">
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={handleCopy}
                    className="h-8 w-8"
                    aria-label={copied ? 'Copied to clipboard' : 'Copy to clipboard'}
                  >
                    {copied ? (
                      <Check className="w-4 h-4 text-green-500" aria-hidden="true" />
                    ) : (
                      <Copy className="w-4 h-4" aria-hidden="true" />
                    )}
                  </Button>
                </div>
                <ScrollArea className="h-[50vh] pr-4">
                  <div className="prose prose-sm dark:prose-invert max-w-none whitespace-pre-wrap">
                    {result}
                  </div>
                </ScrollArea>
              </>
            ) : (
              <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
                <Sparkles className="w-8 h-8 mb-4 opacity-50" />
                <p className="text-sm">Select an analysis type to begin</p>
              </div>
            )}
          </div>

          {result && (
            <div className="flex justify-end gap-2 mt-4">
              <Button variant="outline" onClick={() => setIsOpen(false)}>
                Close
              </Button>
              <Button onClick={handleCopy} className="gap-2" aria-label={copied ? 'Copied to clipboard' : 'Copy result to clipboard'}>
                {copied ? <Check className="w-4 h-4" aria-hidden="true" /> : <Copy className="w-4 h-4" aria-hidden="true" />}
                {copied ? 'Copied!' : 'Copy'}
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
