import bcrypt from 'bcryptjs';
import { createServerClient, DbUser } from '../supabase/server';

export interface User {
  id: string;
  email: string;
  name: string;
  password: string;
  role: 'user' | 'admin' | 'superadmin';
  status: 'pending' | 'active' | 'suspended';
  createdAt: string;
  approvedBy?: string;
  approvedAt?: string;
}

// Convert database user to application user
function dbUserToUser(dbUser: DbUser): User {
  return {
    id: dbUser.id,
    email: dbUser.email,
    name: dbUser.name || dbUser.email.split('@')[0],
    password: dbUser.password_hash,
    role: dbUser.role,
    status: dbUser.status,
    createdAt: dbUser.created_at,
    approvedBy: dbUser.approved_by || undefined,
    approvedAt: dbUser.approved_at || undefined,
  };
}

export async function getUsers(): Promise<User[]> {
  const supabase = createServerClient();
  const { data, error } = await supabase
    .from('users')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Error fetching users:', error);
    return [];
  }

  return (data as DbUser[]).map(dbUserToUser);
}

export async function findUserByEmail(email: string): Promise<User | null> {
  const supabase = createServerClient();
  const { data, error } = await supabase
    .from('users')
    .select('*')
    .eq('email', email.toLowerCase())
    .single();

  if (error || !data) {
    return null;
  }

  return dbUserToUser(data as DbUser);
}

export async function findUserById(id: string): Promise<User | null> {
  const supabase = createServerClient();
  const { data, error } = await supabase
    .from('users')
    .select('*')
    .eq('id', id)
    .single();

  if (error || !data) {
    return null;
  }

  return dbUserToUser(data as DbUser);
}

export async function createUser(
  email: string,
  password: string,
  name?: string,
  options?: {
    role?: 'user' | 'admin' | 'superadmin';
    status?: 'pending' | 'active' | 'suspended';
  }
): Promise<User> {
  const supabase = createServerClient();

  // Check if user already exists
  const existingUser = await findUserByEmail(email);
  if (existingUser) {
    throw new Error('An account with this email already exists');
  }

  // Hash password
  const hashedPassword = await bcrypt.hash(password, 12);

  const { data, error } = await supabase
    .from('users')
    .insert({
      email: email.toLowerCase(),
      name: name || email.split('@')[0],
      password_hash: hashedPassword,
      role: options?.role || 'user',
      status: options?.status || 'pending',
    })
    .select()
    .single();

  if (error) {
    console.error('Error creating user:', error);
    throw new Error('Failed to create user');
  }

  return dbUserToUser(data as DbUser);
}

export async function updateUser(
  id: string,
  updates: Partial<{
    name: string;
    email: string;
    role: 'user' | 'admin' | 'superadmin';
    status: 'pending' | 'active' | 'suspended';
    approvedBy: string;
    approvedAt: string;
  }>
): Promise<User | null> {
  const supabase = createServerClient();

  // Convert to database field names
  const dbUpdates: Record<string, unknown> = {};
  if (updates.name !== undefined) dbUpdates.name = updates.name;
  if (updates.email !== undefined) dbUpdates.email = updates.email.toLowerCase();
  if (updates.role !== undefined) dbUpdates.role = updates.role;
  if (updates.status !== undefined) dbUpdates.status = updates.status;
  if (updates.approvedBy !== undefined) dbUpdates.approved_by = updates.approvedBy;
  if (updates.approvedAt !== undefined) dbUpdates.approved_at = updates.approvedAt;

  const { data, error } = await supabase
    .from('users')
    .update(dbUpdates)
    .eq('id', id)
    .select()
    .single();

  if (error) {
    console.error('Error updating user:', error);
    return null;
  }

  return dbUserToUser(data as DbUser);
}

export async function updateUserPassword(
  id: string,
  newPassword: string
): Promise<boolean> {
  const supabase = createServerClient();
  const hashedPassword = await bcrypt.hash(newPassword, 12);

  const { error } = await supabase
    .from('users')
    .update({ password_hash: hashedPassword })
    .eq('id', id);

  if (error) {
    console.error('Error updating password:', error);
    return false;
  }

  return true;
}

export async function deleteUser(id: string): Promise<boolean> {
  const supabase = createServerClient();

  const { error } = await supabase
    .from('users')
    .delete()
    .eq('id', id);

  if (error) {
    console.error('Error deleting user:', error);
    return false;
  }

  return true;
}

export async function approveUser(
  userId: string,
  approverId: string
): Promise<User | null> {
  return updateUser(userId, {
    status: 'active',
    approvedBy: approverId,
    approvedAt: new Date().toISOString(),
  });
}

export async function suspendUser(userId: string): Promise<User | null> {
  return updateUser(userId, { status: 'suspended' });
}

export async function getUsersByStatus(
  status: 'pending' | 'active' | 'suspended'
): Promise<User[]> {
  const supabase = createServerClient();
  const { data, error } = await supabase
    .from('users')
    .select('*')
    .eq('status', status)
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Error fetching users by status:', error);
    return [];
  }

  return (data as DbUser[]).map(dbUserToUser);
}

export async function getUsersByRole(
  role: 'user' | 'admin' | 'superadmin'
): Promise<User[]> {
  const supabase = createServerClient();
  const { data, error } = await supabase
    .from('users')
    .select('*')
    .eq('role', role)
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Error fetching users by role:', error);
    return [];
  }

  return (data as DbUser[]).map(dbUserToUser);
}

export async function promoteToAdmin(userId: string): Promise<User | null> {
  return updateUser(userId, { role: 'admin' });
}

export async function demoteToUser(userId: string): Promise<User | null> {
  return updateUser(userId, { role: 'user' });
}

export async function countUsersByStatus(): Promise<Record<string, number>> {
  const supabase = createServerClient();

  const { data, error } = await supabase
    .from('users')
    .select('status');

  if (error) {
    console.error('Error counting users:', error);
    return { pending: 0, active: 0, suspended: 0 };
  }

  const counts = { pending: 0, active: 0, suspended: 0 };
  for (const user of data) {
    if (user.status in counts) {
      counts[user.status as keyof typeof counts]++;
    }
  }

  return counts;
}
