"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { AppSpinner } from "@/components/app-spinner";
import { UsersFilters } from "@/components/users/UsersFilters";
import { UsersPagination } from "@/components/users/UsersPagination";
import { UsersStats } from "@/components/users/UsersStats";
import { UsersTable } from "@/components/users/UsersTable";
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

  const [stats, setStats] = useState(null);
  const [statsLoading, setStatsLoading] = useState(true);

  const [searchInput, setSearchInput] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [page, setPage] = useState(1);
  const [limit] = useState(10);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);

  const [createOpen, setCreateOpen] = useState(false);
  const [createForm, setCreateForm] = useState({ username: "", email: "", password: "", role: "CASHIER" });
  const [createError, setCreateError] = useState("");

  const [editOpen, setEditOpen] = useState(false);
  const [editUser, setEditUser] = useState(null);
  const [editForm, setEditForm] = useState({ role: "CASHIER", isActive: true });
  const [editError, setEditError] = useState("");

  const [resetOpen, setResetOpen] = useState(false);
  const [resetPassword, setResetPassword] = useState("");
  const [resetUser, setResetUser] = useState(null);
  const [resetError, setResetError] = useState("");

  const meId = user?.id ?? "";

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchInput.trim());
      setPage(1);
    }, 300);

    return () => clearTimeout(timer);
  }, [searchInput]);

  const fetchUsers = useCallback(async () => {
    setLoading(true);
    setError("");

    try {
      const query = new URLSearchParams({
        page: String(page),
        limit: String(limit),
        search: debouncedSearch,
        status: statusFilter,
      });

      const response = await fetch(`/api/users?${query.toString()}`, {
        headers: getHeaders(tenant, token),
        cache: "no-store",
      });

      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data?.error || "Failed to load users.");

      setUsers(Array.isArray(data?.users) ? data.users : []);
      setTotal(Number(data?.total ?? 0));
      setTotalPages(Math.max(1, Number(data?.totalPages ?? 1)));
      setPage(Number(data?.page ?? page));
    } catch (err) {
      setError(err.message || "Unexpected error.");
    } finally {
      setLoading(false);
    }
  }, [debouncedSearch, limit, page, statusFilter, tenant, token]);

  const fetchStats = useCallback(async () => {
    setStatsLoading(true);
    try {
      const response = await fetch("/api/users/stats", {
        headers: getHeaders(tenant, token),
        cache: "no-store",
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data?.error || "Failed to load user stats.");
      setStats(data);
    } catch (err) {
      setError(err.message || "Unexpected error.");
    } finally {
      setStatsLoading(false);
    }
  }, [tenant, token]);

  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  useEffect(() => {
    fetchStats();
  }, [fetchStats]);

  const refreshData = useCallback(async () => {
    await Promise.all([fetchUsers(), fetchStats()]);
  }, [fetchStats, fetchUsers]);

  const submitCreate = async (event) => {
    event.preventDefault();
    setCreateError("");

    if (!createForm.username.trim()) return setCreateError("Name is required.");
    if (!createForm.email.trim()) return setCreateError("Email is required.");
    if (!createForm.password || createForm.password.length < 6) return setCreateError("Password must be at least 6 characters.");

    try {
      setBusyId("create");
      const response = await fetch("/api/users", {
        method: "POST",
        headers: getHeaders(tenant, token),
        body: JSON.stringify({
          username: createForm.username.trim(),
          email: createForm.email.trim(),
          password: createForm.password,
          role: createForm.role,
        }),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data?.error || "Failed to create user.");
      setCreateForm({ username: "", email: "", password: "", role: "CASHIER" });
      setCreateOpen(false);
      await refreshData();
    } catch (err) {
      setCreateError(err.message || "Unexpected error.");
    } finally {
      setBusyId("");
    }
  };

  const handleEditClick = (targetUser) => {
    setEditUser(targetUser);
    setEditForm({ role: targetUser.role || "CASHIER", isActive: Boolean(targetUser.isActive) });
    setEditError("");
    setEditOpen(true);
  };

  const submitEdit = async (event) => {
    event.preventDefault();
    if (!editUser?._id) return;

    try {
      setBusyId(editUser._id);

      const roleRequest = fetch(`/api/users/${editUser._id}/role`, {
        method: "PATCH",
        headers: getHeaders(tenant, token),
        body: JSON.stringify({ role: editForm.role }),
      });

      const statusRequest = fetch(`/api/users/${editUser._id}/status`, {
        method: "PATCH",
        headers: getHeaders(tenant, token),
        body: JSON.stringify({ isActive: editForm.isActive }),
      });

      const [roleResponse, statusResponse] = await Promise.all([roleRequest, statusRequest]);
      const roleData = await roleResponse.json().catch(() => ({}));
      const statusData = await statusResponse.json().catch(() => ({}));

      if (!roleResponse.ok) throw new Error(roleData?.error || "Failed to update role.");
      if (!statusResponse.ok) throw new Error(statusData?.error || "Failed to update status.");

      setEditOpen(false);
      setEditUser(null);
      await refreshData();
    } catch (err) {
      setEditError(err.message || "Unexpected error.");
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
      await refreshData();
    } catch (err) {
      setError(err.message || "Unexpected error.");
    } finally {
      setBusyId("");
    }
  };

  const handleDelete = async (targetUser) => {
    await updateStatus(targetUser, false);
  };

  const handleDeactivate = async (targetUser) => {
    await updateStatus(targetUser, false);
  };

  const openReset = (targetUser) => {
    setResetUser(targetUser);
    setResetPassword("");
    setResetError("");
    setResetOpen(true);
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

  const pageSummary = useMemo(() => {
    const start = total === 0 ? 0 : (page - 1) * limit + 1;
    const end = Math.min(total, page * limit);
    return { start, end };
  }, [limit, page, total]);

  return (
    <div className="flex flex-1 flex-col gap-6 bg-white p-4 dark:bg-[#061426] lg:p-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div className="space-y-1">
          <h1 className="text-3xl font-black tracking-tight text-slate-900 dark:text-slate-50">User Management</h1>
          <p className="text-sm text-slate-500 dark:text-slate-300">Manage restaurant staff access and user roles.</p>
        </div>
        <Button className="h-11 gap-2 bg-[#137fec] px-5 text-sm font-bold hover:bg-[#137fec]/90" onClick={() => setCreateOpen(true)}>
          <Plus className="size-4" />
          Add New User
        </Button>
      </div>

      <UsersFilters
        search={searchInput}
        status={statusFilter}
        onSearchChange={setSearchInput}
        onStatusChange={(nextStatus) => {
          setStatusFilter(nextStatus);
          setPage(1);
        }}
      />

      {error ? <p className="text-sm text-destructive">{error}</p> : null}

      <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-[#0c1f30]">
        <UsersTable
          users={users}
          loading={loading}
          busyId={busyId}
          currentUserId={meId}
          onEdit={handleEditClick}
          onDelete={handleDelete}
          onDeactivate={handleDeactivate}
          onResetPassword={openReset}
        />
        <UsersPagination
          page={page}
          totalPages={totalPages}
          total={total}
          start={pageSummary.start}
          end={pageSummary.end}
          onPageChange={setPage}
        />
      </div>

      <UsersStats stats={stats} loading={statsLoading} />

      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create User</DialogTitle>
            <DialogDescription>Add a new tenant user account.</DialogDescription>
          </DialogHeader>
          <form className="space-y-4" onSubmit={submitCreate}>
            <div className="space-y-2"><Label htmlFor="create-username">Name</Label><Input id="create-username" value={createForm.username} onChange={(e) => setCreateForm((prev) => ({ ...prev, username: e.target.value }))} /></div>
            <div className="space-y-2">
              <Label htmlFor="create-email">Email</Label>
              <Input id="create-email" value={createForm.email} onChange={(e) => setCreateForm((prev) => ({ ...prev, email: e.target.value }))} />
              <p className="text-xs text-slate-500 dark:text-slate-300">Tip: You can type &apos;cashier&apos; and it will become &apos;cashier@yourcompany.internal&apos;.</p>
            </div>
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

      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit User</DialogTitle>
            <DialogDescription>Update role and status for <strong>{editUser?.username}</strong>.</DialogDescription>
          </DialogHeader>
          <form className="space-y-4" onSubmit={submitEdit}>
            <div className="space-y-2">
              <Label>Role</Label>
              <Select value={editForm.role} onValueChange={(role) => setEditForm((prev) => ({ ...prev, role }))}>
                <SelectTrigger><SelectValue placeholder="Select role" /></SelectTrigger>
                <SelectContent>{ROLES.map((role) => <SelectItem key={role} value={role}>{role}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Status</Label>
              <Select value={editForm.isActive ? "active" : "inactive"} onValueChange={(value) => setEditForm((prev) => ({ ...prev, isActive: value === "active" }))}>
                <SelectTrigger><SelectValue placeholder="Select status" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="inactive">Inactive</SelectItem>
                </SelectContent>
              </Select>
            </div>
            {editError ? <p className="text-sm text-destructive">{editError}</p> : null}
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setEditOpen(false)}>Cancel</Button>
              <Button type="submit" disabled={!editUser || busyId === editUser?._id}>{busyId === editUser?._id ? <AppSpinner inline size={16} /> : "Save changes"}</Button>
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
