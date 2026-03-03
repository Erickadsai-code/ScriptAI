import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

export const useRole = () => {
  const { user } = useAuth();
  const [role, setRole] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user?.id) {
      setRole(null);
      setLoading(false);
      return;
    }

    supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", user.id)
      .maybeSingle()
      .then(({ data }) => {
        setRole(data?.role || "collaborator");
        setLoading(false);
      });
  }, [user?.id]);

  return { role, isAdmin: role === "admin", loading };
};
