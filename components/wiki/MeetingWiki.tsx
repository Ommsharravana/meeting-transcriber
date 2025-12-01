'use client';

import { useState, useCallback } from 'react';
import {
  BookOpen,
  Users,
  MessageSquare,
  CheckSquare,
  Square,
  ArrowRight,
  HelpCircle,
  Loader2,
  Copy,
  Check,
  ChevronDown,
  ChevronRight,
  Flag,
  Calendar,
  User,
  FileText,
  Lightbulb,
  Target,
  StickyNote,
  RefreshCw,
  Download,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import { Separator } from '@/components/ui/separator';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

interface WikiKeyPoint {
  id: string;
  point: string;
  speaker?: string | null;
}

interface WikiDecision {
  id: string;
  decision: string;
  context?: string | null;
}

interface WikiActionItem {
  id: string;
  task: string;
  owner?: string | null;
  deadline?: string | null;
  priority?: 'high' | 'medium' | 'low';
  completed: boolean;
}

interface MeetingWikiData {
  id: string;
  title: string;
  date?: string;
  overview: string;
  participants: string[];
  topics: string[];
  keyPoints: WikiKeyPoint[];
  decisions: WikiDecision[];
  actionItems: WikiActionItem[];
  nextSteps: string[];
  openQuestions: string[];
  notes?: string;
  createdAt: string;
}

interface MeetingWikiProps {
  transcript: string;
  title?: string;
  className?: string;
}

const priorityColors: Record<string, string> = {
  high: 'bg-red-500/10 text-red-500 border-red-500/20',
  medium: 'bg-amber-500/10 text-amber-500 border-amber-500/20',
  low: 'bg-green-500/10 text-green-500 border-green-500/20',
};

function WikiSection({
  title,
  icon: Icon,
  children,
  defaultOpen = true,
  badge,
}: {
  title: string;
  icon: React.ElementType;
  children: React.ReactNode;
  defaultOpen?: boolean;
  badge?: string | number;
}) {
  const [isOpen, setIsOpen] = useState(defaultOpen);

  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen}>
      <CollapsibleTrigger className="flex items-center gap-2 w-full text-left py-2 hover:bg-muted/50 rounded-lg px-2 -mx-2 transition-colors">
        {isOpen ? (
          <ChevronDown className="w-4 h-4 text-muted-foreground" />
        ) : (
          <ChevronRight className="w-4 h-4 text-muted-foreground" />
        )}
        <Icon className="w-4 h-4 text-primary" />
        <span className="font-medium text-sm">{title}</span>
        {badge !== undefined && (
          <Badge variant="secondary" className="ml-auto text-xs">
            {badge}
          </Badge>
        )}
      </CollapsibleTrigger>
      <CollapsibleContent className="pl-8 mt-1">
        {children}
      </CollapsibleContent>
    </Collapsible>
  );
}

export function MeetingWiki({ transcript, title, className }: MeetingWikiProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [wiki, setWiki] = useState<MeetingWikiData | null>(null);
  const [copied, setCopied] = useState(false);

  const generateWiki = useCallback(async () => {
    if (!transcript) {
      toast.error('No transcript available');
      return;
    }

    setIsLoading(true);
    setIsOpen(true);

    try {
      const response = await fetch('/api/generate-wiki', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ transcript, title }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData?.error?.message || 'Failed to generate wiki');
      }

      const data = await response.json();
      setWiki(data.wiki);
      toast.success('Meeting wiki generated!');
    } catch (error: any) {
      console.error('Wiki generation error:', error);
      toast.error(error.message || 'Failed to generate wiki');
    } finally {
      setIsLoading(false);
    }
  }, [transcript, title]);

  const toggleActionComplete = useCallback((id: string) => {
    if (!wiki) return;
    setWiki({
      ...wiki,
      actionItems: wiki.actionItems.map((item) =>
        item.id === id ? { ...item, completed: !item.completed } : item
      ),
    });
  }, [wiki]);

  const copyAsMarkdown = useCallback(async () => {
    if (!wiki) return;

    const md = `# ${wiki.title}

${wiki.date ? `**Date:** ${wiki.date}\n` : ''}
${wiki.participants.length > 0 ? `**Participants:** ${wiki.participants.join(', ')}\n` : ''}

## Overview
${wiki.overview}

${wiki.topics.length > 0 ? `## Topics Discussed\n${wiki.topics.map((t) => `- ${t}`).join('\n')}\n` : ''}

${wiki.keyPoints.length > 0 ? `## Key Points\n${wiki.keyPoints.map((kp) => `- ${kp.point}${kp.speaker ? ` *(${kp.speaker})*` : ''}`).join('\n')}\n` : ''}

${wiki.decisions.length > 0 ? `## Decisions Made\n${wiki.decisions.map((d) => `- **${d.decision}**${d.context ? ` - ${d.context}` : ''}`).join('\n')}\n` : ''}

${wiki.actionItems.length > 0 ? `## Action Items\n${wiki.actionItems.map((ai) => `- [${ai.completed ? 'x' : ' '}] ${ai.task}${ai.owner ? ` (Owner: ${ai.owner})` : ''}${ai.deadline ? ` - Due: ${ai.deadline}` : ''}${ai.priority ? ` [${ai.priority.toUpperCase()}]` : ''}`).join('\n')}\n` : ''}

${wiki.nextSteps.length > 0 ? `## Next Steps\n${wiki.nextSteps.map((ns) => `- ${ns}`).join('\n')}\n` : ''}

${wiki.openQuestions.length > 0 ? `## Open Questions\n${wiki.openQuestions.map((q) => `- ${q}`).join('\n')}\n` : ''}

${wiki.notes ? `## Additional Notes\n${wiki.notes}\n` : ''}

---
*Generated on ${new Date(wiki.createdAt).toLocaleString()}*
`;

    try {
      await navigator.clipboard.writeText(md);
      setCopied(true);
      toast.success('Copied as Markdown');
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error('Failed to copy');
    }
  }, [wiki]);

  const downloadAsMarkdown = useCallback(() => {
    if (!wiki) return;

    const md = `# ${wiki.title}\n\n${wiki.overview}`;
    const blob = new Blob([md], { type: 'text/markdown' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${wiki.title.replace(/[^a-z0-9]/gi, '_').toLowerCase()}_wiki.md`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    toast.success('Downloaded as Markdown');
  }, [wiki]);

  const completedActions = wiki?.actionItems.filter((a) => a.completed).length || 0;
  const totalActions = wiki?.actionItems.length || 0;

  return (
    <>
      <Button
        variant="outline"
        size="sm"
        onClick={generateWiki}
        disabled={!transcript}
        className={cn('gap-2', className)}
        aria-label="Generate meeting wiki"
      >
        <BookOpen className="w-4 h-4" />
        Meeting Wiki
      </Button>

      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogContent className="max-w-3xl max-h-[85vh] flex flex-col">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <BookOpen className="w-5 h-5 text-primary" />
              {wiki?.title || 'Meeting Wiki'}
              {isLoading && (
                <Badge variant="secondary" className="ml-2">
                  <Loader2 className="w-3 h-3 mr-1 animate-spin" />
                  Generating
                </Badge>
              )}
            </DialogTitle>
            <DialogDescription>
              Structured summary of your meeting
            </DialogDescription>
          </DialogHeader>

          {isLoading ? (
            <div className="flex flex-col items-center justify-center py-16" role="status">
              <Loader2 className="w-8 h-8 animate-spin text-primary mb-4" />
              <p className="text-sm text-muted-foreground">Generating comprehensive wiki...</p>
              <p className="text-xs text-muted-foreground mt-1">This may take a moment</p>
            </div>
          ) : wiki ? (
            <>
              <ScrollArea className="flex-1 pr-4">
                <div className="space-y-4">
                  {/* Meta info */}
                  <div className="flex flex-wrap gap-3 text-sm text-muted-foreground">
                    {wiki.date && (
                      <div className="flex items-center gap-1.5">
                        <Calendar className="w-4 h-4" />
                        <span>{wiki.date}</span>
                      </div>
                    )}
                    {wiki.participants.length > 0 && (
                      <div className="flex items-center gap-1.5">
                        <Users className="w-4 h-4" />
                        <span>{wiki.participants.length} participants</span>
                      </div>
                    )}
                    {totalActions > 0 && (
                      <div className="flex items-center gap-1.5">
                        <CheckSquare className="w-4 h-4" />
                        <span>
                          {completedActions}/{totalActions} actions done
                        </span>
                      </div>
                    )}
                  </div>

                  <Separator />

                  {/* Overview */}
                  <WikiSection title="Overview" icon={FileText}>
                    <p className="text-sm text-muted-foreground leading-relaxed">
                      {wiki.overview}
                    </p>
                  </WikiSection>

                  {/* Participants */}
                  {wiki.participants.length > 0 && (
                    <WikiSection
                      title="Participants"
                      icon={Users}
                      badge={wiki.participants.length}
                    >
                      <div className="flex flex-wrap gap-2">
                        {wiki.participants.map((p, i) => (
                          <Badge key={i} variant="secondary" className="gap-1">
                            <User className="w-3 h-3" />
                            {p}
                          </Badge>
                        ))}
                      </div>
                    </WikiSection>
                  )}

                  {/* Topics */}
                  {wiki.topics.length > 0 && (
                    <WikiSection
                      title="Topics Discussed"
                      icon={MessageSquare}
                      badge={wiki.topics.length}
                    >
                      <ul className="space-y-1">
                        {wiki.topics.map((t, i) => (
                          <li key={i} className="text-sm flex items-start gap-2">
                            <span className="text-primary mt-1">•</span>
                            {t}
                          </li>
                        ))}
                      </ul>
                    </WikiSection>
                  )}

                  {/* Key Points */}
                  {wiki.keyPoints.length > 0 && (
                    <WikiSection
                      title="Key Points"
                      icon={Lightbulb}
                      badge={wiki.keyPoints.length}
                    >
                      <ul className="space-y-2">
                        {wiki.keyPoints.map((kp) => (
                          <li key={kp.id} className="text-sm">
                            <div className="flex items-start gap-2">
                              <span className="text-amber-500 mt-1">★</span>
                              <div>
                                <span>{kp.point}</span>
                                {kp.speaker && (
                                  <span className="text-muted-foreground ml-1">
                                    ({kp.speaker})
                                  </span>
                                )}
                              </div>
                            </div>
                          </li>
                        ))}
                      </ul>
                    </WikiSection>
                  )}

                  {/* Decisions */}
                  {wiki.decisions.length > 0 && (
                    <WikiSection
                      title="Decisions Made"
                      icon={Target}
                      badge={wiki.decisions.length}
                    >
                      <ul className="space-y-2">
                        {wiki.decisions.map((d) => (
                          <li
                            key={d.id}
                            className="text-sm p-2 bg-green-500/5 border border-green-500/20 rounded-lg"
                          >
                            <div className="font-medium text-green-700 dark:text-green-400">
                              {d.decision}
                            </div>
                            {d.context && (
                              <div className="text-muted-foreground text-xs mt-1">
                                {d.context}
                              </div>
                            )}
                          </li>
                        ))}
                      </ul>
                    </WikiSection>
                  )}

                  {/* Action Items */}
                  {wiki.actionItems.length > 0 && (
                    <WikiSection
                      title="Action Items"
                      icon={CheckSquare}
                      badge={`${completedActions}/${totalActions}`}
                    >
                      <ul className="space-y-2">
                        {wiki.actionItems.map((ai) => (
                          <li
                            key={ai.id}
                            className={cn(
                              'text-sm p-2 border rounded-lg transition-colors',
                              ai.completed
                                ? 'bg-muted/50 border-muted'
                                : 'bg-card border-border'
                            )}
                          >
                            <div className="flex items-start gap-2">
                              <button
                                onClick={() => toggleActionComplete(ai.id)}
                                className="mt-0.5 shrink-0"
                                aria-label={ai.completed ? 'Mark incomplete' : 'Mark complete'}
                              >
                                {ai.completed ? (
                                  <CheckSquare className="w-4 h-4 text-green-500" />
                                ) : (
                                  <Square className="w-4 h-4 text-muted-foreground hover:text-primary" />
                                )}
                              </button>
                              <div className="flex-1">
                                <span
                                  className={cn(
                                    ai.completed && 'line-through text-muted-foreground'
                                  )}
                                >
                                  {ai.task}
                                </span>
                                <div className="flex flex-wrap gap-1.5 mt-1">
                                  {ai.priority && (
                                    <Badge
                                      variant="outline"
                                      className={cn('text-xs', priorityColors[ai.priority])}
                                    >
                                      <Flag className="w-3 h-3 mr-1" />
                                      {ai.priority}
                                    </Badge>
                                  )}
                                  {ai.owner && (
                                    <Badge variant="secondary" className="text-xs">
                                      <User className="w-3 h-3 mr-1" />
                                      {ai.owner}
                                    </Badge>
                                  )}
                                  {ai.deadline && (
                                    <Badge variant="secondary" className="text-xs">
                                      <Calendar className="w-3 h-3 mr-1" />
                                      {ai.deadline}
                                    </Badge>
                                  )}
                                </div>
                              </div>
                            </div>
                          </li>
                        ))}
                      </ul>
                    </WikiSection>
                  )}

                  {/* Next Steps */}
                  {wiki.nextSteps.length > 0 && (
                    <WikiSection
                      title="Next Steps"
                      icon={ArrowRight}
                      badge={wiki.nextSteps.length}
                    >
                      <ul className="space-y-1">
                        {wiki.nextSteps.map((ns, i) => (
                          <li key={i} className="text-sm flex items-start gap-2">
                            <ArrowRight className="w-4 h-4 text-blue-500 mt-0.5 shrink-0" />
                            {ns}
                          </li>
                        ))}
                      </ul>
                    </WikiSection>
                  )}

                  {/* Open Questions */}
                  {wiki.openQuestions.length > 0 && (
                    <WikiSection
                      title="Open Questions"
                      icon={HelpCircle}
                      badge={wiki.openQuestions.length}
                      defaultOpen={false}
                    >
                      <ul className="space-y-1">
                        {wiki.openQuestions.map((q, i) => (
                          <li
                            key={i}
                            className="text-sm flex items-start gap-2 text-muted-foreground"
                          >
                            <HelpCircle className="w-4 h-4 text-amber-500 mt-0.5 shrink-0" />
                            {q}
                          </li>
                        ))}
                      </ul>
                    </WikiSection>
                  )}

                  {/* Notes */}
                  {wiki.notes && (
                    <WikiSection title="Additional Notes" icon={StickyNote} defaultOpen={false}>
                      <p className="text-sm text-muted-foreground">{wiki.notes}</p>
                    </WikiSection>
                  )}
                </div>
              </ScrollArea>

              <Separator className="my-4" />

              <div className="flex justify-between items-center">
                <div className="text-xs text-muted-foreground">
                  Generated {new Date(wiki.createdAt).toLocaleString()}
                </div>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={generateWiki}
                    className="gap-1"
                  >
                    <RefreshCw className="w-3 h-3" />
                    Regenerate
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={downloadAsMarkdown}
                    className="gap-1"
                  >
                    <Download className="w-3 h-3" />
                    Download
                  </Button>
                  <Button size="sm" onClick={copyAsMarkdown} className="gap-1">
                    {copied ? (
                      <Check className="w-3 h-3" />
                    ) : (
                      <Copy className="w-3 h-3" />
                    )}
                    {copied ? 'Copied!' : 'Copy Markdown'}
                  </Button>
                </div>
              </div>
            </>
          ) : (
            <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
              <BookOpen className="w-12 h-12 mb-4 opacity-50" />
              <p className="text-sm">Generate a wiki to see structured meeting notes</p>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
