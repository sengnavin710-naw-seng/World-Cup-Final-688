import { lazy } from "react";
import type { HomeTab } from "../../lib/tournamentQueries";

export function createModulePreloader<T>(loader: () => Promise<T>) {
  let preloadPromise: Promise<T> | null = null;

  return () => {
    preloadPromise ??= loader().catch((error: unknown) => {
      preloadPromise = null;
      throw error;
    });

    return preloadPromise;
  };
}

const preloadKnockoutTab = createModulePreloader(() => import("../home/KnockoutTab"));
const preloadFixturesTab = createModulePreloader(() => import("../home/FixturesTab"));
const preloadTableTab = createModulePreloader(() => import("../home/TableTab"));
const preloadNewsTab = createModulePreloader(() => import("../home/NewsTab"));

const tabPreloaders = {
  Knockout: preloadKnockoutTab,
  Fixtures: preloadFixturesTab,
  Table: preloadTableTab,
  News: preloadNewsTab
} satisfies Record<HomeTab, () => Promise<unknown>>;

export const LazyKnockoutTab = lazy(() =>
  preloadKnockoutTab().then((module) => ({ default: module.KnockoutTab })),
);
export const LazyFixturesTab = lazy(() =>
  preloadFixturesTab().then((module) => ({ default: module.FixturesTab })),
);
export const LazyTableTab = lazy(() =>
  preloadTableTab().then((module) => ({ default: module.TableTab })),
);
export const LazyNewsTab = lazy(() =>
  preloadNewsTab().then((module) => ({ default: module.NewsTab })),
);

export function preloadTabModule(tab: HomeTab) {
  return tabPreloaders[tab]();
}
