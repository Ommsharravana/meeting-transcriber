import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/config';
import { getUserApiKey } from '@/lib/auth/api-keys';
import { logUsage } from '@/lib/usage';

const ELEVENLABS_API_URL = 'https://api.elevenlabs.io/v1/speech-to-text';

export async function POST(request: NextRequest) {
  console.log('[API Route] ElevenLabs transcribe request received');

  try {
    // Get authenticated user session
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json(
        { error: { message: 'Authentication required. Please log in.' } },
        { status: 401 }
      );
    }

    // Check if user account is active
    if (session.user.status !== 'active') {
      return NextResponse.json(
        { error: { message: 'Your account is not active. Please contact an administrator.' } },
        { status: 403 }
      );
    }

    // Get user's ElevenLabs API key from database
    const apiKey = await getUserApiKey(session.user.id, 'elevenlabs');

    if (!apiKey) {
      return NextResponse.json(
        { error: { message: 'No ElevenLabs API key found. Please add your API key in Settings.' } },
        { status: 400 }
      );
    }

    console.log('[API Route] Using user ElevenLabs API key for:', session.user.email);

    // Get the form data from the request
    const formData = await request.formData();

    // Forward the request to ElevenLabs
    console.log('[API Route] Forwarding to ElevenLabs...');
    const response = await fetch(ELEVENLABS_API_URL, {
      method: 'POST',
      headers: {
        'xi-api-key': apiKey,
      },
      body: formData,
    });

    console.log('[API Route] ElevenLabs response status:', response.status);

    // Get the response data
    const data = await response.json();
    console.log('[API Route] ElevenLabs response data keys:', Object.keys(data));

    // Log usage if successful
    if (response.ok) {
      await logUsage({
        userId: session.user.id,
        action: 'transcribe',
        provider: 'elevenlabs',
        model: 'elevenlabs-scribe-v1',
      });
    }

    // Return the response with the same status
    return NextResponse.json(data, { status: response.status });
  } catch (error: any) {
    console.error('ElevenLabs Transcription API error:', error);
    return NextResponse.json(
      { error: { message: error.message || 'Internal server error' } },
      { status: 500 }
    );
  }
}

// Route segment config for App Router (Next.js 13+)
// This allows handling large file uploads
export const maxDuration = 120; // Allow up to 120 seconds for ElevenLabs transcription
