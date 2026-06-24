import { QueryClient } from "@tanstack/react-query";

const THIRTY_MINUTES = 30 * 60 * 1000;

export function createAppQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: {
        gcTime: THIRTY_MINUTES,
        refetchOnReconnect: true,
        refetchOnWindowFocus: true,
        retry: 1,
      },
    },
  });
}

export const appQueryClient = createAppQueryClient();
