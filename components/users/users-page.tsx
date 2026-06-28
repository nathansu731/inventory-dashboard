"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import Link from "next/link"
import { Check, Mail, Pencil, ShieldCheck, Trash2, UserPlus } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"

type UserRole = "admin" | "manager"
type InviteState = "sent" | "accepted"

type UserRow = {
  userId: string
  name: string
  email: string
  firstName: string
  lastName: string
  role: UserRole
  inviteState: InviteState
  isActive: boolean
}

type UsersPayload = {
  currentUserRole: UserRole
  canManageUsers: boolean
  summary?: {
    plan?: string
    seatLimit?: number
    seatsUsed?: number
    canInviteMore?: boolean
  }
  items: UserRow[]
}

const inviteBadgeVariant = (state: InviteState) => (state === "accepted" ? "secondary" : "outline")

export const UsersPage = () => {
  const [users, setUsers] = useState<UserRow[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [currentUserRole, setCurrentUserRole] = useState<UserRole>("admin")
  const [seatLimit, setSeatLimit] = useState<number | null>(null)
  const [seatsUsed, setSeatsUsed] = useState(0)
  const [planName, setPlanName] = useState("Launch")

  const [showAddDialog, setShowAddDialog] = useState(false)
  const [showEditDialog, setShowEditDialog] = useState(false)
  const [showDeleteDialog, setShowDeleteDialog] = useState(false)
  const [selectedUser, setSelectedUser] = useState<UserRow | null>(null)

  const [saving, setSaving] = useState(false)
  const [addForm, setAddForm] = useState({ firstName: "", lastName: "", email: "", role: "manager" as UserRole })
  const [editForm, setEditForm] = useState({ firstName: "", lastName: "", role: "manager" as UserRole })

  const isManager = currentUserRole === "manager"
  const inviteBlockedBySeats = typeof seatLimit === "number" ? seatsUsed >= seatLimit : false

  const loadUsers = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch("/api/users", { cache: "no-store" })
      if (!res.ok) {
        const payload = (await res.json().catch(() => ({}))) as { error?: string }
        throw new Error(payload.error || `request_failed_${res.status}`)
      }
      const payload = (await res.json()) as UsersPayload
      setUsers(Array.isArray(payload.items) ? payload.items : [])
      setCurrentUserRole(payload.currentUserRole === "manager" ? "manager" : "admin")
      const rawPlan = String(payload.summary?.plan || "launch").toLowerCase()
      setPlanName(rawPlan === "enterprise" ? "Enterprise" : rawPlan === "professional" ? "Professional" : "Launch")
      setSeatLimit(typeof payload.summary?.seatLimit === "number" ? payload.summary.seatLimit : null)
      setSeatsUsed(typeof payload.summary?.seatsUsed === "number" ? payload.summary.seatsUsed : 0)
    } catch (err) {
      setUsers([])
      setError(err instanceof Error ? err.message : "failed_to_load_users")
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void loadUsers()
  }, [loadUsers])

  const adminCount = useMemo(() => users.filter((user) => user.role === "admin").length, [users])
  const activeUsers = useMemo(() => users.filter((user) => user.inviteState === "accepted"), [users])
  const pendingUsers = useMemo(() => users.filter((user) => user.inviteState === "sent"), [users])
  const isProtectedFinalAdmin = useCallback(
    (user: UserRow | null) => Boolean(user && user.role === "admin" && user.isActive && adminCount <= 1),
    [adminCount]
  )

  const openEdit = (user: UserRow) => {
    setSelectedUser(user)
    setEditForm({ firstName: user.firstName, lastName: user.lastName, role: user.role })
    setShowEditDialog(true)
  }

  const openDelete = (user: UserRow) => {
    if (isProtectedFinalAdmin(user)) return
    setSelectedUser(user)
    setShowDeleteDialog(true)
  }

  const createUser = async () => {
    setSaving(true)
    setError(null)
    try {
      const res = await fetch("/api/users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(addForm),
      })
      if (!res.ok) {
        const payload = (await res.json().catch(() => ({}))) as { error?: string }
        throw new Error(payload.error || `request_failed_${res.status}`)
      }
      setShowAddDialog(false)
      setAddForm({ firstName: "", lastName: "", email: "", role: "manager" })
      await loadUsers()
    } catch (err) {
      const message = err instanceof Error ? err.message : "failed_to_invite_user"
      if (message === "seat_limit_exceeded") {
        setError("Seat limit reached for your current plan. Upgrade to add more users.")
      } else {
        setError(message)
      }
    } finally {
      setSaving(false)
    }
  }

  const updateUser = async () => {
    if (!selectedUser) return
    setSaving(true)
    setError(null)
    try {
      const res = await fetch(`/api/users/${encodeURIComponent(selectedUser.userId)}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(editForm),
      })
      if (!res.ok) {
        const payload = (await res.json().catch(() => ({}))) as { error?: string }
        throw new Error(payload.error || `request_failed_${res.status}`)
      }
      setShowEditDialog(false)
      setSelectedUser(null)
      await loadUsers()
    } catch (err) {
      setError(err instanceof Error ? err.message : "failed_to_update_user")
    } finally {
      setSaving(false)
    }
  }

  const deleteUser = async () => {
    if (!selectedUser) return
    setSaving(true)
    setError(null)
    try {
      if (isProtectedFinalAdmin(selectedUser)) {
        throw new Error("last_admin_cannot_be_deleted")
      }
      const res = await fetch(`/api/users/${encodeURIComponent(selectedUser.userId)}`, {
        method: "DELETE",
      })
      if (!res.ok) {
        const payload = (await res.json().catch(() => ({}))) as { error?: string }
        throw new Error(payload.error || `request_failed_${res.status}`)
      }
      setShowDeleteDialog(false)
      setSelectedUser(null)
      await loadUsers()
    } catch (err) {
      const message = err instanceof Error ? err.message : "failed_to_delete_user"
      setError(message === "last_admin_cannot_be_deleted" ? "You cannot delete the final active admin." : message)
    } finally {
      setSaving(false)
    }
  }

  const resendInvite = async (user: UserRow) => {
    setSaving(true)
    setError(null)
    try {
      const res = await fetch(`/api/users/${encodeURIComponent(user.userId)}/resend-invite`, {
        method: "POST",
      })
      if (!res.ok) {
        const payload = (await res.json().catch(() => ({}))) as { error?: string }
        throw new Error(payload.error || `request_failed_${res.status}`)
      }
      await loadUsers()
    } catch (err) {
      setError(err instanceof Error ? err.message : "failed_to_resend_invite")
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="container max-w-[2000px] mx-auto p-5 min-w-0 space-y-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-3xl font-bold text-foreground">Manage Users</h1>
            <p className="text-muted-foreground mt-1">
              Invite and manage tenant users. Managers have read-only access.
            </p>
          </div>
          <Button onClick={() => setShowAddDialog(true)} disabled={isManager || inviteBlockedBySeats}>
            <UserPlus className="mr-2 h-4 w-4" />
            Add User
          </Button>
        </div>

        {isManager && (
          <Card className="border-blue-100 bg-blue-50/70">
            <CardContent className="p-4 text-sm text-blue-900">
              You are signed in as a Manager. User management and subscription changes are read-only.
            </CardContent>
          </Card>
        )}

        {error && (
          <div className="rounded-md border border-destructive/40 bg-destructive/5 p-4 text-sm text-destructive">
            {error}
          </div>
        )}

        {typeof seatLimit === "number" && (
          <Card className={inviteBlockedBySeats ? "border-amber-200 bg-amber-50/70 py-0" : "py-0"}>
            <CardContent className="p-4 text-sm flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <span className="font-medium">{planName} plan seats:</span> {seatsUsed}/{seatLimit}
                {inviteBlockedBySeats ? " (limit reached)" : ""}
              </div>
              {inviteBlockedBySeats && !isManager && (
                <Button asChild size="sm" className="w-full sm:w-auto">
                  <Link
                    href={
                      planName === "Launch"
                        ? "/account-and-subscription?upgrade=professional&step=payment"
                        : "/account-and-subscription?upgrade=enterprise&step=plan-details"
                    }
                  >
                    {planName === "Launch" ? "Upgrade to Professional" : "Upgrade to Enterprise"}
                  </Link>
                </Button>
              )}
            </CardContent>
          </Card>
        )}

        <Card>
          <CardHeader>
            <CardTitle>Tenant Users</CardTitle>
            <CardDescription>{users.length} users, {activeUsers.length} active, {pendingUsers.length} pending, {adminCount} admins</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="overflow-hidden rounded-lg border">
              <Table>
                <TableHeader className="bg-muted">
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Role</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {loading ? (
                    <TableRow>
                      <TableCell colSpan={5} className="h-20 text-center text-muted-foreground">
                        Loading users...
                      </TableCell>
                    </TableRow>
                  ) : activeUsers.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={5} className="h-20 text-center text-muted-foreground">
                        No active users found for this tenant.
                      </TableCell>
                    </TableRow>
                  ) : (
                    activeUsers.map((user) => (
                      <TableRow key={user.userId}>
                        <TableCell className="font-medium">{user.name}</TableCell>
                        <TableCell>{user.email}</TableCell>
                        <TableCell>
                          <Badge variant={user.role === "admin" ? "default" : "outline"}>
                            {user.role === "admin" ? "Admin" : "Manager"}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <Badge variant={inviteBadgeVariant(user.inviteState)}>Active</Badge>
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="inline-flex items-center gap-2">
                            <Button size="icon" variant="outline" disabled={isManager} onClick={() => openEdit(user)}>
                              <span className="sr-only">Edit user</span>
                              <Pencil className="h-4 w-4" />
                            </Button>
                            <Button
                              size="icon"
                              variant="outline"
                              disabled
                              onClick={() => resendInvite(user)}
                            >
                              <span className="sr-only">Invite already accepted</span>
                              <Mail className="h-4 w-4" />
                            </Button>
                            <Button
                              size="icon"
                              variant="outline"
                              disabled={isManager || isProtectedFinalAdmin(user)}
                              onClick={() => openDelete(user)}
                            >
                              <span className="sr-only">Delete user</span>
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>

            <div className="mt-5">
              <div className="mb-3">
                <h3 className="text-sm font-medium text-foreground">Pending Invites</h3>
                <p className="text-sm text-muted-foreground">
                  Invitations waiting for the recipient to sign in and accept access.
                </p>
              </div>
              <div className="overflow-hidden rounded-lg border">
                <Table>
                  <TableHeader className="bg-muted">
                    <TableRow>
                      <TableHead>Name</TableHead>
                      <TableHead>Email</TableHead>
                      <TableHead>Role</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {loading ? (
                      <TableRow>
                        <TableCell colSpan={5} className="h-20 text-center text-muted-foreground">
                          Loading invites...
                        </TableCell>
                      </TableRow>
                    ) : pendingUsers.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={5} className="h-20 text-center text-muted-foreground">
                          No pending invites. New invitations will appear here until accepted.
                        </TableCell>
                      </TableRow>
                    ) : (
                      pendingUsers.map((user) => (
                        <TableRow key={user.userId}>
                          <TableCell className="font-medium">{user.name}</TableCell>
                          <TableCell>{user.email}</TableCell>
                          <TableCell>
                            <Badge variant={user.role === "admin" ? "default" : "outline"}>
                              {user.role === "admin" ? "Admin" : "Manager"}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <Badge variant={inviteBadgeVariant(user.inviteState)}>Invite Sent</Badge>
                          </TableCell>
                          <TableCell className="text-right">
                            <div className="inline-flex items-center gap-2">
                              <Button size="icon" variant="outline" disabled={isManager} onClick={() => openEdit(user)}>
                                <span className="sr-only">Edit invited user</span>
                                <Pencil className="h-4 w-4" />
                              </Button>
                              <Button
                                size="icon"
                                variant="outline"
                                disabled={isManager || saving}
                                onClick={() => resendInvite(user)}
                              >
                                <span className="sr-only">Resend invite</span>
                                <Mail className="h-4 w-4" />
                              </Button>
                              <Button
                                size="icon"
                                variant="outline"
                                disabled={isManager || isProtectedFinalAdmin(user)}
                                onClick={() => openDelete(user)}
                              >
                                <span className="sr-only">Delete invited user</span>
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Role Access</CardTitle>
            <CardDescription>Two permission levels are available in this workspace.</CardDescription>
          </CardHeader>
          <CardContent className="grid gap-3 lg:grid-cols-2">
            <div className="rounded-lg border bg-muted/20 p-4">
              <div className="flex items-center gap-2">
                <Badge>Admin</Badge>
                <span className="text-sm font-medium text-foreground">Full workspace control</span>
              </div>
              <div className="mt-3 space-y-2 text-sm text-muted-foreground">
                <div className="flex items-start gap-2">
                  <Check className="mt-0.5 h-4 w-4 text-emerald-600" />
                  <span>Invite, edit, remove, and resend invites for tenant users.</span>
                </div>
                <div className="flex items-start gap-2">
                  <Check className="mt-0.5 h-4 w-4 text-emerald-600" />
                  <span>Manage billing, subscription upgrades, and connected data sources.</span>
                </div>
                <div className="flex items-start gap-2">
                  <Check className="mt-0.5 h-4 w-4 text-emerald-600" />
                  <span>Configure forecast inputs, approvals, and operational settings.</span>
                </div>
              </div>
            </div>
            <div className="rounded-lg border bg-muted/20 p-4">
              <div className="flex items-center gap-2">
                <Badge variant="outline">Manager</Badge>
                <span className="text-sm font-medium text-foreground">Operational read-only access</span>
              </div>
              <div className="mt-3 space-y-2 text-sm text-muted-foreground">
                <div className="flex items-start gap-2">
                  <Check className="mt-0.5 h-4 w-4 text-emerald-600" />
                  <span>View dashboards, forecasts, KPIs, replenishment, and saved reports.</span>
                </div>
                <div className="flex items-start gap-2">
                  <ShieldCheck className="mt-0.5 h-4 w-4 text-amber-600" />
                  <span>Cannot manage users, subscription settings, or third-party connections.</span>
                </div>
                <div className="flex items-start gap-2">
                  <ShieldCheck className="mt-0.5 h-4 w-4 text-amber-600" />
                  <span>Sees the same planning outputs, but with administrative controls disabled.</span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Invite User</DialogTitle>
            <DialogDescription>
              Add first name, last name, email, and role. Cognito sends an invite email with a temporary password.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-2">
            <div className="grid gap-2">
              <Label htmlFor="add-first-name">First Name</Label>
              <Input
                id="add-first-name"
                value={addForm.firstName}
                onChange={(event) => setAddForm((prev) => ({ ...prev, firstName: event.target.value }))}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="add-last-name">Last Name</Label>
              <Input
                id="add-last-name"
                value={addForm.lastName}
                onChange={(event) => setAddForm((prev) => ({ ...prev, lastName: event.target.value }))}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="add-email">Email</Label>
              <Input
                id="add-email"
                type="email"
                value={addForm.email}
                onChange={(event) => setAddForm((prev) => ({ ...prev, email: event.target.value }))}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="add-role">Role</Label>
              <Select
                value={addForm.role}
                onValueChange={(value) => setAddForm((prev) => ({ ...prev, role: value === "admin" ? "admin" : "manager" }))}
              >
                <SelectTrigger id="add-role">
                  <SelectValue placeholder="Role" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="admin">Admin</SelectItem>
                  <SelectItem value="manager">Manager</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAddDialog(false)} disabled={saving}>
              Cancel
            </Button>
            <Button onClick={createUser} disabled={saving || inviteBlockedBySeats}>
              Send Invite
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={showEditDialog} onOpenChange={setShowEditDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit User</DialogTitle>
            <DialogDescription>Email cannot be changed.</DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-2">
            <div className="grid gap-2">
              <Label htmlFor="edit-email">Email</Label>
              <Input id="edit-email" value={selectedUser?.email || ""} disabled />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="edit-first-name">First Name</Label>
              <Input
                id="edit-first-name"
                value={editForm.firstName}
                onChange={(event) => setEditForm((prev) => ({ ...prev, firstName: event.target.value }))}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="edit-last-name">Last Name</Label>
              <Input
                id="edit-last-name"
                value={editForm.lastName}
                onChange={(event) => setEditForm((prev) => ({ ...prev, lastName: event.target.value }))}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="edit-role">Role</Label>
              <Select
                value={editForm.role}
                onValueChange={(value) => setEditForm((prev) => ({ ...prev, role: value === "admin" ? "admin" : "manager" }))}
              >
                <SelectTrigger id="edit-role">
                  <SelectValue placeholder="Role" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="admin">Admin</SelectItem>
                  <SelectItem value="manager">Manager</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowEditDialog(false)} disabled={saving}>
              Cancel
            </Button>
            <Button onClick={updateUser} disabled={saving}>
              Save Changes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Remove User</DialogTitle>
            <DialogDescription>
              The user will be disabled and removed from tenant access.
            </DialogDescription>
          </DialogHeader>
          <div className="text-sm">
            Remove <span className="font-medium">{selectedUser?.email || "this user"}</span> from this tenant?
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDeleteDialog(false)} disabled={saving}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={deleteUser} disabled={saving || isProtectedFinalAdmin(selectedUser)}>
              Delete User
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
