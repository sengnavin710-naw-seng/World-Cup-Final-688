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
  if (tab === "Knockout") {
    return preloadKnockoutTab();
  }

  if (tab === "Fixtures") {
    return preloadFixturesTab();
  }

  if (tab === "Table") {
    return preloadTableTab();
  }

  return preloadNewsTab();
}
