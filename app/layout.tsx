import type { Metadata } from "next";
import { JetBrains_Mono, Plus_Jakarta_Sans } from "next/font/google";
import { Toaster } from "@/components/ui/sonner";
import { SessionProvider } from "@/components/providers/SessionProvider";
import "./globals.css";

const jetbrainsMono = JetBrains_Mono({
  subsets: ["latin"],
  variable: "--font-mono",
  display: "swap",
});

const plusJakartaSans = Plus_Jakarta_Sans({
  subsets: ["latin"],
  variable: "--font-sans",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Meeting Transcriber | AI-Powered Speech to Text",
  description: "Transform your meetings into text with speaker identification using OpenAI's advanced transcription models.",
  keywords: ["transcription", "speech to text", "meeting notes", "speaker diarization", "OpenAI", "whisper"],
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`dark ${jetbrainsMono.variable} ${plusJakartaSans.variable}`}>
      <body className="min-h-screen gradient-mesh noise-overlay font-sans">
        <SessionProvider>
          {/* Skip to main content link for keyboard users */}
          <a
            href="#main-content"
            className="sr-only focus:not-sr-only focus:absolute focus:top-4 focus:left-4 focus:z-50 focus:px-4 focus:py-2 focus:bg-primary focus:text-primary-foreground focus:rounded-md focus:outline-none"
          >
            Skip to main content
          </a>
          {children}
          <Toaster
            position="bottom-right"
            toastOptions={{
              style: {
                background: 'oklch(0.14 0.01 260)',
                border: '1px solid oklch(0.25 0.01 260)',
                color: 'oklch(0.95 0.01 260)',
              },
            }}
          />
        </SessionProvider>
      </body>
    </html>
  );
}
