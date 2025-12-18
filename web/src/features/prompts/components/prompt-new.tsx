import { StringParam, useQueryParam } from "use-query-params";
import { NewPromptForm } from "@/src/features/prompts/components/NewPromptForm";
import useProjectIdFromURL from "@/src/hooks/useProjectIdFromURL";
import { api } from "@/src/utils/api";
import Page from "@/src/components/layouts/page";

export type PromptMessages = Record<string, string> | null;

export const NewPrompt = ({ messages }: { messages?: PromptMessages }) => {
  const projectId = useProjectIdFromURL();
  const [initialPromptId] = useQueryParam("promptId", StringParam);

  const { data: initialPrompt, isInitialLoading } = api.prompts.byId.useQuery(
    {
      projectId: projectId as string, // Typecast as query is enabled only when projectId is present
      id: initialPromptId ?? "",
    },
    {
      enabled: Boolean(initialPromptId && projectId),
      refetchOnWindowFocus: false,
      refetchOnReconnect: false,
    },
  );

  if (isInitialLoading) {
    return <div className="p-3">{messages?.["Prompts.Loading"] ?? "加载中..."}</div>;
  }

  const breadcrumb: { name: string; href?: string }[] = [
    {
      name: messages?.["Prompts.Breadcrumb.Prompts"] ?? "提示词",
      href: `/project/${projectId}/prompts/`,
    },
    {
      name: messages?.["Prompts.New.Title"] ?? "新建提示词",
    },
  ];

  if (initialPrompt) {
    breadcrumb.pop(); // Remove "New prompt"
    breadcrumb.push(
      {
        name: initialPrompt.name,
        href: `/project/${projectId}/prompts/${encodeURIComponent(initialPrompt.name)}`,
      },
      { name: messages?.["Prompts.New.NewVersionSuffix"] ?? "新版本" },
    );
  }

  return (
    <Page
      withPadding
      scrollable
      headerProps={{
        title: initialPrompt
          ? `${initialPrompt.name} \u2014 ${messages?.["Prompts.New.NewVersionSuffix"] ?? "新版本"}`
          : messages?.["Prompts.New.Title"] ?? "新建提示词",
        help: {
          description: messages?.["Prompts.New.HelpDescription"] ?? "在 Langfuse 中管理和版本化您的提示词。您可以通过 UI 或 SDK 编辑并更新提示词，通过 SDK 获取生产版本。更多信息请参见文档。",
          href: "https://langfuse.com/docs/prompts",
        },
        breadcrumb: breadcrumb,
      }}
    >
      {initialPrompt ? (
        <p className="text-sm text-muted-foreground">
          {messages?.["Prompts.New.ImmutableNote"] ?? "提示词在 Langfuse 中为不可变。要更新提示词，请创建新版本。"}
        </p>
      ) : null}
      <div className="my-8">
        <NewPromptForm {...{ initialPrompt }} />
      </div>
    </Page>
  );
};
