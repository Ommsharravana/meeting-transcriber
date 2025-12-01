import { NextRequest, NextResponse } from 'next/server';

const OPENAI_API_URL = 'https://api.openai.com/v1/audio/transcriptions';

export async function POST(request: NextRequest) {
  console.log('[API Route] Transcribe request received');

  try {
    // Get the API key from the request header
    const apiKey = request.headers.get('x-openai-api-key');
    console.log('[API Route] API key present:', !!apiKey);

    if (!apiKey) {
      return NextResponse.json(
        { error: { message: 'API key is required' } },
        { status: 401 }
      );
    }

    // Get the form data from the request
    const formData = await request.formData();

    // Forward the request to OpenAI
    console.log('[API Route] Forwarding to OpenAI...');
    const response = await fetch(OPENAI_API_URL, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
      },
      body: formData,
    });

    console.log('[API Route] OpenAI response status:', response.status);

    // Get the response data
    const data = await response.json();
    console.log('[API Route] Response data keys:', Object.keys(data));

    // Return the response with the same status
    return NextResponse.json(data, { status: response.status });
  } catch (error: any) {
    console.error('Transcription API error:', error);
    return NextResponse.json(
      { error: { message: error.message || 'Internal server error' } },
      { status: 500 }
    );
  }
}

// Route segment config for App Router (Next.js 13+)
// This allows handling large file uploads
export const maxDuration = 60; // Allow up to 60 seconds for transcription
