import { Typography } from "@/components/ui";

import {
  flashcardFaceVariants,
} from "./Flashcard.variants";

export function FlashcardFace({
  flashcard,

  revealed,
}) {
  return (
    <div className={flashcardFaceVariants()}>
      <Typography
        variant="body"
        align="center"
      >
        {revealed
          ? flashcard.back
          : flashcard.front}
      </Typography>
    </div>
  );
}