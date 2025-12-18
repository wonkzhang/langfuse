import { useRouter } from "next/router";
import { ActionButton } from "@/src/components/ActionButton";
import Page from "@/src/components/layouts/page";
import { usePostHogClientCapture } from "@/src/features/posthog-analytics/usePostHogClientCapture";
import { PromptTable } from "@/src/features/prompts/components/prompts-table";
import { useHasProjectAccess } from "@/src/features/rbac/utils/checkProjectAccess";
import { PlusIcon } from "lucide-react";
import { api } from "@/src/utils/api";
import { PromptsOnboarding } from "@/src/components/onboarding/PromptsOnboarding";
import { useEntitlementLimit } from "@/src/features/entitlements/hooks";
import { PromptDetail } from "@/src/features/prompts/components/prompt-detail";
import PromptMetrics from "./metrics";
import { useQueryParams, StringParam } from "use-query-params";
import React from "react";
import { AutomationButton } from "@/src/features/automations/components/AutomationButton";
import type { GetStaticPaths, GetStaticPropsContext } from "next";


type Params = { projectId: string; };

// 增加国际化的配置
export async function getStaticProps({ locale }: GetStaticPropsContext<Params>) {
  // 可根据 locale 加载翻译文件
  const messages = await import(`@/public/locales/${locale}/prompts.json`);
  return { props: { messages: messages.default } };
}

// 以修复动态 SSG 页面缺少 getStaticPaths 的报错
export const getStaticPaths: GetStaticPaths = async () => ({
  paths: [],
  fallback: "blocking",
});


export default function PromptsWithFolder({ messages }: { projectId: string; messages: any; }) {
  const router = useRouter();
  const projectId = router.query.projectId as string;
  const routeSegments = router.query.folder;
  const [queryParams] = useQueryParams({ folder: StringParam });
  const folderQueryParam = queryParams.folder || "";

  // Determine view type based on route segments
  // NOTE: there is a bug here, that if the user directly accesses a prompt name which ends in `/metrics`,
  // the prompt metrics page will be shown for a non-existing prompt name. Doesn't happen if the user clicks
  // this in the UI (we URL encode here and don't strip metrics). We could resolve this with another API call
  // to check the prompt name existence.
  const segmentsArray = Array.isArray(routeSegments) ? routeSegments : [];
  const isMetricsPage =
    segmentsArray.length > 0 &&
    segmentsArray[segmentsArray.length - 1] === "metrics";
  const promptNameFromRoute =
    segmentsArray.length > 0
      ? isMetricsPage
        ? segmentsArray.slice(0, -1).join("/")
        : segmentsArray.join("/")
      : "";

  const capture = usePostHogClientCapture();
  const hasCUDAccess = useHasProjectAccess({
    projectId,
    scope: "prompts:CUD",
  });
  const promptLimit = useEntitlementLimit("prompt-management-count-prompts");

  // Check if the project has any prompts
  const { data: hasAnyPrompt, isLoading } = api.prompts.hasAny.useQuery(
    { projectId },
    {
      enabled: !!projectId,
      trpc: {
        context: {
          skipBatch: true,
        },
      },
    },
  );

  const { data: count } = api.prompts.count.useQuery(
    { projectId },
    {
      enabled: !!projectId && !promptNameFromRoute, // Only count when on folder view
      trpc: {
        context: {
          skipBatch: true,
        },
      },
    },
  );

  const showOnboarding = !isLoading && !hasAnyPrompt;

  // Decide what to render: metrics, detail, or folder view
  if (promptNameFromRoute.length > 0) {
    if (isMetricsPage) {
      return <PromptMetrics promptName={promptNameFromRoute} />;
    }
    return <PromptDetail promptName={promptNameFromRoute} />;
  }

  return (
    <Page
      headerProps={{
        title: "Prompts",
        help: {
          description:
            "Manage and version your prompts in Tedi. Edit and update them via the UI and SDK. Retrieve the production version via the SDKs. Learn more in the docs.",
          href: "https://langfuse.com/docs/prompt-management/get-started",
        },
        actionButtonsRight: (
          <>
            {projectId && <AutomationButton projectId={projectId} />}
            <ActionButton
              icon={<PlusIcon className="h-4 w-4" aria-hidden="true" />}
              hasAccess={hasCUDAccess}
              href={`/project/${projectId}/prompts/new${folderQueryParam ? `?folder=${encodeURIComponent(folderQueryParam)}` : ""}`}
              variant="default"
              limit={promptLimit}
              limitValue={Number(count?.totalCount ?? 0)}
              onClick={() => {
                capture("prompts:new_form_open");
              }}
            >
              New prompt
            </ActionButton>
          </>
        ),
      }}
      scrollable={showOnboarding}
    >
      {/* Show onboarding screen if project has no prompts */}
      {showOnboarding ? (
        <PromptsOnboarding projectId={projectId} messages={messages} />
      ) : (
        <PromptTable key={folderQueryParam} />
      )}
    </Page>
  );
}
