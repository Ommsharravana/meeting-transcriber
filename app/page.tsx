'use client';

import { useEffect, useRef } from 'react';
import { Header } from '@/components/layout/Header';
import { FileDropzone } from '@/components/upload/FileDropzone';
import { AudioRecorder } from '@/components/recording/AudioRecorder';
import { ModelSelector } from '@/components/model/ModelSelector';
import { ProcessingStatus } from '@/components/processing/ProcessingStatus';
import { TranscriptView } from '@/components/transcript/TranscriptView';
import { HistorySidebar } from '@/components/history/HistorySidebar';
import { useTranscriptionStore } from '@/store/transcriptionStore';
import { useApiKey } from '@/hooks/useApiKey';
import { useTranscriptHistory } from '@/hooks/useTranscriptHistory';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Upload, Mic, AlertCircle, Radio } from 'lucide-react';
import { Transcript } from '@/types/transcription';
import { RealtimeAudioRecorder } from '@/components/recording/RealtimeAudioRecorder';

export default function Home() {
  const { transcript, status, setTranscript } = useTranscriptionStore();
  const { apiKey, apiKeys } = useApiKey();
  const { history, isLoading: historyLoading, save, remove, clearAll, refresh } = useTranscriptHistory();
  const lastSavedId = useRef<string | null>(null);

  // Auto-save transcript when it changes and is complete
  useEffect(() => {
    if (transcript && status === 'complete' && transcript.id !== lastSavedId.current) {
      lastSavedId.current = transcript.id;
      save(transcript).catch(console.error);
    }
  }, [transcript, status, save]);

  // Handle selecting a transcript from history
  const handleSelectFromHistory = (selectedTranscript: Transcript) => {
    setTranscript(selectedTranscript);
  };

  return (
    <div className="min-h-screen flex flex-col">
      <Header />

      <div className="flex-1 flex pt-16">
        {/* History Sidebar - only show when API key is set */}
        {apiKey && (
          <HistorySidebar
            history={history}
            isLoading={historyLoading}
            onSelect={handleSelectFromHistory}
            onDelete={remove}
            onClearAll={clearAll}
            currentTranscriptId={transcript?.id}
          />
        )}

        <main id="main-content" className="flex-1 container mx-auto px-4 py-6 max-w-7xl" role="main" aria-label="Main content">
          {!apiKey ? (
            // No API Key State
            <div className="flex items-center justify-center min-h-[60vh]">
              <Card className="max-w-md w-full">
                <CardHeader className="text-center">
                  <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto mb-4">
                    <AlertCircle className="w-8 h-8 text-primary" />
                  </div>
                  <CardTitle>API Key Required</CardTitle>
                  <CardDescription>
                    Add your OpenAI API key in settings to start transcribing audio files.
                  </CardDescription>
                </CardHeader>
                <CardContent className="text-center text-sm text-muted-foreground">
                  <p>Click the settings icon in the header to add your key.</p>
                  <p className="mt-2">Your key is stored locally and never sent to our servers.</p>
                </CardContent>
              </Card>
            </div>
          ) : transcript ? (
            // Transcript View
            <div className="h-[calc(100vh-8rem)]">
              <TranscriptView />
            </div>
          ) : (
            // Upload/Recording View
            <div className="grid lg:grid-cols-3 gap-6">
              {/* Left Column - Input */}
              <div className="lg:col-span-2 space-y-6">
                <Tabs defaultValue="upload" className="w-full">
                  <TabsList className="grid w-full grid-cols-3 mb-6">
                    <TabsTrigger value="upload" className="gap-2">
                      <Upload className="w-4 h-4" aria-hidden="true" />
                      Upload File
                    </TabsTrigger>
                    <TabsTrigger value="record" className="gap-2">
                      <Mic className="w-4 h-4" aria-hidden="true" />
                      Record
                    </TabsTrigger>
                    <TabsTrigger value="realtime" className="gap-2">
                      <Radio className="w-4 h-4" aria-hidden="true" />
                      Live Transcribe
                    </TabsTrigger>
                  </TabsList>

                  <TabsContent value="upload" className="mt-0">
                    <FileDropzone />
                  </TabsContent>

                  <TabsContent value="record" className="mt-0">
                    <AudioRecorder />
                  </TabsContent>

                  <TabsContent value="realtime" className="mt-0">
                    <RealtimeAudioRecorder
                      apiKey={apiKeys?.elevenlabs || ''}
                      provider="elevenlabs"
                    />
                  </TabsContent>
                </Tabs>

                {/* Processing Status */}
                <ProcessingStatus />
              </div>

              {/* Right Column - Settings */}
              <div className="space-y-6">
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">Transcription Settings</CardTitle>
                    <CardDescription>
                      Choose model and configure options
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <ModelSelector />
                  </CardContent>
                </Card>

                {/* Quick Tips */}
                <Card className="bg-muted/30">
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm font-medium">Quick Tips</CardTitle>
                  </CardHeader>
                  <CardContent className="text-xs text-muted-foreground space-y-2">
                    <p>
                      <strong className="text-foreground">Best Quality:</strong> Use GPT-4o Transcribe for highest accuracy
                    </p>
                    <p>
                      <strong className="text-foreground">Speaker ID:</strong> Use GPT-4o Diarize for meeting transcripts with multiple speakers
                    </p>
                    <p>
                      <strong className="text-foreground">Large Files:</strong> Files over 25MB will be automatically split into chunks
                    </p>
                    <p>
                      <strong className="text-foreground">Formats:</strong> Supports MP3, MP4, M4A, WAV, and WebM
                    </p>
                  </CardContent>
                </Card>
              </div>
            </div>
          )}
        </main>
      </div>

      {/* Footer */}
      <footer className="border-t border-border py-4 mt-auto">
        <div className="container mx-auto px-4 text-center text-xs text-muted-foreground">
          <p>Meeting Transcriber uses OpenAI's Speech-to-Text API. Your audio is processed securely.</p>
        </div>
      </footer>
    </div>
  );
}
