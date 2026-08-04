import {
  Badge,
  Button,
  Icon,
  Progress,
  Typography,
} from "@/components/ui";

const STATUS_BADGE_VARIANTS = {
  queued: "secondary",
  uploading: "info",
  processing: "warning",
  completed: "success",
  failed: "danger",
};

export function UploadFileItem({
  file,

  onAction,
}) {
  const handleAction = action => {
    onAction?.(action, file);
  };

  return (
    <div className="flex items-start gap-4 rounded-[var(--radius-md)] border border-[var(--color-border)] p-4">
      <Icon
        name="file"
        size="lg"
      />

      <div className="min-w-0 flex-1 space-y-3">
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0">
            <Typography
              variant="body-small"
              weight="medium"
              truncate
            >
              {file.name}
            </Typography>

            <Typography
              variant="caption"
              color="muted"
            >
              {file.size}
            </Typography>
          </div>

          <Badge
            variant={
              STATUS_BADGE_VARIANTS[file.status] ??
              "secondary"
            }
          >
            {file.status}
          </Badge>
        </div>

        {file.status === "uploading" && (
          <Progress
            value={file.progress}
            showValue
          />
        )}
      </div>

      <div className="flex items-center gap-2">
        {file.status === "failed" && (
          <Button
            size="sm"
            variant="secondary"
            leftIcon="refreshCw"
            onClick={() =>
              handleAction("retry")
            }
          >
            Retry
          </Button>
        )}

        {file.status === "uploading" && (
          <Button
            size="sm"
            variant="ghost"
            leftIcon="x"
            onClick={() =>
              handleAction("cancel")
            }
          >
            Cancel
          </Button>
        )}

        <Button
          size="sm"
          variant="ghost"
          onClick={() =>
            handleAction("remove")
          }
        >
          <Icon
            name="trash"
            size="xs"
          />
        </Button>
      </div>
    </div>
  );
}