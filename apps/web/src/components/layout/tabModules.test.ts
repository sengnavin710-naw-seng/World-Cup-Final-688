import { describe, expect, test, vi } from "vitest";
import { createModulePreloader } from "./tabModules";

describe("createModulePreloader", () => {
  test("repeated preload calls reuse one loader promise", async () => {
    const module = { name: "Fixtures" };
    let resolveModule: (value: typeof module) => void = () => {};
    const loader = vi.fn(
      () =>
        new Promise<typeof module>((resolve) => {
          resolveModule = resolve;
        }),
    );
    const preload = createModulePreloader(loader);

    const firstPreload = preload();
    const secondPreload = preload();

    expect(secondPreload).toBe(firstPreload);
    expect(loader).toHaveBeenCalledTimes(1);

    resolveModule(module);

    await expect(firstPreload).resolves.toBe(module);
  });

  test("failed preload resets so retry can call loader again", async () => {
    const error = new Error("load failed");
    const module = { name: "News" };
    const loader = vi
      .fn<() => Promise<typeof module>>()
      .mockRejectedValueOnce(error)
      .mockResolvedValueOnce(module);
    const preload = createModulePreloader(loader);

    await expect(preload()).rejects.toBe(error);
    await expect(preload()).resolves.toBe(module);

    expect(loader).toHaveBeenCalledTimes(2);
  });
});
