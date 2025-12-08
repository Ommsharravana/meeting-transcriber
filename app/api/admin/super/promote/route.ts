import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/config';
import { findUserById, promoteToAdmin } from '@/lib/auth/users';

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    // Only superadmin can promote users
    if (session.user.role !== 'superadmin') {
      return NextResponse.json(
        { error: 'Superadmin access required' },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { userId } = body;

    if (!userId) {
      return NextResponse.json(
        { error: 'User ID is required' },
        { status: 400 }
      );
    }

    const user = await findUserById(userId);
    if (!user) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }

    if (user.role === 'admin' || user.role === 'superadmin') {
      return NextResponse.json(
        { error: 'User is already an admin' },
        { status: 400 }
      );
    }

    if (user.status !== 'active') {
      return NextResponse.json(
        { error: 'Only active users can be promoted' },
        { status: 400 }
      );
    }

    const promotedUser = await promoteToAdmin(userId);

    if (!promotedUser) {
      return NextResponse.json(
        { error: 'Failed to promote user' },
        { status: 500 }
      );
    }

    const { password: _, ...safeUser } = promotedUser;

    return NextResponse.json({
      message: 'User promoted to admin successfully',
      user: safeUser
    });
  } catch (error: any) {
    console.error('Promote user error:', error);
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}
