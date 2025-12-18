/**
 * Hook to filter and process navigation based on user permissions and context
 * Implements memoization to prevent unnecessary recalculations
 */

import { useRouter } from "next/router";
import { useMemo } from "react";
import type { Session, User } from "next-auth";
import { useEntitlements } from "@/src/features/entitlements/hooks";
import { useUiCustomization } from "@/src/ee/features/ui-customization/useUiCustomization";
import { useLangfuseCloudRegion } from "@/src/features/organizations/hooks";
import {
  ROUTES,
  RouteSection,
  RouteGroup,
  type Route,
} from "@/src/components/layouts/routes";
/**
 * 翻译辅助函数：将路由数组中的 `title` 用传入的翻译映射替换。
 * 定位：utilities/translateRoutes.ts
 * 说明：此处在客户端加载到 route 翻译后会调用该函数来替换导航项的 `title` 字段。
 */
import { translateRoutes } from "@/src/components/layouts/utilities/translateRoutes";
import { useState, useEffect } from "react";
import type { NavigationItem } from "@/src/components/layouts/utilities/routes";
import { applyNavigationFilters } from "../utils/navigationFilters";
import type { NavigationFilterContext } from "../utils/navigationFilters.types";
import { isPathActive } from "../utils/pathClassification";

/** Organization type from user session (can be null when not in project/org context) */
type Organization = User["organizations"][number] | null | undefined;

/** Grouped navigation structure */
type GroupedNavigation = {
  ungrouped: NavigationItem[];
  grouped: Partial<Record<RouteGroup, NavigationItem[]>> | null;
  flattened: NavigationItem[];
};

/**
 * Groups navigation items by RouteGroup
 */
function groupNavigationItems(items: NavigationItem[]): GroupedNavigation {
  const ungrouped = items.filter((item) => !item.group);
  const grouped: Partial<Record<RouteGroup, NavigationItem[]>> = {};

  items.forEach((item) => {
    if (item.group) {
      if (!grouped[item.group]) {
        grouped[item.group] = [];
      }
      grouped[item.group]!.push(item);
    }
  });

  const groupedResult = Object.keys(grouped).length > 0 ? grouped : null;
  const groupedItems = groupedResult
    ? [
      ...(grouped[RouteGroup.Observability] || []),
      ...(grouped[RouteGroup.PromptManagement] || []),
      ...(grouped[RouteGroup.Evaluation] || []),
    ]
    : [];

  return {
    ungrouped,
    grouped: groupedResult,
    flattened: [...ungrouped, ...groupedItems],
  };
}

/**
 * Filters and processes navigation items based on:
 * - Project/organization context
 * - User permissions (RBAC)
 * - Plan entitlements
 * - Feature flags
 * - UI customization settings
 *
 * Returns navigation split into main/secondary sections with active states
 *
 * @param session - Current user session
 * @param organization - Current organization object
 * @returns Processed navigation with main, secondary, and flattened arrays
 */
export function useFilteredNavigation(
  session: Session | null,
  organization: Organization,
) {
  const router = useRouter();
  const entitlements = useEntitlements();
  const uiCustomization = useUiCustomization();
  const { isLangfuseCloud, region } = useLangfuseCloudRegion();

  const routerProjectId = router.query.projectId as string | undefined;
  const routerOrganizationId = router.query.organizationId as
    | string
    | undefined;

  // Memoize filter context to prevent unnecessary recalculations
  const filterContext = useMemo<NavigationFilterContext>(
    () => ({
      routerProjectId,
      routerOrganizationId,
      session,
      enableExperimentalFeatures:
        session?.environment?.enableExperimentalFeatures ?? false,
      cloudAdmin: Boolean(
        session?.user?.admin && isLangfuseCloud && region !== "DEV",
      ),
      entitlements,
      uiCustomization,
      currentPath: router.asPath,
    }),
    [
      routerProjectId,
      routerOrganizationId,
      session,
      entitlements,
      uiCustomization,
      router.asPath,
      isLangfuseCloud,
      region,
    ],
  );

  // Memoize filtered routes
  const filteredRoutes = useMemo(() => {
    return applyNavigationFilters(ROUTES, filterContext, organization);
  }, [filterContext, organization]);

  /**
   * 客户端路由翻译映射
   *
   * 说明：
   * - `routeMessages` 保存从 `public/locales/{locale}/routes.json` 异步加载到的键值对（仅路由相关翻译）。
   * - 选择在客户端加载的原因：侧边栏在客户端路由变化时需要即时切换语言；为了避免改动现有 SSR 管线，先以客户端加载为保守方案。
   * - 注意：该方式会产生首屏短暂的非翻译文本闪烁；若需消除闪烁，应将翻译在服务端注入到页面 props 中（可作为后续优化）。
   *
   * 作者：wonkzhang
   * 日期：2025-12-18
   */
  const [routeMessages, setRouteMessages] = useState<Record<string, string> | null>(null);

  useEffect(() => {
    // 以 router.locale 作为当前语言标识去加载对应的 routes 翻译文件
    // 例如：/locales/zh-CN/routes.json
    const locale = (router.locale as string) || "en";
    const url = `/locales/${locale}/routes.json`;
    let mounted = true;

    // 使用 fetch 异步加载 JSON；使用 mounted 标志以避免在组件卸载后去设置 state
    void fetch(url)
      .then((res) => (res.ok ? res.json() : null))
      .then((json) => {
        // 仅在组件仍然挂载时更新状态
        if (mounted && json) setRouteMessages(json);
      })
      .catch(() => {
        // 加载失败时清空翻译（会回退到原始 title）
        if (mounted) setRouteMessages(null);
      });

    // 卸载回调，防止内存泄漏或异步 setState 报错
    return () => {
      mounted = false;
    };
  }, [router.locale]);

  // Map filtered routes to NavigationItems with url and isActive
  // This is O(n) - we map directly over filteredRoutes instead of re-iterating ROUTES
  return useMemo(() => {
    const mapRouteToNavigationItem = (route: Route): NavigationItem => {
      const url = route.pathname
        .replace("[projectId]", routerProjectId ?? "")
        .replace("[organizationId]", routerOrganizationId ?? "");

      // Recursively map nested items (already filtered by applyNavigationFilters)
      const items: NavigationItem[] | undefined = route.items
        ?.map(mapRouteToNavigationItem)
        .filter((item): item is NavigationItem => item !== null);

      return {
        ...route,
        url,
        isActive: isPathActive(route.pathname, router.pathname),
        items: items && items.length > 0 ? items : undefined,
      };
    };

    // Map filtered routes to navigation items
    // 说明：若成功加载到 routeMessages（来自 /public/locales/{locale}/routes.json），
    // 则优先使用 translateRoutes 将 filteredRoutes 中的 title 替换为本地化文本；
    // 否则使用 filteredRoutes 的原始 title。
    // 该逻辑保证在没有翻译文件或加载失败时仍能正常显示原始导航。
    const routesToMap = routeMessages
      ? translateRoutes(routeMessages, filteredRoutes)
      : filteredRoutes;
    const allItems = routesToMap.map(mapRouteToNavigationItem);

    // Split by section and group
    const mainItems = allItems.filter(
      (item) => item.section === RouteSection.Main,
    );
    const secondaryItems = allItems.filter(
      (item) => item.section === RouteSection.Secondary,
    );

    const mainNavigation = groupNavigationItems(mainItems);
    const secondaryNavigation = groupNavigationItems(secondaryItems);

    return {
      mainNavigation,
      secondaryNavigation,
      navigation: [
        ...mainNavigation.flattened,
        ...secondaryNavigation.flattened,
      ],
    };
  }, [routeMessages, filteredRoutes, routerProjectId, routerOrganizationId, router.pathname]);
}
