import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/config';
import { findUserById, updateUser, deleteUser } from '@/lib/auth/users';

export async function GET(
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

    // Remove password from response
    const { password: _, ...safeUser } = user;

    return NextResponse.json({ user: safeUser });
  } catch (error: any) {
    console.error('Get user error:', error);
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function PATCH(
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
    const body = await request.json();
    const { name, email, status, role } = body;

    const user = await findUserById(id);
    if (!user) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }

    // Prevent modifying superadmin users unless you are superadmin
    if (user.role === 'superadmin' && session.user.role !== 'superadmin') {
      return NextResponse.json(
        { error: 'Cannot modify superadmin users' },
        { status: 403 }
      );
    }

    // Prevent role changes unless superadmin
    if (role && role !== user.role && session.user.role !== 'superadmin') {
      return NextResponse.json(
        { error: 'Only superadmin can change user roles' },
        { status: 403 }
      );
    }

    // Cannot change to/from superadmin via this route
    if (role === 'superadmin' || (user.role === 'superadmin' && role !== 'superadmin')) {
      return NextResponse.json(
        { error: 'Cannot modify superadmin role' },
        { status: 403 }
      );
    }

    const updates: any = {};
    if (name !== undefined) updates.name = name;
    if (email !== undefined) updates.email = email;
    if (status !== undefined) updates.status = status;
    if (role !== undefined && session.user.role === 'superadmin') updates.role = role;

    const updatedUser = await updateUser(id, updates);

    if (!updatedUser) {
      return NextResponse.json(
        { error: 'Failed to update user' },
        { status: 500 }
      );
    }

    const { password: __, ...safeUser } = updatedUser;

    return NextResponse.json({
      message: 'User updated successfully',
      user: safeUser
    });
  } catch (error: any) {
    console.error('Update user error:', error);
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}

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

    // Cannot delete yourself
    if (id === session.user.id) {
      return NextResponse.json(
        { error: 'Cannot delete your own account' },
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

    // Cannot delete superadmin users
    if (user.role === 'superadmin') {
      return NextResponse.json(
        { error: 'Cannot delete superadmin users' },
        { status: 403 }
      );
    }

    // Only superadmin can delete admin users
    if (user.role === 'admin' && session.user.role !== 'superadmin') {
      return NextResponse.json(
        { error: 'Only superadmin can delete admin users' },
        { status: 403 }
      );
    }

    const deleted = await deleteUser(id);

    if (!deleted) {
      return NextResponse.json(
        { error: 'Failed to delete user' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      message: 'User deleted successfully'
    });
  } catch (error: any) {
    console.error('Delete user error:', error);
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}
