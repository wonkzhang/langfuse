"use client";
import { type LucideIcon } from "lucide-react";
import {
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/src/components/ui/sidebar";
import Link from "next/link";
import { type ReactNode } from "react";
import { cn } from "@/src/utils/tailwind";
import { type RouteGroup } from "@/src/components/layouts/routes";
import { useRouter } from "next/router";
import { useEffect, useState } from "react";

/**
 * 导航主视图 - 组标签国际化说明
 *
 * 说明：下面的代码负责在客户端按当前 `router.locale` 异步加载
 * `/locales/{locale}/routes.json` 中的路由相关翻译（仅路由文本和分组标签），
 * 并在侧栏组标签处优先使用这些翻译。
 *
 * 设计要点：
 * - 选择客户端加载是为了在用户切换语言时无需改动服务器端渲染管线即可即时切换侧栏语言；
 * - 该方式存在首屏闪烁（先渲染未翻译文本，随后替换为翻译文本），若需消除闪烁可将 translations 注入到服务端 props；
 * - 加载失败时会回退使用原始 `group` 字面量（保证可用性）。
 *
 * 作者：wonkzhang
 * 日期：2025-12-18
 */

export type NavMainItem = {
  title: string;
  menuNode?: ReactNode;
  url: string;
  icon?: LucideIcon;
  isActive?: boolean;
  label?: string | ReactNode;
  newTab?: boolean;
  items?: {
    title: string;
    url: string;
    isActive?: boolean;
    newTab?: boolean;
  }[];
};

function NavItemContent({ item }: { item: NavMainItem }) {
  return (
    <>
      {item.icon && <item.icon />}
      <span>{item.title}</span>
      {item.label &&
        (typeof item.label === "string" ? (
          <span
            className={cn(
              "-my-0.5 self-center whitespace-nowrap break-keep rounded-sm border px-1 py-0.5 text-xs leading-none",
            )}
          >
            {item.label}
          </span>
        ) : (
          // ReactNode
          item.label
        ))}
    </>
  );
}

export function NavMain({
  items,
}: {
  items: {
    grouped: Partial<Record<RouteGroup, NavMainItem[]>> | null;
    ungrouped: NavMainItem[];
  };
}) {
  const router = useRouter();
  const [routeMessages, setRouteMessages] = useState<Record<string, string> | null>(null);

  useEffect(() => {
    const locale = (router.locale as string) || "en";
    const url = `/locales/${locale}/routes.json`;
    let mounted = true;
    void fetch(url)
      .then((res) => (res.ok ? res.json() : null))
      .then((json) => {
        // 在组件仍然挂载时更新本地翻译缓存
        // json 期望为 { "Routes.X": "...", "RouteGroups.Y": "..." }
        if (mounted && json) setRouteMessages(json);
      })
      .catch(() => {
        if (mounted) setRouteMessages(null);
      });
    return () => {
      mounted = false;
    };
  }, [router.locale]);

  // Map RouteGroup enum values to translation keys in routes.json
  /**
   * 将 `RouteGroup` 的字符串值映射为 `routes.json` 中的翻译键。
   * 说明：
   * - `groupValue` 来自 `ROUTES` 中定义的 `group` 字段（例如："Observability"），
   * - 这里保持显式映射以便不同语言文件使用 `RouteGroups.*` 键统一管理分组翻译。
   * - 若将来 `RouteGroup` 枚举值修改为不同的字符串，请同步更新此映射或改为使用枚举->键的函数生成策略。
   *
   * 返回值：翻译键字符串（例如 `RouteGroups.Observability`）或 `undefined` 表示不做翻译。
   */
  const groupKeyFor = (groupValue: string) => {
    switch (groupValue) {
      case "Observability":
        return "RouteGroups.Observability";
      case "Prompt Management":
        return "RouteGroups.PromptManagement";
      case "Evaluation":
        return "RouteGroups.Evaluation";
      default:
        return undefined;
    }
  };
  return (
    <>
      <SidebarGroup>
        <SidebarGroupContent>
          <SidebarMenu>
            {items.ungrouped.map((item) => (
              <SidebarMenuItem key={item.title}>
                {item.menuNode || (
                  <SidebarMenuButton
                    asChild
                    tooltip={item.title}
                    isActive={item.isActive}
                  >
                    <Link
                      href={item.url}
                      target={item.newTab ? "_blank" : undefined}
                    >
                      <NavItemContent item={item} />
                    </Link>
                  </SidebarMenuButton>
                )}
              </SidebarMenuItem>
            ))}
          </SidebarMenu>
        </SidebarGroupContent>
      </SidebarGroup>
      {items.grouped &&
        Object.entries(items.grouped).map(([group, items]) => (
          <SidebarGroup key={group}>
            <SidebarGroupLabel>
              {routeMessages && groupKeyFor(group)
                ? routeMessages[groupKeyFor(group)!] ?? group
                : group}
            </SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {items.map((item) => (
                  <SidebarMenuItem key={item.title}>
                    {item.menuNode || (
                      <SidebarMenuButton
                        asChild
                        tooltip={item.title}
                        isActive={item.isActive}
                      >
                        <Link
                          href={item.url}
                          target={item.newTab ? "_blank" : undefined}
                        >
                          <NavItemContent item={item} />
                        </Link>
                      </SidebarMenuButton>
                    )}
                  </SidebarMenuItem>
                ))}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        ))}
    </>
  );
}
