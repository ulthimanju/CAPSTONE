import { Avatar, Typography } from "@/components/ui";

import { cn } from "@/lib/cn";

import {
  chatBubbleVariants,
  chatHeaderVariants,
  chatMessageVariants,
} from "./ChatMessage/ChatMessage.variants";

import { ChatMessageActions } from "./ChatMessage/ChatMessageActions";
import { ChatMessageContent } from "./ChatMessage/ChatMessageContent";

export function ChatMessage({
  message,
}) {
  return (
    <div
      className={cn(
        chatMessageVariants({
          role: message.role,
        })
      )}
    >
      <Avatar
        initials={
          message.role === "assistant"
            ? "AI"
            : "MU"
        }
      />

      <div
        className={chatBubbleVariants({
          role: message.role,
        })}
      >
        <div
          className={chatHeaderVariants()}
        >
          <Typography
            weight="semibold"
          >
            {message.role === "assistant"
              ? "Assistant"
              : "You"}
          </Typography>

          <Typography
            variant="caption"
            color="muted"
          >
            {message.createdAt}
          </Typography>
        </div>

        <ChatMessageContent
          message={message}
        />

        <ChatMessageActions
          message={message}
        />
      </div>
    </div>
  );
}