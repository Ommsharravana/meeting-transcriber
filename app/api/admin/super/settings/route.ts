import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/config';
import { createServerClient } from '@/lib/supabase/server';

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    if (session.user.role !== 'superadmin') {
      return NextResponse.json(
        { error: 'Superadmin access required' },
        { status: 403 }
      );
    }

    const supabase = createServerClient();
    const { data: settings, error } = await supabase
      .from('system_settings')
      .select('*');

    if (error) {
      console.error('Get settings error:', error);
      return NextResponse.json(
        { error: 'Failed to fetch settings' },
        { status: 500 }
      );
    }

    // Convert array to object for easier use
    const settingsMap: Record<string, any> = {};
    settings?.forEach((s) => {
      settingsMap[s.key] = s.value;
    });

    return NextResponse.json({ settings: settingsMap });
  } catch (error: any) {
    console.error('Settings API error:', error);
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    if (session.user.role !== 'superadmin') {
      return NextResponse.json(
        { error: 'Superadmin access required' },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { key, value } = body;

    if (!key) {
      return NextResponse.json(
        { error: 'Setting key is required' },
        { status: 400 }
      );
    }

    const supabase = createServerClient();

    // Upsert the setting
    const { error } = await supabase
      .from('system_settings')
      .upsert({
        key,
        value,
        updated_by: session.user.id,
        updated_at: new Date().toISOString()
      }, {
        onConflict: 'key'
      });

    if (error) {
      console.error('Update setting error:', error);
      return NextResponse.json(
        { error: 'Failed to update setting' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      message: 'Setting updated successfully'
    });
  } catch (error: any) {
    console.error('Settings API error:', error);
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    if (session.user.role !== 'superadmin') {
      return NextResponse.json(
        { error: 'Superadmin access required' },
        { status: 403 }
      );
    }

    const { searchParams } = new URL(request.url);
    const key = searchParams.get('key');

    if (!key) {
      return NextResponse.json(
        { error: 'Setting key is required' },
        { status: 400 }
      );
    }

    const supabase = createServerClient();

    const { error } = await supabase
      .from('system_settings')
      .delete()
      .eq('key', key);

    if (error) {
      console.error('Delete setting error:', error);
      return NextResponse.json(
        { error: 'Failed to delete setting' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      message: 'Setting deleted successfully'
    });
  } catch (error: any) {
    console.error('Settings API error:', error);
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}
