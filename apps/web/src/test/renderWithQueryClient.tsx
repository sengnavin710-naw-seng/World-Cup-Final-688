import { QueryClientProvider } from "@tanstack/react-query";
import { render, type RenderOptions } from "@testing-library/react";
import type { ReactElement } from "react";
import { createAppQueryClient } from "../lib/queryClient";

export function renderWithQueryClient(
  ui: ReactElement,
  options?: Omit<RenderOptions, "wrapper">,
) {
  const queryClient = createAppQueryClient();
  const result = render(
    <QueryClientProvider client={queryClient}>{ui}</QueryClientProvider>,
    options,
  );

  return { ...result, queryClient };
}
