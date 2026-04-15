import { useQuery } from "@tanstack/react-query";
import axios from "axios";
import { endpoints } from "../api/endpoints";
import { http } from "../api/http";
import { getAccessToken } from "./tokens";

export type MeResponse = {
  user: {
    id: number;
    username: string;
    email: string;
    first_name: string;
    last_name: string;
    is_superuser: boolean;
  };  
  username?: string;
  role?: string;
  effective_role?: string | null;
  extra_permissions?: string[];
  company: {
    id: number;
    name: string;
  };
  roles: Array<{
    id: number;
    name: string;
    slug: string;
  }>;
  permissions: string[];
  employee?: {
    id: number;
    employee_code: string;
    full_name: string;
  } | null;
};

export function useMe() {
  return useQuery({
    queryKey: ["me"],
    staleTime: 5 * 60 * 1000,
    gcTime: 15 * 60 * 1000,
    refetchOnWindowFocus: false,
    queryFn: async () => {      
      const endpoint = endpoints.me;
      console.info("[auth][me] fetch:start", {
        endpoint,
        hasAccessToken: Boolean(getAccessToken()),
      });
      try {
        const response = await http.get<MeResponse>(endpoint);
        console.info("[auth][me] fetch:success", {
          endpoint,
          userId: response.data.user?.id,
          companyId: response.data.company?.id,
          role: response.data.role,
          effectiveRole: response.data.effective_role,
        });
        return response.data;
      } catch (error) {
        if (axios.isAxiosError(error)) {
          console.error("[auth][me] fetch:error", {
            endpoint,
            status: error.response?.status,
            headers: error.config?.headers,
          });
        } else {
          console.error("[auth][me] fetch:error", error);
        }
        throw error;
      }
    },
  });
}