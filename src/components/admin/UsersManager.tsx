"use client";

import { KeyRound, Plus, UserCheck, UserX } from "lucide-react";
import { useRouter } from "next/navigation";
import { useActionState, useEffect, useMemo, useState, useTransition } from "react";
import { createUserAction, updateUserAction } from "@/app/admin/actions";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { DataTable, type Column } from "@/components/ui/DataTable";
import { Field, Input, SearchInput, Select } from "@/components/ui/forms";
import { Modal } from "@/components/ui/interactive";
import { useToast } from "@/components/ui/Toast";
import type { FormResult } from "@/lib/forms/validate";
import type { UserRole } from "@/types";

export interface AdminUserRow {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  active: boolean;
  joinedAt: string;
  hasPassword: boolean;
  partnerId: string | null;
  instructorId: string | null;
}

const roleTone: Record<UserRole, "brand" | "seal" | "verify" | "navy"> = { student: "brand", instructor: "seal", partner: "verify", admin: "navy" };

export function UsersManager({ users, partners, instructors, meId }: { users: AdminUserRow[]; partners: { id: string; name: string }[]; instructors: { id: string; name: string }[]; meId: string }) {
  const toast = useToast();
  const router = useRouter();
  const [q, setQ] = useState("");
  const [role, setRole] = useState<"all" | UserRole>("all");
  const [creating, setCreating] = useState(false);
  const [resetting, setResetting] = useState<AdminUserRow | null>(null);
  const [newRole, setNewRole] = useState<UserRole>("student");
  const [pending, start] = useTransition();
  const [state, create, creatingPending] = useActionState<FormResult, FormData>(createUserAction, null);
  const [handled, setHandled] = useState(state);
  if (state !== handled) {
    setHandled(state);
    if (state?.ok) setCreating(false);
  }
  useEffect(() => {
    if (state) toast({ tone: state.ok ? "success" : "error", title: state.ok ? "User created" : "Not created", description: state.message });
  }, [state, toast]);

  const run = (fn: () => Promise<FormResult>) =>
    start(async () => {
      const r = await fn();
      toast({ tone: r?.ok ? "success" : "error", title: r?.ok ? "Saved" : "Not saved", description: r?.message });
      router.refresh();
    });

  const rows = useMemo(() => users.filter((u) => (role === "all" || u.role === role) && `${u.name} ${u.email}`.toLowerCase().includes(q.toLowerCase())), [users, q, role]);
  const columns: Column<AdminUserRow>[] = [
    { key: "name", header: "User", sortValue: (u) => u.name, cell: (u) => <span><span className="block font-medium text-navy-900">{u.name}</span><span className="block text-xs text-muted">{u.email}</span></span> },
    {
      key: "role",
      header: "Role",
      sortValue: (u) => u.role,
      cell: (u) =>
        u.id === meId ? (
          <Badge tone={roleTone[u.role]} className="capitalize">{u.role} (you)</Badge>
        ) : (
          <Select aria-label={`Role for ${u.name}`} value={u.role} disabled={pending} onChange={(e) => run(() => updateUserAction(u.id, { role: e.target.value as UserRole }))} className="h-9 w-36 text-xs">
            {(["student", "instructor", "partner", "admin"] as const).map((r) => <option key={r} value={r}>{r}</option>)}
          </Select>
        ),
    },
    {
      key: "link",
      header: "Linked to",
      hideOnMobile: true,
      cell: (u) =>
        u.role === "partner" ? (
          <Select aria-label="Partner organisation" value={u.partnerId ?? ""} disabled={pending} onChange={(e) => run(() => updateUserAction(u.id, { partnerId: e.target.value || null }))} className="h-9 w-48 text-xs">
            <option value="">— choose partner —</option>
            {partners.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
          </Select>
        ) : u.role === "instructor" ? (
          <Select aria-label="Instructor profile" value={u.instructorId ?? ""} disabled={pending} onChange={(e) => run(() => updateUserAction(u.id, { instructorId: e.target.value || null }))} className="h-9 w-48 text-xs">
            <option value="">— choose instructor —</option>
            {instructors.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
          </Select>
        ) : (
          <span className="text-xs text-muted">—</span>
        ),
    },
    { key: "status", header: "Status", sortValue: (u) => Number(u.active), cell: (u) => (!u.active ? <Badge tone="danger">Deactivated</Badge> : u.hasPassword ? <Badge tone="verify">Active</Badge> : <Badge tone="warning">No password</Badge>) },
    {
      key: "actions",
      header: "Actions",
      className: "text-right",
      cell: (u) => (
        <div className="flex justify-end gap-1">
          <button className="rounded-lg p-2 text-navy-700 hover:bg-navy-50" title="Set password" aria-label={`Set password for ${u.name}`} onClick={() => setResetting(u)}>
            <KeyRound className="size-4" aria-hidden />
          </button>
          {u.id !== meId && (
            <button
              className={`rounded-lg p-2 ${u.active ? "text-red-700 hover:bg-red-50" : "text-verify-700 hover:bg-verify-50"}`}
              title={u.active ? "Deactivate" : "Reactivate"}
              aria-label={`${u.active ? "Deactivate" : "Reactivate"} ${u.name}`}
              disabled={pending}
              onClick={() => run(() => updateUserAction(u.id, { active: !u.active }))}
            >
              {u.active ? <UserX className="size-4" aria-hidden /> : <UserCheck className="size-4" aria-hidden />}
            </button>
          )}
        </div>
      ),
    },
  ];

  return (
    <>
      <div className="mb-4 flex flex-col gap-3 sm:flex-row">
        <SearchInput label="Search users" placeholder="Search by name or email" value={q} onChange={(e) => setQ(e.target.value)} className="flex-1" />
        <Select aria-label="Filter by role" value={role} onChange={(e) => setRole(e.target.value as typeof role)}>
          <option value="all">All roles</option><option value="student">Students</option><option value="instructor">Instructors</option><option value="partner">Partners</option><option value="admin">Admins</option>
        </Select>
        <Button onClick={() => setCreating(true)}><Plus className="size-4" aria-hidden /> New user</Button>
      </div>
      <DataTable rows={rows} columns={columns} caption="Users" />

      <Modal open={creating} onClose={() => setCreating(false)} title="Create a user" footer={<><Button variant="secondary" onClick={() => setCreating(false)}>Cancel</Button><Button type="submit" form="create-user" disabled={creatingPending}>Create user</Button></>}>
        <form id="create-user" action={create} className="space-y-4">
          <Field label="Full name" htmlFor="u-name" required error={state?.fieldErrors?.name}><Input id="u-name" name="name" required /></Field>
          <Field label="Email" htmlFor="u-email" required error={state?.fieldErrors?.email}><Input id="u-email" name="email" type="email" required /></Field>
          <Field label="Role" htmlFor="u-role" required>
            <Select id="u-role" name="role" value={newRole} onChange={(e) => setNewRole(e.target.value as UserRole)}>
              <option value="student">Student</option><option value="instructor">Instructor</option><option value="partner">Training partner</option><option value="admin">Administrator</option>
            </Select>
          </Field>
          {newRole === "partner" && (
            <Field label="Partner organisation" htmlFor="u-partner"><Select id="u-partner" name="partnerId" defaultValue="">{[<option key="" value="">— choose —</option>, ...partners.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)]}</Select></Field>
          )}
          {newRole === "instructor" && (
            <Field label="Instructor profile" htmlFor="u-instr"><Select id="u-instr" name="instructorId" defaultValue="">{[<option key="" value="">— choose —</option>, ...instructors.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)]}</Select></Field>
          )}
          <Field label="Temporary password" htmlFor="u-pw" required hint="At least 8 characters, letters and numbers. Ask them to change it after signing in." error={state?.fieldErrors?.password}>
            <Input id="u-pw" name="password" type="text" autoComplete="off" required />
          </Field>
        </form>
      </Modal>

      <Modal
        open={!!resetting}
        onClose={() => setResetting(null)}
        title={`Set password · ${resetting?.name ?? ""}`}
        footer={<><Button variant="secondary" onClick={() => setResetting(null)}>Cancel</Button><Button type="submit" form="reset-pw" disabled={pending}>Set password</Button></>}
      >
        <form
          id="reset-pw"
          onSubmit={(e) => {
            e.preventDefault();
            const password = String(new FormData(e.currentTarget).get("password") ?? "");
            const u = resetting!;
            setResetting(null);
            run(() => updateUserAction(u.id, { password }));
          }}
        >
          <Field label="New password" htmlFor="r-pw" required hint="They will be signed out of all devices."><Input id="r-pw" name="password" type="text" autoComplete="off" required /></Field>
        </form>
      </Modal>
    </>
  );
}
