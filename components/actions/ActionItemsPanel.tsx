'use client';

import { useState, useCallback } from 'react';
import {
  CheckSquare,
  Square,
  User,
  Calendar,
  AlertCircle,
  Loader2,
  RefreshCw,
  Copy,
  Check,
  ChevronDown,
  ChevronUp,
  Flag,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import { cn } from '@/lib/utils';
import { ActionItem } from '@/types/transcription';
import { toast } from 'sonner';

interface ActionItemsPanelProps {
  transcript: string;
  className?: string;
}

const priorityColors: Record<string, string> = {
  high: 'bg-red-500/10 text-red-500 border-red-500/20',
  medium: 'bg-amber-500/10 text-amber-500 border-amber-500/20',
  low: 'bg-green-500/10 text-green-500 border-green-500/20',
};

const priorityIcons: Record<string, string> = {
  high: 'text-red-500',
  medium: 'text-amber-500',
  low: 'text-green-500',
};

export function ActionItemsPanel({ transcript, className }: ActionItemsPanelProps) {
  const [actionItems, setActionItems] = useState<ActionItem[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isExpanded, setIsExpanded] = useState(true);
  const [hasExtracted, setHasExtracted] = useState(false);
  const [copied, setCopied] = useState(false);

  const extractActionItems = useCallback(async () => {
    if (!transcript) {
      toast.error('No transcript available');
      return;
    }

    setIsLoading(true);
    setHasExtracted(true);

    try {
      const response = await fetch('/api/extract-actions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ transcript }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData?.error?.message || 'Failed to extract action items');
      }

      const data = await response.json();
      setActionItems(data.actionItems || []);

      if (data.actionItems?.length > 0) {
        toast.success(`Found ${data.actionItems.length} action items`);
      } else {
        toast.info('No action items found in transcript');
      }
    } catch (error: any) {
      console.error('Action extraction error:', error);
      toast.error(error.message || 'Failed to extract action items');
    } finally {
      setIsLoading(false);
    }
  }, [transcript]);

  const toggleComplete = useCallback((id: string) => {
    setActionItems(prev =>
      prev.map(item =>
        item.id === id ? { ...item, completed: !item.completed } : item
      )
    );
  }, []);

  const copyToClipboard = useCallback(async () => {
    if (actionItems.length === 0) return;

    const text = actionItems
      .map((item, index) => {
        let line = `${index + 1}. ${item.completed ? '[x]' : '[ ]'} ${item.task}`;
        if (item.owner) line += ` (Owner: ${item.owner})`;
        if (item.deadline) line += ` - Due: ${item.deadline}`;
        if (item.priority) line += ` [${item.priority.toUpperCase()}]`;
        return line;
      })
      .join('\n');

    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      toast.success('Copied to clipboard');
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error('Failed to copy');
    }
  }, [actionItems]);

  const completedCount = actionItems.filter(item => item.completed).length;
  const pendingCount = actionItems.length - completedCount;

  return (
    <Card className={cn('border', className)}>
      <Collapsible open={isExpanded} onOpenChange={setIsExpanded}>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <CheckSquare className="w-5 h-5 text-primary" />
              <CardTitle className="text-base">Action Items</CardTitle>
              {hasExtracted && actionItems.length > 0 && (
                <div className="flex gap-1.5 ml-2">
                  <Badge variant="secondary" className="text-xs">
                    {pendingCount} pending
                  </Badge>
                  {completedCount > 0 && (
                    <Badge variant="outline" className="text-xs text-green-600">
                      {completedCount} done
                    </Badge>
                  )}
                </div>
              )}
            </div>
            <div className="flex items-center gap-1">
              {actionItems.length > 0 && (
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={copyToClipboard}
                  className="h-8 w-8"
                  title="Copy all"
                  aria-label={copied ? 'Copied' : 'Copy action items'}
                >
                  {copied ? (
                    <Check className="w-4 h-4 text-green-500" />
                  ) : (
                    <Copy className="w-4 h-4" />
                  )}
                </Button>
              )}
              <CollapsibleTrigger asChild>
                <Button variant="ghost" size="icon" className="h-8 w-8" aria-label={isExpanded ? 'Collapse' : 'Expand'}>
                  {isExpanded ? (
                    <ChevronUp className="w-4 h-4" />
                  ) : (
                    <ChevronDown className="w-4 h-4" />
                  )}
                </Button>
              </CollapsibleTrigger>
            </div>
          </div>
          {!hasExtracted && (
            <CardDescription className="text-xs">
              Extract tasks and assignments from your meeting
            </CardDescription>
          )}
        </CardHeader>

        <CollapsibleContent>
          <CardContent className="pt-0">
            {!hasExtracted ? (
              <Button
                onClick={extractActionItems}
                disabled={isLoading || !transcript}
                className="w-full gap-2"
                aria-label="Extract action items from transcript"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Analyzing transcript...
                  </>
                ) : (
                  <>
                    <CheckSquare className="w-4 h-4" />
                    Extract Action Items
                  </>
                )}
              </Button>
            ) : isLoading ? (
              <div className="flex flex-col items-center justify-center py-8" role="status" aria-live="polite">
                <Loader2 className="w-6 h-6 animate-spin text-primary mb-2" />
                <p className="text-sm text-muted-foreground">Analyzing with Claude AI...</p>
              </div>
            ) : actionItems.length === 0 ? (
              <div className="text-center py-6 text-muted-foreground">
                <CheckSquare className="w-8 h-8 mx-auto mb-2 opacity-50" />
                <p className="text-sm">No action items found</p>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={extractActionItems}
                  className="mt-2 gap-1"
                >
                  <RefreshCw className="w-3 h-3" />
                  Try again
                </Button>
              </div>
            ) : (
              <div className="space-y-3">
                <ScrollArea className="max-h-[300px]">
                  <div className="space-y-2 pr-2">
                    {actionItems.map((item) => (
                      <div
                        key={item.id}
                        className={cn(
                          'p-3 rounded-lg border transition-colors',
                          item.completed
                            ? 'bg-muted/50 border-muted'
                            : 'bg-card hover:bg-muted/30'
                        )}
                      >
                        <div className="flex items-start gap-3">
                          <button
                            onClick={() => toggleComplete(item.id)}
                            className="mt-0.5 shrink-0"
                            aria-label={item.completed ? 'Mark as incomplete' : 'Mark as complete'}
                          >
                            {item.completed ? (
                              <CheckSquare className="w-5 h-5 text-green-500" />
                            ) : (
                              <Square className="w-5 h-5 text-muted-foreground hover:text-primary" />
                            )}
                          </button>
                          <div className="flex-1 min-w-0">
                            <p
                              className={cn(
                                'text-sm',
                                item.completed && 'line-through text-muted-foreground'
                              )}
                            >
                              {item.task}
                            </p>
                            <div className="flex flex-wrap items-center gap-2 mt-2">
                              {item.priority && (
                                <Badge
                                  variant="outline"
                                  className={cn('text-xs gap-1', priorityColors[item.priority])}
                                >
                                  <Flag className={cn('w-3 h-3', priorityIcons[item.priority])} />
                                  {item.priority}
                                </Badge>
                              )}
                              {item.owner && (
                                <Badge variant="secondary" className="text-xs gap-1">
                                  <User className="w-3 h-3" />
                                  {item.owner}
                                </Badge>
                              )}
                              {item.deadline && (
                                <Badge variant="secondary" className="text-xs gap-1">
                                  <Calendar className="w-3 h-3" />
                                  {item.deadline}
                                </Badge>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </ScrollArea>

                <div className="flex justify-between items-center pt-2 border-t">
                  <span className="text-xs text-muted-foreground">
                    {completedCount}/{actionItems.length} completed
                  </span>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={extractActionItems}
                    className="gap-1 text-xs"
                  >
                    <RefreshCw className="w-3 h-3" />
                    Re-extract
                  </Button>
                </div>
              </div>
            )}
          </CardContent>
        </CollapsibleContent>
      </Collapsible>
    </Card>
  );
}
