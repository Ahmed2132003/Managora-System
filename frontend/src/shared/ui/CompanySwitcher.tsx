
import { useEffect } from "react";
import { Select, Badge, Group, Text } from "@mantine/core";
import { IconBuilding } from "@tabler/icons-react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { http } from "../api/http";
import { useMe } from "../auth/useMe";

const ACTIVE_COMPANY_KEY = "superadmin_active_company_id";

export function getActiveCompanyId(): string | null {
  return localStorage.getItem(ACTIVE_COMPANY_KEY);
}

export function setActiveCompanyId(id: string | null) {
  if (id) {
    localStorage.setItem(ACTIVE_COMPANY_KEY, id);
  } else {
    localStorage.removeItem(ACTIVE_COMPANY_KEY);
  }
}

type CompanyOption = { id: number; name: string; is_active: boolean };

/**
 * يُضاف في http.ts — request interceptor — بعد سطر setAccessToken:
 *
 *   // Superuser company context
 *   const companyId = localStorage.getItem("superadmin_active_company_id");
 *   if (companyId) {
 *     config.headers["X-Company-ID"] = companyId;
 *   }
 */

export function CompanySwitcher() {
  const { data: me } = useMe();
  const qc = useQueryClient();
  const isSuperuser = Boolean(me?.user?.is_superuser);

  // جيب قائمة الشركات من superadmin endpoint
  const { data: companies = [] } = useQuery<CompanyOption[]>({
    queryKey: ["superadmin-companies-switcher"],
    queryFn: async () => {
      // نستخدم الـ endpoint المعروف
      const API_PREFIX =
        (import.meta.env.VITE_API_PREFIX as string | undefined) ?? "/api/v1";
      const res = await http.get<CompanyOption[]>(
        `${API_PREFIX}/superadmin/companies/`
      );
      return res.data;
    },
    enabled: isSuperuser,
    staleTime: 60_000,
  });

  // القيمة الحالية المحفوظة
  const currentId = getActiveCompanyId();

  // لو مفيش اختيار، اختر الأولى تلقائياً
  useEffect(() => {
    if (isSuperuser && companies.length && !currentId) {
      setActiveCompanyId(String(companies[0].id));
      qc.invalidateQueries(); // refresh all queries with new company context
    }
  }, [isSuperuser, companies, currentId, qc]);

  if (!isSuperuser || companies.length === 0) return null;

  const options = companies.map((c) => ({
    value: String(c.id),
    label: c.name,
  }));

  const handleChange = (value: string | null) => {
    setActiveCompanyId(value);
    // invalidate كل الـ queries عشان يتحملوا من الشركة الجديدة
    qc.invalidateQueries();
  };

  return (
    <Group gap={6} align="center">
      <IconBuilding size={14} color="var(--mantine-color-violet-6)" />
      <Text size="xs" c="dimmed" visibleFrom="sm">
        الشركة:
      </Text>
      <Select
        data={options}
        value={currentId}
        onChange={handleChange}
        size="xs"
        w={180}
        styles={{
          input: {
            fontWeight: 600,
            borderColor: "var(--mantine-color-violet-4)",
          },
        }}
        placeholder="اختر الشركة..."
      />
      <Badge color="violet" variant="dot" size="xs">
        Super
      </Badge>
    </Group>
  );
}