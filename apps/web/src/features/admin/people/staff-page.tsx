import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Pencil, UserCog, UserPlus } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { toast } from 'sonner';
import {
  passwordSchema,
  staffCreateSchema,
  STAFF_ROLES,
  type StaffCreateInput,
  type StaffDTO,
  type StaffRole,
  type StaffUpdateInput,
} from '@quickbill/shared';
import { Button } from '@/components/ui/button';
import {
  Badge,
  EmptyState,
  ErrorState,
  PageHeader,
  Panel,
  Table,
  Td,
  Th,
} from '@/components/ui/display';
import { Checkbox, Field, Input, Select } from '@/components/ui/form';
import { Dialog, DialogClose, DialogContent, DialogFooter } from '@/components/ui/overlay';
import { api, ApiError } from '@/lib/api';
import { formatDate, formatNumber, label } from '@/lib/format';
import { useDocumentTitle } from '@/lib/hooks';
import { useAuth } from '@/stores/auth';
import { SkeletonRows } from '../sales/list-params';

const ROLE_HINTS: Record<StaffRole, string> = {
  ADMIN: 'Everything, including staff accounts',
  MANAGER: 'Reports, AI tools, products and purchasing',
  CASHIER: 'Till, bills, returns and online orders',
};

function invalidateStaff(queryClient: ReturnType<typeof useQueryClient>) {
  void queryClient.invalidateQueries({ queryKey: ['staff'] });
}

function AddStaffDialog({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const queryClient = useQueryClient();
  const form = useForm<StaffCreateInput>({
    resolver: zodResolver(staffCreateSchema),
    defaultValues: { name: '', email: '', role: 'CASHIER', password: '' },
  });
  const errors = form.formState.errors;
  const role = form.watch('role');

  useEffect(() => {
    if (open) form.reset();
  }, [open, form]);

  const create = useMutation({
    mutationFn: (input: StaffCreateInput) => api.post<StaffDTO>('/staff', input),
    onSuccess: (staff) => {
      toast.success('Staff member added', {
        description: `${staff.name} can now sign in as ${label(staff.role).toLowerCase()}.`,
      });
      invalidateStaff(queryClient);
      onOpenChange(false);
    },
    onError: (error) => {
      const message = error instanceof ApiError ? error.message : 'Could not add the staff member.';
      if (/email/i.test(message)) form.setError('email', { message });
      else form.setError('root', { message });
    },
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        title="Add a staff member"
        description="They sign in with this email and password. Share the password with them in person."
      >
        <form
          noValidate
          onSubmit={form.handleSubmit((v) => create.mutate(v))}
          className="space-y-4"
        >
          <Field label="Full name" error={errors.name?.message}>
            {(p) => <Input {...p} autoFocus {...form.register('name')} />}
          </Field>
          <Field label="Work email" error={errors.email?.message}>
            {(p) => <Input {...p} type="email" autoComplete="off" {...form.register('email')} />}
          </Field>
          <Field label="Role" hint={ROLE_HINTS[role]} error={errors.role?.message}>
            {(p) => (
              <Select {...p} {...form.register('role')}>
                {STAFF_ROLES.map((r) => (
                  <option key={r} value={r}>
                    {label(r)}
                  </option>
                ))}
              </Select>
            )}
          </Field>
          <Field
            label="Temporary password"
            hint="At least 8 characters, with a letter and a number"
            error={errors.password?.message}
          >
            {(p) => (
              <Input
                {...p}
                type="text"
                autoComplete="new-password"
                {...form.register('password')}
              />
            )}
          </Field>
          {errors.root && (
            <p role="alert" className="rounded-lg bg-chilli-50 px-3 py-2 text-sm text-chilli-700">
              {errors.root.message}
            </p>
          )}
          <DialogFooter>
            <DialogClose asChild>
              <Button variant="secondary" type="button">
                Cancel
              </Button>
            </DialogClose>
            <Button type="submit" loading={create.isPending}>
              Add staff member
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

interface EditValues {
  name: string;
  role: StaffRole;
  isActive: boolean;
  password: string;
}

function EditStaffDialog({
  staff,
  isSelf,
  open,
  onOpenChange,
}: {
  staff: StaffDTO;
  isSelf: boolean;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const queryClient = useQueryClient();
  const form = useForm<EditValues>();
  const errors = form.formState.errors;
  const role = form.watch('role');

  useEffect(() => {
    if (open) {
      form.reset({
        name: staff.name,
        role: staff.role as StaffRole,
        isActive: staff.isActive,
        password: '',
      });
    }
  }, [open, staff, form]);

  const update = useMutation({
    mutationFn: (v: EditValues) => {
      const body: StaffUpdateInput = {};
      if (v.name.trim() !== staff.name) body.name = v.name.trim();
      if (!isSelf && v.role !== staff.role) body.role = v.role;
      if (!isSelf && v.isActive !== staff.isActive) body.isActive = v.isActive;
      if (v.password) body.password = v.password;
      return api.patch<StaffDTO>(`/staff/${staff.id}`, body);
    },
    onSuccess: (updated, values) => {
      const signedOut = values.password || (!values.isActive && staff.isActive);
      toast.success('Staff member updated', {
        description: signedOut
          ? `${updated.name} has been signed out of every device.`
          : updated.name,
      });
      invalidateStaff(queryClient);
      onOpenChange(false);
    },
    onError: (error) => form.setError('root', { message: error.message }),
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent title={`Edit ${staff.name}`} description={staff.email}>
        <form
          noValidate
          onSubmit={form.handleSubmit((v) => update.mutate(v))}
          className="space-y-4"
        >
          <Field label="Full name" error={errors.name?.message}>
            {(p) => (
              <Input
                {...p}
                {...form.register('name', {
                  required: 'Enter a name',
                  minLength: { value: 2, message: 'Use at least 2 characters' },
                })}
              />
            )}
          </Field>
          <Field
            label="Role"
            hint={isSelf ? 'You cannot change your own role.' : role ? ROLE_HINTS[role] : undefined}
            error={errors.role?.message}
          >
            {(p) => (
              <Select {...p} disabled={isSelf} {...form.register('role')}>
                {STAFF_ROLES.map((r) => (
                  <option key={r} value={r}>
                    {label(r)}
                  </option>
                ))}
              </Select>
            )}
          </Field>
          <Field
            label="New password"
            hint="Leave empty to keep the current one. Changing it signs them out everywhere."
            error={errors.password?.message}
          >
            {(p) => (
              <Input
                {...p}
                type="text"
                autoComplete="new-password"
                {...form.register('password', {
                  validate: (v) =>
                    !v || passwordSchema.safeParse(v).error?.issues[0]?.message || true,
                })}
              />
            )}
          </Field>
          <Checkbox
            label={isSelf ? 'Active (you cannot deactivate yourself)' : 'Can sign in'}
            disabled={isSelf}
            checked={form.watch('isActive') ?? true}
            onChange={(e) => form.setValue('isActive', e.target.checked, { shouldDirty: true })}
          />
          {errors.root && (
            <p role="alert" className="rounded-lg bg-chilli-50 px-3 py-2 text-sm text-chilli-700">
              {errors.root.message}
            </p>
          )}
          <DialogFooter>
            <DialogClose asChild>
              <Button variant="secondary" type="button">
                Cancel
              </Button>
            </DialogClose>
            <Button type="submit" loading={update.isPending}>
              Save changes
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

export default function StaffPage() {
  useDocumentTitle('Staff');
  const user = useAuth((s) => s.user);
  const isAdmin = user?.role === 'ADMIN';
  const [adding, setAdding] = useState(false);
  const [editing, setEditing] = useState<StaffDTO | null>(null);

  const staff = useQuery({
    queryKey: ['staff'],
    queryFn: () => api.get<StaffDTO[]>('/staff'),
    enabled: isAdmin,
  });

  if (!user || !isAdmin) {
    return (
      <EmptyState icon={<UserCog />} title="Only admins can manage staff">
        Ask the store admin to add people or change roles.
      </EmptyState>
    );
  }

  return (
    <>
      <PageHeader
        title="Staff"
        description="Who can sign in to the back office, and what they can do."
        actions={
          <Button onClick={() => setAdding(true)}>
            <UserPlus /> Add staff member
          </Button>
        }
      />

      {staff.isError && <ErrorState error={staff.error} onRetry={() => staff.refetch()} />}

      <Panel className="overflow-hidden">
        <Table>
          <thead>
            <tr>
              <Th>Name</Th>
              <Th>Role</Th>
              <Th>Status</Th>
              <Th className="text-right">Bills rung up</Th>
              <Th>Joined</Th>
              <Th className="w-12" />
            </tr>
          </thead>
          <tbody>
            {staff.isPending ? (
              <SkeletonRows rows={5} cols={6} />
            ) : (
              staff.data?.map((s) => (
                <tr key={s.id} className={s.isActive ? undefined : 'text-ink-faint'}>
                  <Td>
                    <span className="flex items-center gap-2 font-medium">
                      {s.name}
                      {s.id === user.id && <Badge tone="peacock">You</Badge>}
                    </span>
                    <span className="block text-xs text-ink-faint">{s.email}</span>
                  </Td>
                  <Td>{label(s.role)}</Td>
                  <Td>
                    {s.isActive ? <Badge tone="leaf">Active</Badge> : <Badge>Deactivated</Badge>}
                  </Td>
                  <Td className="text-right tabular-nums">{formatNumber(s.salesCount)}</Td>
                  <Td className="whitespace-nowrap text-ink-soft">{formatDate(s.createdAt)}</Td>
                  <Td>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => setEditing(s)}
                      aria-label={`Edit ${s.name}`}
                    >
                      <Pencil />
                    </Button>
                  </Td>
                </tr>
              ))
            )}
          </tbody>
        </Table>
      </Panel>

      <AddStaffDialog open={adding} onOpenChange={setAdding} />
      {editing && (
        <EditStaffDialog
          staff={editing}
          isSelf={editing.id === user.id}
          open
          onOpenChange={(open) => !open && setEditing(null)}
        />
      )}
    </>
  );
}
