import { NewPrompt, type PromptMessages } from "@/src/features/prompts/components/prompt-new";
import { type GetServerSideProps } from "next";

export default NewPrompt;

/**
 * getServerSideProps for the New Prompt page
 *
 * 目的：在服务器端加载本地化的 prompts.json 文件，并把解析得到的
 * 文本（`messages`）作为 prop 注入页面组件，避免客户端首次渲染时出现
 * 未本地化文本闪烁（flash）。
 *
 * 行为要点：
 * - 从 `context.locale` 推断要加载的语言（若无则使用 `zh-CN`）。
 * - 在服务器上以文件读取方式加载 `web/public/locales/{locale}/prompts.json`，
 *   然后 JSON.parse 并返回给页面。这样能在 SSR 阶段就渲染本地化文本。
 * - 出错时返回 `messages: null`（页面会退回到安全的默认渲染或内联回退），
 *   并对错误做类型窄化后记录日志，避免在 catch 中使用隐式 any，使日志更可靠。
 *
 * 注意事项：
 * - 在构建产物中直接动态 import public 下的资源并不总是可行，因此这里使用
 *   基于 `process.cwd()` 的绝对路径读取 `public/locales`。若部署环境对文件结构
 *   有不同（例如静态导出或 CDN），需要相应调整读取方式。
 * - 返回值 `messages` 的类型为 `PromptMessages`（`Record<string,string> | null`），
 *   保证序列化安全（不能返回 undefined）。
 *
 * 作者: wonkzhang
 * 日期: 2025-12-18
 */
export const getServerSideProps: GetServerSideProps<{ messages: PromptMessages }> = async (
  context,
) => {
  // 首选使用请求中的 locale；若没有，则默认使用 zh-CN（便于中文优先体验）
  const locale = (context.locale as string) || "zh-CN";

  try {
    // 使用 fs/promises 以异步方式读取目标 JSON 文件
    const fs = await import("fs/promises");
    const path = await import("path");

    // 构建文件路径：<repo-root>/web/public/locales/{locale}/prompts.json
    const filePath = path.join(process.cwd(), "public", "locales", locale, "prompts.json");

    // 读取并解析 JSON
    const content = await fs.readFile(filePath, "utf-8");
    const messages: PromptMessages = JSON.parse(content);

    // 成功：将 messages 注入页面 props
    return { props: { messages } };
  } catch (e: unknown) {
    // 对未知错误进行窄化处理并记录，确保日志包含有用的信息
    if (e instanceof Error) {
      console.error("Failed to load prompts.json:", e.message);
    } else {
      console.error("Failed to load prompts.json:", e);
    }

    // 失败：返回一个可序列化的安全值（null），页面端应对 null 做退路处理
    return { props: { messages: null } };
  }
};
