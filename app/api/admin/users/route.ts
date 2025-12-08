import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/config';
import { getUsers, createUser, getUsersByStatus, getUsersByRole } from '@/lib/auth/users';

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    // Check admin role
    if (session.user.role !== 'admin' && session.user.role !== 'superadmin') {
      return NextResponse.json(
        { error: 'Admin access required' },
        { status: 403 }
      );
    }

    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status');
    const role = searchParams.get('role');
    const search = searchParams.get('search');

    let users;

    if (status && status !== 'all') {
      users = await getUsersByStatus(status as 'pending' | 'active' | 'suspended');
    } else if (role && role !== 'all') {
      users = await getUsersByRole(role as 'user' | 'admin' | 'superadmin');
    } else {
      users = await getUsers();
    }

    // Filter by search query if provided
    if (search) {
      const searchLower = search.toLowerCase();
      users = users.filter(
        (user) =>
          user.email.toLowerCase().includes(searchLower) ||
          user.name?.toLowerCase().includes(searchLower)
      );
    }

    // Remove passwords from response
    const safeUsers = users.map(({ password: _, ...user }) => user);

    return NextResponse.json({ users: safeUsers });
  } catch (error: any) {
    console.error('Admin users API error:', error);
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

    // Check admin role
    if (session.user.role !== 'admin' && session.user.role !== 'superadmin') {
      return NextResponse.json(
        { error: 'Admin access required' },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { email, password, name, role = 'user' } = body;

    if (!email || !password) {
      return NextResponse.json(
        { error: 'Email and password are required' },
        { status: 400 }
      );
    }

    // Only superadmin can create admin users
    if (role === 'admin' && session.user.role !== 'superadmin') {
      return NextResponse.json(
        { error: 'Only superadmin can create admin users' },
        { status: 403 }
      );
    }

    // Cannot create superadmin users via API
    if (role === 'superadmin') {
      return NextResponse.json(
        { error: 'Cannot create superadmin users' },
        { status: 403 }
      );
    }

    // Admin-created users are auto-approved
    const user = await createUser(email, password, name);

    // Import updateUser to set status and role
    const { updateUser } = await import('@/lib/auth/users');
    await updateUser(user.id, {
      status: 'active',
      role,
      approvedBy: session.user.id,
      approvedAt: new Date().toISOString()
    });

    return NextResponse.json({
      message: 'User created successfully',
      user: { id: user.id, email: user.email, name: user.name, role, status: 'active' }
    });
  } catch (error: any) {
    console.error('Admin create user error:', error);

    if (error.message === 'User already exists') {
      return NextResponse.json(
        { error: 'A user with this email already exists' },
        { status: 409 }
      );
    }

    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}
