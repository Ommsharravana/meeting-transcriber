import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/config';
import { findUserById, suspendUser, updateUser } from '@/lib/auth/users';

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

    // Cannot suspend yourself
    if (id === session.user.id) {
      return NextResponse.json(
        { error: 'Cannot suspend your own account' },
        { status: 400 }
      );
    }

    const user = await findUserById(id);
    if (!user) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }

    // Cannot suspend superadmin
    if (user.role === 'superadmin') {
      return NextResponse.json(
        { error: 'Cannot suspend superadmin users' },
        { status: 403 }
      );
    }

    // Only superadmin can suspend admin users
    if (user.role === 'admin' && session.user.role !== 'superadmin') {
      return NextResponse.json(
        { error: 'Only superadmin can suspend admin users' },
        { status: 403 }
      );
    }

    const suspendedUser = await suspendUser(id);

    if (!suspendedUser) {
      return NextResponse.json(
        { error: 'Failed to suspend user' },
        { status: 500 }
      );
    }

    const { password: _, ...safeUser } = suspendedUser;

    return NextResponse.json({
      message: 'User suspended successfully',
      user: safeUser
    });
  } catch (error: any) {
    console.error('Suspend user error:', error);
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}

// Unsuspend user
export async function DELETE(
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

    if (user.status !== 'suspended') {
      return NextResponse.json(
        { error: 'User is not suspended' },
        { status: 400 }
      );
    }

    const reactivatedUser = await updateUser(id, { status: 'active' });

    if (!reactivatedUser) {
      return NextResponse.json(
        { error: 'Failed to unsuspend user' },
        { status: 500 }
      );
    }

    const { password: __, ...safeUser } = reactivatedUser;

    return NextResponse.json({
      message: 'User unsuspended successfully',
      user: safeUser
    });
  } catch (error: any) {
    console.error('Unsuspend user error:', error);
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}
