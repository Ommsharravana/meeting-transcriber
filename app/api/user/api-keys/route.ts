import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/config';
import {
  getUserApiKeys,
  saveUserApiKey,
  deleteUserApiKey,
  validateApiKeyFormat,
} from '@/lib/auth/api-keys';

// GET - Get user's API keys (masked)
export async function GET() {
  const session = await getServerSession(authOptions);

  if (!session?.user?.id) {
    return NextResponse.json(
      { error: { message: 'Unauthorized' } },
      { status: 401 }
    );
  }

  try {
    const keys = await getUserApiKeys(session.user.id);
    return NextResponse.json({ keys });
  } catch (error: any) {
    console.error('Error fetching API keys:', error);
    return NextResponse.json(
      { error: { message: 'Failed to fetch API keys' } },
      { status: 500 }
    );
  }
}

// POST - Save or update an API key
export async function POST(request: NextRequest) {
  const session = await getServerSession(authOptions);

  if (!session?.user?.id) {
    return NextResponse.json(
      { error: { message: 'Unauthorized' } },
      { status: 401 }
    );
  }

  try {
    const body = await request.json();
    const { provider, key } = body;

    // Validate provider
    if (!provider || !['openai', 'elevenlabs'].includes(provider)) {
      return NextResponse.json(
        { error: { message: 'Invalid provider. Must be "openai" or "elevenlabs"' } },
        { status: 400 }
      );
    }

    // Validate key format
    const validation = validateApiKeyFormat(provider, key);
    if (!validation.valid) {
      return NextResponse.json(
        { error: { message: validation.error } },
        { status: 400 }
      );
    }

    const success = await saveUserApiKey(session.user.id, provider, key);

    if (!success) {
      return NextResponse.json(
        { error: { message: 'Failed to save API key' } },
        { status: 500 }
      );
    }

    return NextResponse.json({
      message: 'API key saved successfully',
      provider,
    });
  } catch (error: any) {
    console.error('Error saving API key:', error);
    return NextResponse.json(
      { error: { message: 'Failed to save API key' } },
      { status: 500 }
    );
  }
}

// DELETE - Delete an API key
export async function DELETE(request: NextRequest) {
  const session = await getServerSession(authOptions);

  if (!session?.user?.id) {
    return NextResponse.json(
      { error: { message: 'Unauthorized' } },
      { status: 401 }
    );
  }

  try {
    const { searchParams } = new URL(request.url);
    const provider = searchParams.get('provider');

    if (!provider || !['openai', 'elevenlabs'].includes(provider)) {
      return NextResponse.json(
        { error: { message: 'Invalid provider. Must be "openai" or "elevenlabs"' } },
        { status: 400 }
      );
    }

    const success = await deleteUserApiKey(
      session.user.id,
      provider as 'openai' | 'elevenlabs'
    );

    if (!success) {
      return NextResponse.json(
        { error: { message: 'Failed to delete API key' } },
        { status: 500 }
      );
    }

    return NextResponse.json({
      message: 'API key deleted successfully',
      provider,
    });
  } catch (error: any) {
    console.error('Error deleting API key:', error);
    return NextResponse.json(
      { error: { message: 'Failed to delete API key' } },
      { status: 500 }
    );
  }
}
