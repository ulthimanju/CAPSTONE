import { Folder } from "lucide-react";

import {
  Badge,
  Button,
  Card,
  CardContent,
  Dropdown,
  Icon,
  Progress,
  Typography,
} from "@/components/ui";

import {
  workspaceCardFooterVariants,
  workspaceCardHeaderVariants,
  workspaceCardMetaVariants,
  workspaceCardVariants,
} from "./WorkspaceCard.variants";

export function WorkspaceCard({
  workspace,

  onOpen,

  onDelete,
}) {
  return (
    <Card
      className={workspaceCardVariants()}
    >
      <CardContent>
        <div
          className={workspaceCardHeaderVariants()}
        >
          <div className="flex gap-3">
            <Folder size={22} />

            <div>
              <Typography
                variant="title"
                weight="semibold"
              >
                {workspace.name}
              </Typography>

              <Typography
                variant="body-small"
                color="muted"
              >
                {workspace.description}
              </Typography>
            </div>
          </div>

          <Dropdown
            trigger={
              <Button
                variant="ghost"
                size="sm"
              >
                <Icon name="moreHorizontal" />
              </Button>
            }
            items={[
              {
                label: "Open",
                onSelect: onOpen,
              },
              {
                separator: true,
              },
              {
                label: "Delete",
                variant: "danger",
                onSelect: onDelete,
              },
            ]}
          />
        </div>

        <Progress
          value={workspace.progress}
          showValue
        />

        <div
          className={workspaceCardMetaVariants()}
        >
          <Badge>
            {workspace.documents} Docs
          </Badge>

          <Badge
            variant="secondary"
          >
            {workspace.members} Members
          </Badge>
        </div>

        <div
          className={workspaceCardFooterVariants()}
        >
          <Typography
            variant="caption"
            color="muted"
          >
            Updated {workspace.updatedAt}
          </Typography>

          <Button
            size="sm"
            onClick={onOpen}
          >
            Open
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}