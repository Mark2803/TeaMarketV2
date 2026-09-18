import { useCallback, useEffect, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { addFavorite, getFavorites, mergeGuestFavorites, removeFavorite, resolveGuestFavorites } from "../../shared/api/favorites";
import { useAuth } from "../auth/AuthProvider";
import { clearGuestFavorites, getGuestFavoriteIds, removeGuestFavorite, toggleGuestFavorite } from "./favorites.storage";
import { mapFavoriteItem } from "./favorites.mapper";

export function useFavorites() {
  const { session, isInitializing } = useAuth();
  const queryClient = useQueryClient();
  const customerId = session.user?.id ?? null;
  const [guestIds, setGuestIds] = useState<string[]>(() => getGuestFavoriteIds());

  useEffect(() => {
    const sync = () => setGuestIds(getGuestFavoriteIds());
    window.addEventListener("tea-market-guest-favorites-changed", sync);
    window.addEventListener("storage", sync);
    return () => {
      window.removeEventListener("tea-market-guest-favorites-changed", sync);
      window.removeEventListener("storage", sync);
    };
  }, []);

  const query = useQuery({
    queryKey: session.isAuthenticated
      ? ["favorites", "customer", customerId]
      : ["favorites", "guest", guestIds.join(",")],
    queryFn: () => session.isAuthenticated
      ? getFavorites()
      : resolveGuestFavorites(guestIds),
    enabled: !isInitializing && (session.isAuthenticated ? Boolean(customerId) : true),
    staleTime: 30_000
  });

  // После входа переносим локальные ID в таблицу favorites и только после успеха очищаем localStorage.
  useEffect(() => {
    if (!session.isAuthenticated || !customerId) return;
    const ids = getGuestFavoriteIds();
    if (ids.length === 0) return;
    let cancelled = false;
    void mergeGuestFavorites(ids).then(async () => {
      if (cancelled) return;
      clearGuestFavorites();
      setGuestIds([]);
      await queryClient.invalidateQueries({ queryKey: ["favorites", "customer", customerId] });
    }).catch(() => {
      // При ошибке локальное избранное не теряем; перенос повторится при следующем монтировании/входе.
    });
    return () => { cancelled = true; };
  }, [customerId, queryClient, session.isAuthenticated]);

  const items = useMemo(() => (query.data?.data ?? []).map(mapFavoriteItem), [query.data]);
  const productIds = useMemo(
    () => new Set(session.isAuthenticated ? items.map((item) => item.product.id) : guestIds),
    [guestIds, items, session.isAuthenticated]
  );

  const invalidateCustomer = useCallback(async () => {
    await queryClient.invalidateQueries({ queryKey: ["favorites", "customer", customerId] });
  }, [customerId, queryClient]);

  const addMutation = useMutation({ mutationFn: addFavorite, onSuccess: invalidateCustomer });
  const removeMutation = useMutation({ mutationFn: removeFavorite, onSuccess: invalidateCustomer });

  const isFavorite = useCallback((productId: string) => productIds.has(productId), [productIds]);

  const toggle = useCallback(async (productId: string): Promise<boolean> => {
    if (!session.isAuthenticated) {
      const result = toggleGuestFavorite(productId);
      setGuestIds(getGuestFavoriteIds());
      return result;
    }
    try {
      if (productIds.has(productId)) {
        await removeMutation.mutateAsync(productId);
        return false;
      }
      await addMutation.mutateAsync(productId);
      return true;
    } catch {
      return productIds.has(productId);
    }
  }, [addMutation, productIds, removeMutation, session.isAuthenticated]);

  const remove = useCallback(async (productId: string) => {
    if (!session.isAuthenticated) {
      removeGuestFavorite(productId);
      setGuestIds(getGuestFavoriteIds());
      return;
    }
    try { await removeMutation.mutateAsync(productId); } catch { /* состояние ошибки доступно из мутации */ }
  }, [removeMutation, session.isAuthenticated]);

  return {
    items,
    count: session.isAuthenticated ? items.length : guestIds.length,
    isEmpty: session.isAuthenticated ? items.length === 0 : guestIds.length === 0,
    isLoading: isInitializing || query.isLoading,
    isError: query.isError,
    error: query.error,
    isMutating: addMutation.isPending || removeMutation.isPending,
    isAuthenticated: session.isAuthenticated,
    isFavorite,
    toggle,
    remove,
    refetch: query.refetch
  };
}
