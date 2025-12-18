import { NewPrompt, type PromptMessages } from "@/src/features/prompts/components/prompt-new";
import { type GetServerSideProps } from "next";

export default NewPrompt;

export const getServerSideProps: GetServerSideProps<{ messages: PromptMessages }> = async (
  context,
) => {
  const locale = (context.locale as string) || "zh-CN";
  try {
    // Load prompts.json from public locales on server-side to avoid client flash
    // Note: path resolves relative to project root when using fs; using dynamic import from build output is not straightforward,
    // so fetch from the public folder via absolute file read.
    const fs = await import("fs/promises");
    const path = await import("path");
    const filePath = path.join(process.cwd(), "web", "public", "locales", locale, "prompts.json");
    const content = await fs.readFile(filePath, "utf-8");
    const messages: PromptMessages = JSON.parse(content);
    return { props: { messages } };
  } catch (e) {
    return { props: { messages: null } };
  }
};
