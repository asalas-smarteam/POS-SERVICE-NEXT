"use client";

import { useCallback, useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { AppSpinner } from "@/components/app-spinner";
import { useAuthStore } from "../../../store/authStore";

const ROLES = ["ADMIN", "KITCHEN", "CASHIER"];

const getHeaders = (tenant, token) => {
  const tenantSlug = tenant?.slug ?? tenant ?? "";
  return {
    "Content-Type": "application/json",
    ...(tenantSlug ? { "x-tenant": tenantSlug } : {}),
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
};

export default function UsersPage() {
  const tenant = useAuthStore((state) => state.tenant);
  const token = useAuthStore((state) => state.token);
  const user = useAuthStore((state) => state.user);

  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [busyId, setBusyId] = useState("");
  const [createOpen, setCreateOpen] = useState(false);
  const [createForm, setCreateForm] = useState({ username: "", password: "", role: "CASHIER" });
  const [createError, setCreateError] = useState("");
  const [resetOpen, setResetOpen] = useState(false);
  const [resetPassword, setResetPassword] = useState("");
  const [resetUser, setResetUser] = useState(null);
  const [resetError, setResetError] = useState("");

  const meId = user?.id ?? "";

  const fetchUsers = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const response = await fetch("/api/users", {
        headers: getHeaders(tenant, token),
        cache: "no-store",
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data?.error || "Failed to load users.");
      setUsers(Array.isArray(data) ? data : []);
    } catch (err) {
      setError(err.message || "Unexpected error.");
    } finally {
      setLoading(false);
    }
  }, [tenant, token]);

  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  const submitCreate = async (event) => {
    event.preventDefault();
    setCreateError("");
    if (!createForm.username.trim()) return setCreateError("Username is required.");
    if (!createForm.password || createForm.password.length < 6) return setCreateError("Password must be at least 6 characters.");

    try {
      setBusyId("create");
      const response = await fetch("/api/users", {
        method: "POST",
        headers: getHeaders(tenant, token),
        body: JSON.stringify({ username: createForm.username.trim(), password: createForm.password, role: createForm.role }),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data?.error || "Failed to create user.");
      setCreateForm({ username: "", password: "", role: "CASHIER" });
      setCreateOpen(false);
      await fetchUsers();
    } catch (err) {
      setCreateError(err.message || "Unexpected error.");
    } finally {
      setBusyId("");
    }
  };

  const updateRole = async (targetUser, role) => {
    try {
      setBusyId(targetUser._id);
      const response = await fetch(`/api/users/${targetUser._id}/role`, {
        method: "PATCH",
        headers: getHeaders(tenant, token),
        body: JSON.stringify({ role }),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data?.error || "Failed to update role.");
      await fetchUsers();
    } catch (err) {
      setError(err.message || "Unexpected error.");
    } finally {
      setBusyId("");
    }
  };

  const updateStatus = async (targetUser, isActive) => {
    try {
      setBusyId(targetUser._id);
      const response = await fetch(`/api/users/${targetUser._id}/status`, {
        method: "PATCH",
        headers: getHeaders(tenant, token),
        body: JSON.stringify({ isActive }),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data?.error || "Failed to update status.");
      await fetchUsers();
    } catch (err) {
      setError(err.message || "Unexpected error.");
    } finally {
      setBusyId("");
    }
  };

  const submitResetPassword = async (event) => {
    event.preventDefault();
    setResetError("");
    if (!resetPassword || resetPassword.length < 6) return setResetError("Password must be at least 6 characters.");

    try {
      setBusyId(resetUser?._id || "reset");
      const response = await fetch(`/api/users/${resetUser?._id}/reset-password`, {
        method: "PATCH",
        headers: getHeaders(tenant, token),
        body: JSON.stringify({ newPassword: resetPassword }),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data?.error || "Failed to reset password.");
      setResetPassword("");
      setResetOpen(false);
      setResetUser(null);
    } catch (err) {
      setResetError(err.message || "Unexpected error.");
    } finally {
      setBusyId("");
    }
  };

  const content = loading ? (
    <AppSpinner className="h-48" />
  ) : (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Username</TableHead>
          <TableHead>Role</TableHead>
          <TableHead>Status</TableHead>
          <TableHead className="text-right">Actions</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {users.map((item) => {
          const isBusy = busyId === item._id;
          const isSelf = meId && String(item._id) === String(meId);
          return (
            <TableRow key={item._id}>
              <TableCell className="font-medium">{item.username}</TableCell>
              <TableCell>
                <Select disabled={isBusy} value={item.role} onValueChange={(nextRole) => updateRole(item, nextRole)}>
                  <SelectTrigger className="w-[140px]"><SelectValue placeholder="Select role" /></SelectTrigger>
                  <SelectContent>{ROLES.map((role) => <SelectItem key={role} value={role}>{role}</SelectItem>)}</SelectContent>
                </Select>
              </TableCell>
              <TableCell><Badge variant={item.isActive ? "default" : "secondary"}>{item.isActive ? "Active" : "Inactive"}</Badge></TableCell>
              <TableCell>
                <div className="flex items-center justify-end gap-2">
                  <Button variant="outline" size="sm" disabled={isBusy} onClick={() => { setResetUser(item); setResetPassword(""); setResetError(""); setResetOpen(true); }}>
                    Reset Password
                  </Button>
                  <div className="flex items-center gap-2 text-sm">
                    <Switch checked={Boolean(item.isActive)} disabled={isBusy || (isSelf && item.isActive)} onCheckedChange={(checked) => updateStatus(item, checked)} />
                    <span>{item.isActive ? "Deactivate" : "Activate"}</span>
                  </div>
                </div>
              </TableCell>
            </TableRow>
          );
        })}
      </TableBody>
    </Table>
  );

  return (
    <div className="flex flex-1 flex-col gap-4 p-4 lg:p-6">
      <div className="flex items-center justify-between gap-2">
        <div>
          <h1 className="text-xl font-semibold">User Management</h1>
          <p className="text-sm text-muted-foreground">Manage users, roles, and account status.</p>
        </div>
        <Button onClick={() => setCreateOpen(true)}>Create User</Button>
      </div>
      {error ? <p className="text-sm text-destructive">{error}</p> : null}
      <div className="rounded-md border">{content}</div>

      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create User</DialogTitle>
            <DialogDescription>Add a new tenant user account.</DialogDescription>
          </DialogHeader>
          <form className="space-y-4" onSubmit={submitCreate}>
            <div className="space-y-2"><Label htmlFor="create-username">Username</Label><Input id="create-username" value={createForm.username} onChange={(e) => setCreateForm((prev) => ({ ...prev, username: e.target.value }))} /></div>
            <div className="space-y-2"><Label htmlFor="create-password">Password</Label><Input id="create-password" type="password" value={createForm.password} onChange={(e) => setCreateForm((prev) => ({ ...prev, password: e.target.value }))} /></div>
            <div className="space-y-2">
              <Label>Role</Label>
              <Select value={createForm.role} onValueChange={(role) => setCreateForm((prev) => ({ ...prev, role }))}>
                <SelectTrigger><SelectValue placeholder="Select role" /></SelectTrigger>
                <SelectContent>{ROLES.map((role) => <SelectItem key={role} value={role}>{role}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            {createError ? <p className="text-sm text-destructive">{createError}</p> : null}
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setCreateOpen(false)}>Cancel</Button>
              <Button type="submit" disabled={busyId === "create"}>{busyId === "create" ? <AppSpinner inline size={16} /> : "Create"}</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={resetOpen} onOpenChange={setResetOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Reset Password</DialogTitle>
            <DialogDescription>Set a new password for <strong>{resetUser?.username}</strong>.</DialogDescription>
          </DialogHeader>
          <form className="space-y-4" onSubmit={submitResetPassword}>
            <div className="space-y-2"><Label htmlFor="reset-password">New Password</Label><Input id="reset-password" type="password" value={resetPassword} onChange={(e) => setResetPassword(e.target.value)} /></div>
            {resetError ? <p className="text-sm text-destructive">{resetError}</p> : null}
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => { setResetOpen(false); setResetPassword(""); setResetUser(null); }}>Cancel</Button>
              <Button type="submit" disabled={!resetUser || busyId === resetUser?._id}>{busyId === resetUser?._id ? <AppSpinner inline size={16} /> : "Reset"}</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
