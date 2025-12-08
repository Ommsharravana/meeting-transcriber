import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/config';
import { getUserApiKey } from '@/lib/auth/api-keys';
import { logUsage } from '@/lib/usage';

const OPENAI_API_URL = 'https://api.openai.com/v1/audio/transcriptions';

export async function POST(request: NextRequest) {
  console.log('[API Route] Transcribe request received');

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

    // Get user's OpenAI API key from database
    const apiKey = await getUserApiKey(session.user.id, 'openai');

    if (!apiKey) {
      return NextResponse.json(
        { error: { message: 'No OpenAI API key found. Please add your API key in Settings.' } },
        { status: 400 }
      );
    }

    console.log('[API Route] Using user API key for:', session.user.email);

    // Get the form data from the request
    const formData = await request.formData();
    const model = formData.get('model') as string || 'whisper-1';

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

    // Log usage if successful
    if (response.ok) {
      // Try to get audio duration from formdata or response
      const file = formData.get('file') as File | null;
      await logUsage({
        userId: session.user.id,
        action: 'transcribe',
        provider: 'openai',
        model,
        // Note: actual duration would need to be extracted from audio file
        // This is a placeholder - could be enhanced with audio duration extraction
      });
    }

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
