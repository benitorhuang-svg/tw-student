export { AppLoadingShell, AppErrorShell } from "./ui/AppStatusShell";
export { default as AnomalyPanel } from "./ui/governance/AnomalyPanel";
export { default as AtlasFooter } from "./ui/navigation/AtlasFooter";
export { AtlasLevelFilter, AtlasPlaybackPill, AtlasRegionPill, AtlasTypeFilter } from "./ui/filters/AtlasGlobalFilters";
export { default as AtlasTabs } from "./ui/navigation/AtlasTabs";
export type { AtlasTabItem } from "./ui/navigation/AtlasTabs";
export { default as DataGovernanceFlyout } from "./ui/governance/DataGovernanceFlyout";
export { default as TaiwanExplorerMap } from "./ui/TaiwanExplorerMap";
export type { SchoolMapPoint } from "./ui/map/types";
export * from "./utils/atlasHelpers";
export { useAtlasLoadObservation } from "./model/useAtlasLoadObservation";
export { useAtlasSearchNavigation } from "./model/useAtlasSearchNavigation";
export { useAtlasTopPrefetch } from "./model/useAtlasTopPrefetch";
export { useAtlasUrlSync } from "./model/useAtlasUrlSync";

export function loadTaiwanExplorerMap() {
  return import("./ui/TaiwanExplorerMap");
}

export function loadDataGovernanceFlyout() {
  return import("./ui/governance/DataGovernanceFlyout");
}

export function loadAnomalyPanel() {
  return import("./ui/governance/AnomalyPanel");
}
