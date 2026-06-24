import { createAppQueryClient } from "./queryClient";

test("configures tournament queries for resilient browser caching", () => {
  const queryClient = createAppQueryClient();

  expect(queryClient.getDefaultOptions().queries).toMatchObject({
    gcTime: 30 * 60 * 1_000,
    refetchOnReconnect: true,
    refetchOnWindowFocus: true,
    retry: 1,
  });
});
