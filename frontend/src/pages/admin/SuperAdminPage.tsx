

import { useState, useCallback } from "react";
import {
  ActionIcon,
  Badge,
  Box,
  Button,
  Card,
  Divider,
  Group,
  Modal,
  NumberInput,
  PasswordInput,
  Select,
  SimpleGrid,
  Stack,
  Table,
  Tabs,
  Text,
  TextInput,
  Title,
  Tooltip,
} from "@mantine/core";
import { notifications } from "@mantine/notifications";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  IconBuilding,
  IconCheck,
  IconEdit,
  IconKey,
  IconPlus,
  IconRefresh,
  IconSearch,
  IconTrash,
  IconUsers,
  IconX,
} from "@tabler/icons-react";

import { useMe } from "../../shared/auth/useMe";
import { AccessDenied } from "../../shared/ui/AccessDenied";
import { http } from "../../shared/api/http";
import { endpoints } from "../../shared/api/endpoints";
import { formatApiError } from "../../shared/api/errors";

// ─── Types ───────────────────────────────────────────────────────────────────

type SystemStats = {
  companies: {
    total: number;
    active: number;
    inactive: number;
    expiring_soon: number;
    expired: number;
  };
  users: {
    total: number;
    active: number;
    inactive: number;
    superusers: number;
  };
  generated_at: string;
};

type CompanyRecord = {
  id: number;
  name: string;
  slug: string;
  is_active: boolean;
  subscription_expires_at: string | null;
  created_at: string;
  user_count: number;
  employee_count: number;
  subscription_status:
    | "active"
    | "inactive"
    | "expired"
    | "expiring_soon"
    | "no_expiry";
};

type UserRecord = {
  id: number;
  username: string;
  email: string;
  first_name: string;
  last_name: string;
  phone_number: string;
  is_active: boolean;
  is_superuser: boolean;
  company: number | null;
  company_name: string | null;
  roles: { id: number; name: string; slug: string }[];
  date_joined: string;
};

type AuditEntry = {
  id: number;
  company_id: number;
  company_name: string;
  actor_id: number | null;
  actor_username: string | null;
  action: string;
  entity: string;
  entity_id: string;
  ip_address: string | null;
  created_at: string;
};

// ─── Superadmin endpoints (مضافة هنا مؤقتاً — انقلها لـ endpoints.ts) ───────

const SA = {
  stats: `${endpoints.me.replace("/me/", "")}/superadmin/stats/`,
  auditLogs: `${endpoints.me.replace("/me/", "")}/superadmin/audit-logs/`,
  companies: `${endpoints.me.replace("/me/", "")}/superadmin/companies/`,
  company: (id: number) =>
    `${endpoints.me.replace("/me/", "")}/superadmin/companies/${id}/`,
  companyToggle: (id: number) =>
    `${endpoints.me.replace("/me/", "")}/superadmin/companies/${id}/toggle-active/`,
  companyExtend: (id: number) =>
    `${endpoints.me.replace("/me/", "")}/superadmin/companies/${id}/extend-subscription/`,
  users: `${endpoints.me.replace("/me/", "")}/superadmin/users/`,
  user: (id: number) =>
    `${endpoints.me.replace("/me/", "")}/superadmin/users/${id}/`,
  userResetPassword: (id: number) =>
    `${endpoints.me.replace("/me/", "")}/superadmin/users/${id}/reset-password/`,
};

// ─── Helper components ────────────────────────────────────────────────────────

function StatusBadge({
  status,
}: {
  status: CompanyRecord["subscription_status"] | "active" | "inactive";
}) {
  const map: Record<string, { color: string; label: string }> = {
    active: { color: "green", label: "نشط" },
    inactive: { color: "red", label: "غير نشط" },
    expired: { color: "red", label: "منتهي" },
    expiring_soon: { color: "orange", label: "ينتهي قريباً" },
    no_expiry: { color: "blue", label: "بلا انتهاء" },
  };
  const info = map[status] ?? { color: "gray", label: status };
  return <Badge color={info.color} variant="light" size="sm">{info.label}</Badge>;
}

function StatCard({
  label,
  value,
  color = "blue",
}: {
  label: string;
  value: number | string;
  color?: string;
}) {
  return (
    <Card withBorder radius="md" p="md">
      <Text size="xs" c="dimmed" mb={4}>
        {label}
      </Text>
      <Text fw={700} size="xl" c={color}>
        {value}
      </Text>
    </Card>
  );
}

// ─── Stats Section ────────────────────────────────────────────────────────────

function StatsSection() {
  const { data, isLoading } = useQuery<SystemStats>({
    queryKey: ["superadmin-stats"],
    queryFn: async () => (await http.get<SystemStats>(SA.stats)).data,
    staleTime: 60_000,
  });

  if (isLoading) return <Text c="dimmed">جاري التحميل...</Text>;
  if (!data) return null;

  return (
    <Stack gap="md">
      <Title order={4}>📊 إحصائيات النظام</Title>
      <SimpleGrid cols={{ base: 2, sm: 3, lg: 5 }}>
        <StatCard label="إجمالي الشركات" value={data.companies.total} />
        <StatCard label="شركات نشطة" value={data.companies.active} color="green" />
        <StatCard label="شركات غير نشطة" value={data.companies.inactive} color="red" />
        <StatCard label="اشتراكات تنتهي قريباً" value={data.companies.expiring_soon} color="orange" />
        <StatCard label="إجمالي المستخدمين" value={data.users.total} />
      </SimpleGrid>
      <SimpleGrid cols={{ base: 2, sm: 4 }}>
        <StatCard label="مستخدمون نشطون" value={data.users.active} color="green" />
        <StatCard label="سوبر يوزر" value={data.users.superusers} color="violet" />
        <StatCard label="اشتراكات منتهية" value={data.companies.expired} color="red" />
        <StatCard label="بدون انتهاء" value={data.companies.total - data.companies.expired - data.companies.expiring_soon} color="blue" />
      </SimpleGrid>
    </Stack>
  );
}

// ─── Companies Section ────────────────────────────────────────────────────────

function CompaniesSection() {
  const qc = useQueryClient();
  const [search, setSearch] = useState("");
  const [editCompany, setEditCompany] = useState<CompanyRecord | null>(null);
  const [createOpen, setCreateOpen] = useState(false);
  const [extendCompany, setExtendCompany] = useState<CompanyRecord | null>(null);
  const [extendDays, setExtendDays] = useState<number>(90);

  const { data: companies = [], isLoading } = useQuery<CompanyRecord[]>({
    queryKey: ["superadmin-companies", search],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (search) params.set("search", search);
      return (await http.get<CompanyRecord[]>(`${SA.companies}?${params}`)).data;
    },
    staleTime: 30_000,
  });

  const toggleMutation = useMutation({
    mutationFn: (id: number) => http.post(SA.companyToggle(id), {}),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["superadmin-companies"] });
      qc.invalidateQueries({ queryKey: ["superadmin-stats"] });
    },
    onError: (e) =>
      notifications.show({ title: "خطأ", message: formatApiError(e), color: "red" }),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => http.delete(SA.company(id)),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["superadmin-companies"] });
      qc.invalidateQueries({ queryKey: ["superadmin-stats"] });
      notifications.show({ title: "تم الحذف", message: "تم حذف الشركة.", color: "teal" });
    },
    onError: (e) =>
      notifications.show({ title: "خطأ في الحذف", message: formatApiError(e), color: "red" }),
  });

  const extendMutation = useMutation({
    mutationFn: ({ id, days }: { id: number; days: number }) =>
      http.post(SA.companyExtend(id), { days }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["superadmin-companies"] });
      qc.invalidateQueries({ queryKey: ["superadmin-stats"] });
      setExtendCompany(null);
      notifications.show({ title: "تم التمديد", message: "تم تمديد الاشتراك بنجاح.", color: "teal" });
    },
    onError: (e) =>
      notifications.show({ title: "خطأ", message: formatApiError(e), color: "red" }),
  });

  const rows = companies.map((c) => (
    <Table.Tr key={c.id}>
      <Table.Td>{c.id}</Table.Td>
      <Table.Td fw={600}>{c.name}</Table.Td>
      <Table.Td>
        <StatusBadge status={c.is_active ? "active" : "inactive"} />
      </Table.Td>
      <Table.Td>
        <StatusBadge status={c.subscription_status} />
      </Table.Td>
      <Table.Td>
        {c.subscription_expires_at
          ? new Date(c.subscription_expires_at).toLocaleDateString("ar-EG")
          : "—"}
      </Table.Td>
      <Table.Td>{c.user_count}</Table.Td>
      <Table.Td>
        <Group gap={4}>
          <Tooltip label={c.is_active ? "تعطيل" : "تفعيل"}>
            <ActionIcon
              size="sm"
              variant="light"
              color={c.is_active ? "orange" : "green"}
              onClick={() => toggleMutation.mutate(c.id)}
            >
              {c.is_active ? <IconX size={14} /> : <IconCheck size={14} />}
            </ActionIcon>
          </Tooltip>
          <Tooltip label="تمديد الاشتراك">
            <ActionIcon
              size="sm"
              variant="light"
              color="blue"
              onClick={() => { setExtendCompany(c); setExtendDays(90); }}
            >
              <IconRefresh size={14} />
            </ActionIcon>
          </Tooltip>
          <Tooltip label="تعديل">
            <ActionIcon
              size="sm"
              variant="light"
              color="violet"
              onClick={() => setEditCompany(c)}
            >
              <IconEdit size={14} />
            </ActionIcon>
          </Tooltip>
          <Tooltip label="حذف">
            <ActionIcon
              size="sm"
              variant="light"
              color="red"
              onClick={() => {
                if (window.confirm(`هل تريد حذف شركة "${c.name}"؟ هذا الإجراء لا يمكن التراجع عنه.`))
                  deleteMutation.mutate(c.id);
              }}
            >
              <IconTrash size={14} />
            </ActionIcon>
          </Tooltip>
        </Group>
      </Table.Td>
    </Table.Tr>
  ));

  return (
    <Stack gap="md">
      <Group justify="space-between">
        <Title order={4}>🏢 إدارة الشركات</Title>
        <Button
          size="xs"
          leftSection={<IconPlus size={14} />}
          onClick={() => setCreateOpen(true)}
        >
          شركة جديدة
        </Button>
      </Group>

      <TextInput
        placeholder="بحث باسم الشركة..."
        leftSection={<IconSearch size={14} />}
        value={search}
        onChange={(e) => setSearch(e.currentTarget.value)}
        w={300}
      />

      <Box style={{ overflowX: "auto" }}>
        <Table striped highlightOnHover withTableBorder withColumnBorders>
          <Table.Thead>
            <Table.Tr>
              <Table.Th>#</Table.Th>
              <Table.Th>الاسم</Table.Th>
              <Table.Th>الحالة</Table.Th>
              <Table.Th>الاشتراك</Table.Th>
              <Table.Th>انتهاء الاشتراك</Table.Th>
              <Table.Th>المستخدمون</Table.Th>
              <Table.Th>إجراءات</Table.Th>
            </Table.Tr>
          </Table.Thead>
          <Table.Tbody>
            {isLoading ? (
              <Table.Tr>
                <Table.Td colSpan={7}><Text c="dimmed" ta="center">جاري التحميل...</Text></Table.Td>
              </Table.Tr>
            ) : rows.length ? rows : (
              <Table.Tr>
                <Table.Td colSpan={7}><Text c="dimmed" ta="center">لا توجد شركات</Text></Table.Td>
              </Table.Tr>
            )}
          </Table.Tbody>
        </Table>
      </Box>

      {/* Modal: تمديد الاشتراك */}
      <Modal
        opened={!!extendCompany}
        onClose={() => setExtendCompany(null)}
        title={`تمديد اشتراك: ${extendCompany?.name}`}
        centered
      >
        <Stack gap="md">
          <NumberInput
            label="عدد الأيام"
            value={extendDays}
            onChange={(v) => setExtendDays(Number(v))}
            min={1}
            max={3650}
          />
          <Button
            onClick={() => extendCompany && extendMutation.mutate({ id: extendCompany.id, days: extendDays })}
            loading={extendMutation.isPending}
          >
            تمديد الاشتراك
          </Button>
        </Stack>
      </Modal>

      {/* Modal: تعديل الشركة */}
      {editCompany && (
        <EditCompanyModal
          company={editCompany}
          onClose={() => setEditCompany(null)}
          onSaved={() => {
            qc.invalidateQueries({ queryKey: ["superadmin-companies"] });
            setEditCompany(null);
          }}
        />
      )}

      {/* Modal: إنشاء شركة */}
      {createOpen && (
        <CreateCompanyModal
          onClose={() => setCreateOpen(false)}
          onSaved={() => {
            qc.invalidateQueries({ queryKey: ["superadmin-companies"] });
            qc.invalidateQueries({ queryKey: ["superadmin-stats"] });
            setCreateOpen(false);
          }}
        />
      )}
    </Stack>
  );
}

function EditCompanyModal({
  company,
  onClose,
  onSaved,
}: {
  company: CompanyRecord;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [name, setName] = useState(company.name);
  const [loading, setLoading] = useState(false);

  const save = async () => {
    setLoading(true);
    try {
      await http.patch(SA.company(company.id), { name });
      notifications.show({ title: "تم التعديل", message: "تم تعديل الشركة.", color: "teal" });
      onSaved();
    } catch (e) {
      notifications.show({ title: "خطأ", message: formatApiError(e), color: "red" });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal opened onClose={onClose} title={`تعديل: ${company.name}`} centered>
      <Stack gap="md">
        <TextInput label="اسم الشركة" value={name} onChange={(e) => setName(e.currentTarget.value)} />
        <Group justify="flex-end">
          <Button variant="default" onClick={onClose}>إلغاء</Button>
          <Button onClick={save} loading={loading}>حفظ</Button>
        </Group>
      </Stack>
    </Modal>
  );
}

function CreateCompanyModal({
  onClose,
  onSaved,
}: {
  onClose: () => void;
  onSaved: () => void;
}) {
  const [name, setName] = useState("");
  const [loading, setLoading] = useState(false);

  const save = async () => {
    if (!name.trim()) return;
    setLoading(true);
    try {
      await http.post(SA.companies, { name, is_active: true });
      notifications.show({ title: "تم الإنشاء", message: "تم إنشاء الشركة.", color: "teal" });
      onSaved();
    } catch (e) {
      notifications.show({ title: "خطأ", message: formatApiError(e), color: "red" });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal opened onClose={onClose} title="إنشاء شركة جديدة" centered>
      <Stack gap="md">
        <TextInput
          label="اسم الشركة"
          value={name}
          onChange={(e) => setName(e.currentTarget.value)}
          placeholder="اسم الشركة..."
        />
        <Group justify="flex-end">
          <Button variant="default" onClick={onClose}>إلغاء</Button>
          <Button onClick={save} loading={loading} disabled={!name.trim()}>إنشاء</Button>
        </Group>
      </Stack>
    </Modal>
  );
}

// ─── Users Section ────────────────────────────────────────────────────────────

function UsersSection({ companies }: { companies: CompanyRecord[] }) {
  const qc = useQueryClient();
  const [search, setSearch] = useState("");
  const [filterCompany, setFilterCompany] = useState<string | null>(null);
  const [resetTarget, setResetTarget] = useState<UserRecord | null>(null);
  const [newPassword, setNewPassword] = useState("");
  const [resetLoading, setResetLoading] = useState(false);

  const { data: users = [], isLoading } = useQuery<UserRecord[]>({
    queryKey: ["superadmin-users", search, filterCompany],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (search) params.set("search", search);
      if (filterCompany) params.set("company", filterCompany);
      return (await http.get<UserRecord[]>(`${SA.users}?${params}`)).data;
    },
    staleTime: 30_000,
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => http.delete(SA.user(id)),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["superadmin-users"] });
      qc.invalidateQueries({ queryKey: ["superadmin-stats"] });
      notifications.show({ title: "تم الحذف", message: "تم حذف المستخدم.", color: "teal" });
    },
    onError: (e) =>
      notifications.show({ title: "خطأ في الحذف", message: formatApiError(e), color: "red" }),
  });

  const toggleUserMutation = useMutation({
    mutationFn: ({ id, is_active }: { id: number; is_active: boolean }) =>
      http.patch(SA.user(id), { is_active }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["superadmin-users"] }),
    onError: (e) =>
      notifications.show({ title: "خطأ", message: formatApiError(e), color: "red" }),
  });

  const doResetPassword = async () => {
    if (!resetTarget || newPassword.length < 8) return;
    setResetLoading(true);
    try {
      await http.post(SA.userResetPassword(resetTarget.id), { new_password: newPassword });
      notifications.show({ title: "تم التغيير", message: "تم تغيير كلمة المرور.", color: "teal" });
      setResetTarget(null);
      setNewPassword("");
    } catch (e) {
      notifications.show({ title: "خطأ", message: formatApiError(e), color: "red" });
    } finally {
      setResetLoading(false);
    }
  };

  const companyOptions = companies.map((c) => ({
    value: String(c.id),
    label: c.name,
  }));

  const rows = users.map((u) => (
    <Table.Tr key={u.id}>
      <Table.Td>{u.id}</Table.Td>
      <Table.Td>
        <Stack gap={0}>
          <Text size="sm" fw={600}>{u.username}</Text>
          <Text size="xs" c="dimmed">{u.email}</Text>
        </Stack>
      </Table.Td>
      <Table.Td>
        <Text size="sm">{u.company_name ?? "—"}</Text>
      </Table.Td>
      <Table.Td>
        {u.roles.length
          ? u.roles.map((r) => (
              <Badge key={r.id} size="xs" variant="outline" mr={2}>
                {r.name}
              </Badge>
            ))
          : "—"}
      </Table.Td>
      <Table.Td>
        <StatusBadge status={u.is_active ? "active" : "inactive"} />
      </Table.Td>
      <Table.Td>
        <Group gap={4}>
          <Tooltip label={u.is_active ? "تعطيل" : "تفعيل"}>
            <ActionIcon
              size="sm"
              variant="light"
              color={u.is_active ? "orange" : "green"}
              onClick={() => toggleUserMutation.mutate({ id: u.id, is_active: !u.is_active })}
            >
              {u.is_active ? <IconX size={14} /> : <IconCheck size={14} />}
            </ActionIcon>
          </Tooltip>
          <Tooltip label="تغيير كلمة المرور">
            <ActionIcon
              size="sm"
              variant="light"
              color="blue"
              onClick={() => { setResetTarget(u); setNewPassword(""); }}
            >
              <IconKey size={14} />
            </ActionIcon>
          </Tooltip>
          <Tooltip label="حذف">
            <ActionIcon
              size="sm"
              variant="light"
              color="red"
              onClick={() => {
                if (window.confirm(`حذف المستخدم "${u.username}"؟`))
                  deleteMutation.mutate(u.id);
              }}
            >
              <IconTrash size={14} />
            </ActionIcon>
          </Tooltip>
        </Group>
      </Table.Td>
    </Table.Tr>
  ));

  return (
    <Stack gap="md">
      <Title order={4}>👥 إدارة المستخدمين</Title>

      <Group>
        <TextInput
          placeholder="بحث باسم المستخدم أو الإيميل..."
          leftSection={<IconSearch size={14} />}
          value={search}
          onChange={(e) => setSearch(e.currentTarget.value)}
          w={280}
        />
        <Select
          placeholder="فلترة بالشركة"
          data={[{ value: "", label: "كل الشركات" }, ...companyOptions]}
          value={filterCompany}
          onChange={(v) => setFilterCompany(v || null)}
          clearable
          w={200}
        />
      </Group>

      <Box style={{ overflowX: "auto" }}>
        <Table striped highlightOnHover withTableBorder withColumnBorders>
          <Table.Thead>
            <Table.Tr>
              <Table.Th>#</Table.Th>
              <Table.Th>المستخدم</Table.Th>
              <Table.Th>الشركة</Table.Th>
              <Table.Th>الدور</Table.Th>
              <Table.Th>الحالة</Table.Th>
              <Table.Th>إجراءات</Table.Th>
            </Table.Tr>
          </Table.Thead>
          <Table.Tbody>
            {isLoading ? (
              <Table.Tr>
                <Table.Td colSpan={6}><Text c="dimmed" ta="center">جاري التحميل...</Text></Table.Td>
              </Table.Tr>
            ) : rows.length ? rows : (
              <Table.Tr>
                <Table.Td colSpan={6}><Text c="dimmed" ta="center">لا يوجد مستخدمون</Text></Table.Td>
              </Table.Tr>
            )}
          </Table.Tbody>
        </Table>
      </Box>

      {/* Modal: تغيير كلمة المرور */}
      <Modal
        opened={!!resetTarget}
        onClose={() => setResetTarget(null)}
        title={`تغيير كلمة مرور: ${resetTarget?.username}`}
        centered
      >
        <Stack gap="md">
          <PasswordInput
            label="كلمة المرور الجديدة"
            value={newPassword}
            onChange={(e) => setNewPassword(e.currentTarget.value)}
            placeholder="8 أحرف على الأقل..."
          />
          <Button
            onClick={doResetPassword}
            loading={resetLoading}
            disabled={newPassword.length < 8}
          >
            تغيير كلمة المرور
          </Button>
        </Stack>
      </Modal>
    </Stack>
  );
}

// ─── Audit Logs Section ───────────────────────────────────────────────────────

function AuditLogsSection({ companies }: { companies: CompanyRecord[] }) {
  const [filterCompany, setFilterCompany] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);

  const { data, isLoading } = useQuery<{
    count: number;
    page: number;
    page_size: number;
    results: AuditEntry[];
  }>({
    queryKey: ["superadmin-audit-logs", filterCompany, search, page],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (filterCompany) params.set("company", filterCompany);
      if (search) params.set("search", search);
      params.set("page", String(page));
      params.set("page_size", "30");
      return (await http.get(`${SA.auditLogs}?${params}`)).data;
    },
    staleTime: 15_000,
  });

  const companyOptions = companies.map((c) => ({
    value: String(c.id),
    label: c.name,
  }));

  const rows = (data?.results ?? []).map((log) => (
    <Table.Tr key={log.id}>
      <Table.Td><Text size="xs" c="dimmed">{log.id}</Text></Table.Td>
      <Table.Td><Text size="sm">{log.company_name}</Text></Table.Td>
      <Table.Td><Text size="sm">{log.actor_username ?? "—"}</Text></Table.Td>
      <Table.Td><Badge size="xs" variant="dot">{log.action}</Badge></Table.Td>
      <Table.Td><Text size="sm">{log.entity}</Text></Table.Td>
      <Table.Td><Text size="xs" c="dimmed">{log.ip_address ?? "—"}</Text></Table.Td>
      <Table.Td>
        <Text size="xs" c="dimmed">
          {new Date(log.created_at).toLocaleString("ar-EG")}
        </Text>
      </Table.Td>
    </Table.Tr>
  ));

  const totalPages = Math.ceil((data?.count ?? 0) / 30);

  return (
    <Stack gap="md">
      <Title order={4}>📋 سجل التدقيق الشامل</Title>

      <Group>
        <TextInput
          placeholder="بحث في الإجراءات..."
          leftSection={<IconSearch size={14} />}
          value={search}
          onChange={(e) => { setSearch(e.currentTarget.value); setPage(1); }}
          w={280}
        />
        <Select
          placeholder="فلترة بالشركة"
          data={[{ value: "", label: "كل الشركات" }, ...companyOptions]}
          value={filterCompany}
          onChange={(v) => { setFilterCompany(v || null); setPage(1); }}
          clearable
          w={200}
        />
      </Group>

      {data && (
        <Text size="sm" c="dimmed">
          {data.count} سجل إجمالي — صفحة {page} من {totalPages}
        </Text>
      )}

      <Box style={{ overflowX: "auto" }}>
        <Table striped highlightOnHover withTableBorder withColumnBorders>
          <Table.Thead>
            <Table.Tr>
              <Table.Th>#</Table.Th>
              <Table.Th>الشركة</Table.Th>
              <Table.Th>المستخدم</Table.Th>
              <Table.Th>الإجراء</Table.Th>
              <Table.Th>الكيان</Table.Th>
              <Table.Th>IP</Table.Th>
              <Table.Th>التاريخ</Table.Th>
            </Table.Tr>
          </Table.Thead>
          <Table.Tbody>
            {isLoading ? (
              <Table.Tr>
                <Table.Td colSpan={7}><Text c="dimmed" ta="center">جاري التحميل...</Text></Table.Td>
              </Table.Tr>
            ) : rows.length ? rows : (
              <Table.Tr>
                <Table.Td colSpan={7}><Text c="dimmed" ta="center">لا توجد سجلات</Text></Table.Td>
              </Table.Tr>
            )}
          </Table.Tbody>
        </Table>
      </Box>

      {totalPages > 1 && (
        <Group justify="center">
          <Button
            size="xs"
            variant="default"
            disabled={page <= 1}
            onClick={() => setPage((p) => p - 1)}
          >
            السابق
          </Button>
          <Text size="sm">{page} / {totalPages}</Text>
          <Button
            size="xs"
            variant="default"
            disabled={page >= totalPages}
            onClick={() => setPage((p) => p + 1)}
          >
            التالي
          </Button>
        </Group>
      )}
    </Stack>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export function SuperAdminPage() {
  const { data } = useMe();
  const isSuperuser = Boolean(data?.user?.is_superuser);

  // نجيب الشركات مرة واحدة ونمررها للـ tabs اللي محتاجاها
  const { data: companies = [] } = useQuery<CompanyRecord[]>({
    queryKey: ["superadmin-companies", ""],
    queryFn: async () =>
      (await http.get<CompanyRecord[]>(SA.companies)).data,
    enabled: isSuperuser,
    staleTime: 60_000,
  });

  if (!isSuperuser) {
    return <AccessDenied />;
  }

  return (
    <Stack gap="xl" p="md">
      {/* Header */}
      <Group justify="space-between" align="flex-start">
        <Stack gap={2}>
          <Title order={2}>⚡ لوحة تحكم المدير العام</Title>
          <Text c="dimmed" size="sm">
            صلاحيات كاملة على جميع الشركات والمستخدمين والبيانات في النظام.
          </Text>
        </Stack>
        <Badge color="violet" variant="filled" size="lg">
          Super Admin
        </Badge>
      </Group>

      <Divider />

      {/* Stats */}
      <StatsSection />

      <Divider />

      {/* Tabs */}
      <Tabs defaultValue="companies">
        <Tabs.List mb="md">
          <Tabs.Tab value="companies" leftSection={<IconBuilding size={14} />}>
            الشركات
          </Tabs.Tab>
          <Tabs.Tab value="users" leftSection={<IconUsers size={14} />}>
            المستخدمون
          </Tabs.Tab>
          <Tabs.Tab value="audit" leftSection={<IconSearch size={14} />}>
            سجل التدقيق
          </Tabs.Tab>
        </Tabs.List>

        <Tabs.Panel value="companies">
          <CompaniesSection />
        </Tabs.Panel>

        <Tabs.Panel value="users">
          <UsersSection companies={companies} />
        </Tabs.Panel>

        <Tabs.Panel value="audit">
          <AuditLogsSection companies={companies} />
        </Tabs.Panel>
      </Tabs>
    </Stack>
  );
}