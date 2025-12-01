import { NextRequest, NextResponse } from 'next/server';

const ELEVENLABS_API_URL = 'https://api.elevenlabs.io/v1/speech-to-text';

export async function POST(request: NextRequest) {
  console.log('[API Route] ElevenLabs transcribe request received');

  try {
    // Get the API key from the request header
    const apiKey = request.headers.get('x-elevenlabs-api-key');
    console.log('[API Route] ElevenLabs API key present:', !!apiKey);

    if (!apiKey) {
      return NextResponse.json(
        { error: { message: 'ElevenLabs API key is required' } },
        { status: 401 }
      );
    }

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
