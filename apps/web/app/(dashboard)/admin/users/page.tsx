'use client';

import { useEffect, useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { apiClient } from '@/lib/api/client';

interface AdminUser {
  id: string;
  email: string;
  full_name: string;
  is_active: boolean;
  roles: string[];
}

const ROLES = ['student', 'instructor', 'admin'];

export default function AdminUsersPage() {
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    apiClient
      .get<AdminUser[]>('/api/lms/admin/users')
      .then(setUsers)
      .catch(() => [])
      .finally(() => setLoading(false));
  }, []);

  async function assignRole(targetUserId: string, role: string) {
    await apiClient.patch(`/api/lms/admin/users/${targetUserId}/role`, { role });
    setUsers((prev) => prev.map((u) => (u.id === targetUserId ? { ...u, roles: [role] } : u)));
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">User Management</h1>
        <p className="text-muted-foreground">{users.length} registered users</p>
      </div>

      {loading && <p className="text-muted-foreground">Loading users…</p>}

      {!loading && (
        <div className="overflow-x-auto rounded-lg border">
          <table className="w-full text-sm">
            <thead className="bg-muted text-muted-foreground">
              <tr>
                <th className="px-4 py-3 text-left font-medium">Name</th>
                <th className="px-4 py-3 text-left font-medium">Email</th>
                <th className="px-4 py-3 text-left font-medium">Role</th>
                <th className="px-4 py-3 text-left font-medium">Change Role</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {users.map((user) => (
                <tr key={user.id}>
                  <td className="px-4 py-3 font-medium">{user.full_name}</td>
                  <td className="px-4 py-3">{user.email}</td>
                  <td className="px-4 py-3">
                    {user.roles.map((r) => (
                      <Badge key={r}>{r}</Badge>
                    ))}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex gap-1">
                      {ROLES.filter((r) => !user.roles.includes(r)).map((r) => (
                        <Button
                          key={r}
                          size="sm"
                          variant="outline"
                          onClick={() => assignRole(user.id, r)}
                        >
                          → {r}
                        </Button>
                      ))}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
