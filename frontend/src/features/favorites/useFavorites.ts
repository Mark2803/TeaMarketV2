import {
  useCallback,
  useEffect,
  useMemo
} from "react";

import {
  useMutation,
  useQuery,
  useQueryClient
} from "@tanstack/react-query";

import {
  useLocation,
  useNavigate
} from "react-router-dom";

import {
  addFavorite,
  getFavorites,
  removeFavorite
} from "../../shared/api/favorites";

import {
  useAuth
} from "../auth/AuthProvider";

import {
  clearLegacyFavoritesStorage
} from "./favorites.storage";

import {
  mapFavoriteItem
} from "./favorites.mapper";

export function useFavorites() {
  const {
    session,
    isInitializing
  } = useAuth();

  const navigate = useNavigate();
  const location = useLocation();
  const queryClient = useQueryClient();

  const customerId =
    session.user?.id ?? null;

  useEffect(() => {
    clearLegacyFavoritesStorage();
  }, []);

  const query = useQuery({
    queryKey: [
      "favorites",
      customerId
    ],
    queryFn: getFavorites,
    enabled:
      session.isAuthenticated
      && Boolean(customerId),
    staleTime: 30_000
  });

  const items = useMemo(
    () =>
      (query.data?.data ?? [])
        .map(mapFavoriteItem),
    [query.data]
  );

  const productIds = useMemo(
    () =>
      new Set(
        items.map(
          (item) =>
            item.product.id
        )
      ),
    [items]
  );

  const invalidate = useCallback(
    async () => {
      await queryClient.invalidateQueries({
        queryKey: [
          "favorites",
          customerId
        ]
      });
    },
    [customerId, queryClient]
  );

  const addMutation = useMutation({
    mutationFn: addFavorite,
    onSuccess: invalidate
  });

  const removeMutation = useMutation({
    mutationFn: removeFavorite,
    onSuccess: invalidate
  });

  const requireAuthentication = useCallback(
    (): boolean => {
      if (session.isAuthenticated) {
        return true;
      }

      navigate("/auth", {
        state: {
          from:
            `${location.pathname}${location.search}`
        }
      });

      return false;
    },
    [
      location.pathname,
      location.search,
      navigate,
      session.isAuthenticated
    ]
  );

  const isFavorite = useCallback(
    (productId: string) =>
      productIds.has(productId),
    [productIds]
  );

  const toggle = useCallback(
    async (
      productId: string
    ): Promise<boolean> => {
      if (!requireAuthentication()) {
        return false;
      }

      try {
        if (productIds.has(productId)) {
          await removeMutation.mutateAsync(
            productId
          );

          return false;
        }

        await addMutation.mutateAsync(
          productId
        );

        return true;
      } catch {
        return productIds.has(productId);
      }
    },
    [
      addMutation,
      productIds,
      removeMutation,
      requireAuthentication
    ]
  );

  const remove = useCallback(
    async (productId: string) => {
      if (!requireAuthentication()) {
        return;
      }

      try {
        await removeMutation.mutateAsync(
          productId
        );
      } catch {
        // Ошибка доступна через isError/error мутации.
      }
    },
    [removeMutation, requireAuthentication]
  );

  return {
    items,
    count: items.length,
    isEmpty: items.length === 0,
    isLoading:
      isInitializing
      || (
        session.isAuthenticated
        && query.isLoading
      ),
    isError: query.isError,
    error: query.error,
    isMutating:
      addMutation.isPending
      || removeMutation.isPending,
    isAuthenticated:
      session.isAuthenticated,
    isFavorite,
    toggle,
    remove,
    refetch: query.refetch
  };
}
