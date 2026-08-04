import {
  Card,
  CardContent,
} from "@/components/ui";

import {
  summaryCardVariants,
} from "./SummaryCard.variants";

import { SummaryCardHeader } from "./SummaryCardHeader";
import { SummaryCardContent } from "./SummaryCardContent";
import { SummaryCardActions } from "./SummaryCardActions";

export function SummaryCard({
  summary,

  onRegenerate,

  onCopy,

  onDownload,
}) {
  return (
    <Card className={summaryCardVariants()}>
      <CardContent>
        <SummaryCardHeader
          summary={summary}
        />

        <SummaryCardContent
          summary={summary}
        />

        <SummaryCardActions
          summary={summary}
          onRegenerate={onRegenerate}
          onCopy={onCopy}
          onDownload={onDownload}
        />
      </CardContent>
    </Card>
  );
}