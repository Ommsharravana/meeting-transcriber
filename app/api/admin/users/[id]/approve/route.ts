import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/config';
import { findUserById, approveUser } from '@/lib/auth/users';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    if (session.user.role !== 'admin' && session.user.role !== 'superadmin') {
      return NextResponse.json(
        { error: 'Admin access required' },
        { status: 403 }
      );
    }

    const { id } = await params;

    const user = await findUserById(id);
    if (!user) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }

    if (user.status !== 'pending') {
      return NextResponse.json(
        { error: 'User is not pending approval' },
        { status: 400 }
      );
    }

    const approvedUser = await approveUser(id, session.user.id);

    if (!approvedUser) {
      return NextResponse.json(
        { error: 'Failed to approve user' },
        { status: 500 }
      );
    }

    const { password: _, ...safeUser } = approvedUser;

    return NextResponse.json({
      message: 'User approved successfully',
      user: safeUser
    });
  } catch (error: any) {
    console.error('Approve user error:', error);
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}
