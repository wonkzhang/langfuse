import { OrganizationProjectOverview } from "@/src/features/organizations/components/ProjectOverview";
import type { GetServerSideProps } from "next";

type Messages = Record<string, string> | null;

export default function Home({ messages }: { messages?: Messages }) {
  return <OrganizationProjectOverview messages={messages} />;
}

export const getServerSideProps: GetServerSideProps<{ messages: Messages }> = async (
  context,
) => {
  const locale = (context.locale as string) || "zh-CN";
  try {
    const fs = await import("fs/promises");
    const path = await import("path");
    const filePath = path.join(process.cwd(), "public", "locales", locale, "organizations.json");
    const content = await fs.readFile(filePath, "utf-8");
    const messages: Messages = JSON.parse(content);
    return { props: { messages } };
  } catch (e: unknown) {
    if (e instanceof Error) {
      console.error("Failed to load organizations.json:", e.message);
    } else {
      console.error("Failed to load organizations.json:", e);
    }
    return { props: { messages: null } };
  }
};
