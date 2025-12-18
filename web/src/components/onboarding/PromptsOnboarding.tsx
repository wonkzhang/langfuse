import React from "react";
import {
  SplashScreen,
  type ValueProposition,
} from "@/src/components/ui/splash-screen";
import { FileText, GitBranch, Zap, BarChart4 } from "lucide-react";

export function PromptsOnboarding({ projectId, messages }: { projectId: string; messages: Record<string, string>; }) {
  const valuePropositions: ValueProposition[] = [
    {
      title: messages?.PromptsOnboardingVP1Title,
      description: messages?.PromptsOnboardingVP1Description,
      icon: <FileText className="h-4 w-4" />,
    },
    {
      title: messages?.PromptsOnboardingVP2Title,
      description: messages?.PromptsOnboardingVP2Description,
      icon: <GitBranch className="h-4 w-4" />,
    },
    {
      title: messages?.PromptsOnboardingVP3Title,
      description: messages?.PromptsOnboardingVP3Description,
      icon: <Zap className="h-4 w-4" />,
    },
    {
      title: messages?.PromptsOnboardingVP4Title,
      description: messages?.PromptsOnboardingVP4Description,
      icon: <BarChart4 className="h-4 w-4" />,
    },
  ];

  return (
    <SplashScreen
      title={messages?.PromptsOnboardingPageTitle}
      description={messages?.PromptsOnboardingPageDescription}
      valuePropositions={valuePropositions}
      primaryAction={{
        label: messages?.PromptsOnboardingPageCreateButtonText,
        href: `/project/${projectId}/prompts/new`,
      }}
      secondaryAction={{
        label: messages?.PromptsOnboardingPageLearnMoreButtonText,
        href: "https://langfuse.com/docs/prompt-management/get-started",
      }}
    />
  );
}
