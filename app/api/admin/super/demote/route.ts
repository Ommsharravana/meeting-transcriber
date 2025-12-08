import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/config';
import { findUserById, demoteToUser } from '@/lib/auth/users';

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    // Only superadmin can demote users
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

    // Cannot demote yourself
    if (userId === session.user.id) {
      return NextResponse.json(
        { error: 'Cannot demote yourself' },
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

    if (user.role === 'superadmin') {
      return NextResponse.json(
        { error: 'Cannot demote superadmin users' },
        { status: 403 }
      );
    }

    if (user.role !== 'admin') {
      return NextResponse.json(
        { error: 'User is not an admin' },
        { status: 400 }
      );
    }

    const demotedUser = await demoteToUser(userId);

    if (!demotedUser) {
      return NextResponse.json(
        { error: 'Failed to demote user' },
        { status: 500 }
      );
    }

    const { password: _, ...safeUser } = demotedUser;

    return NextResponse.json({
      message: 'Admin demoted to user successfully',
      user: safeUser
    });
  } catch (error: any) {
    console.error('Demote user error:', error);
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}
