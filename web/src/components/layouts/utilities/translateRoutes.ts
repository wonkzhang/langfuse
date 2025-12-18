import type { Route } from "@/src/components/layouts/routes";
import { ROUTES } from "@/src/components/layouts/routes";

/**
 * @file translateRoutes.ts
 * @description
 * 负责将路由定义中的 `title` 字段使用传入的国际化 `messages` 进行替换。
 * 该工具会递归处理嵌套的 `items`，并返回一个新的路由数组副本，保留原始路由对象不变。
 *
 * 使用场景：客户端或服务端在获取到 locale 对应的翻译文件后，调用此函数
 * 将 `ROUTES`（或经过过滤的路由集合）翻译为目标语言，以便在侧边栏或导航中展示本地化文本。
 *
 * 注意：如果 `messages` 中未包含对应的 key（由 `route.i18nKey` 指定），
 * 则会回退使用路由对象中的 `title` 原文。
 *
 * @example
 * import { translateRoutes } from '@/src/components/layouts/utilities/translateRoutes';
 * const messages = await fetch('/locales/zh-CN/routes.json').then(r => r.json());
 * const translated = translateRoutes(messages, ROUTES);
 *
 * @author wonkzhang
 * @date 2025-12-18
 */
/**
 * 路由翻译映射类型（仅在本模块内部使用）
 * key: 路由中定义的 `i18nKey`，value: 翻译文本
 */
type RouteTranslationMap = Record<string, string | undefined>;

/**
 * 将路由数组中的 title 用 messages 覆盖并返回新的路由数组。
 *
 * @param {RouteTranslationMap|undefined} messages - 翻译键值对对象，键为 i18nKey，值为对应文本
 * @param {Route[]} routes - 要翻译的路由数组，默认使用 `ROUTES`
 * @returns {Route[]} 返回新的路由数组副本，title 已替换为翻译文本（或保留原文）
 */
export function translateRoutes(
  messages?: RouteTranslationMap,
  routes: Route[] = ROUTES,
): Route[] {
  return routes.map((r) => {
    const translatedTitle = r.i18nKey ? messages?.[r.i18nKey] ?? r.title : r.title;
    const items = r.items ? translateRoutes(messages, r.items) : r.items;
    return { ...r, title: translatedTitle, items };
  });
}
