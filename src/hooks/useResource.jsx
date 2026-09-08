import { useQuery } from "@tanstack/react-query";
import { useCurrentUser } from "../context/AuthContext.jsx";
export function useResource(key, queryFn, enabled = true) {
  const user = useCurrentUser();
  return useQuery({
    queryKey: ["view", user?.id, ...key],
    queryFn,
    enabled: !!user && enabled,
    throwOnError: (error, query) => !query.state.data,
  });
}
