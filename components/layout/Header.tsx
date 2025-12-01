'use client';

import { AudioLines, Settings, Github, LogOut, User } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { SettingsDialog } from '@/components/settings/SettingsDialog';
import { useState } from 'react';
import { useSession, signOut } from 'next-auth/react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

export function Header() {
  const [settingsOpen, setSettingsOpen] = useState(false);
  const { data: session } = useSession();

  return (
    <>
      <header className="fixed top-0 left-0 right-0 z-50 border-b border-border/50 backdrop-blur-studio bg-background/80">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            {/* Logo */}
            <div className="flex items-center gap-3">
              <div className="relative">
                <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center border border-primary/20">
                  <AudioLines className="w-5 h-5 text-primary" />
                </div>
                <div className="absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full bg-primary animate-pulse" />
              </div>
              <div>
                <h1 className="text-lg font-bold tracking-tight">
                  Meeting<span className="text-primary">Transcriber</span>
                </h1>
                <p className="text-[10px] text-muted-foreground font-mono tracking-wider uppercase">
                  AI Speech-to-Text
                </p>
              </div>
            </div>

            {/* Actions */}
            <div className="flex items-center gap-2">
              <Button
                variant="ghost"
                size="icon"
                className="text-muted-foreground hover:text-foreground"
                asChild
              >
                <a
                  href="https://github.com/Ommsharravana/meeting-transcriber"
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label="View project on GitHub"
                >
                  <Github className="w-5 h-5" aria-hidden="true" />
                </a>
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className="text-muted-foreground hover:text-foreground"
                onClick={() => setSettingsOpen(true)}
                aria-label="Open settings"
              >
                <Settings className="w-5 h-5" aria-hidden="true" />
              </Button>

              {/* User Menu */}
              {session?.user && (
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="relative"
                      aria-label="User menu"
                    >
                      <div className="w-8 h-8 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center text-white text-sm font-medium">
                        {session.user.name?.[0]?.toUpperCase() || session.user.email?.[0]?.toUpperCase() || 'U'}
                      </div>
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-56">
                    <DropdownMenuLabel>
                      <div className="flex flex-col">
                        <span className="font-medium">{session.user.name || 'User'}</span>
                        <span className="text-xs text-muted-foreground truncate">
                          {session.user.email}
                        </span>
                      </div>
                    </DropdownMenuLabel>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem
                      onClick={() => signOut({ callbackUrl: '/login' })}
                      className="text-red-500 focus:text-red-500 cursor-pointer"
                    >
                      <LogOut className="w-4 h-4 mr-2" />
                      Sign out
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              )}
            </div>
          </div>
        </div>
      </header>

      <SettingsDialog open={settingsOpen} onOpenChange={setSettingsOpen} />
    </>
  );
}
