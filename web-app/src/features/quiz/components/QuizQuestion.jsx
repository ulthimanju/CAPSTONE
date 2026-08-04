import { Typography } from "@/components/ui";

export function QuizQuestion({
  question,
}) {
  return (
    <Typography
      variant="title"
      weight="semibold"
    >
      {question.question}
    </Typography>
  );
}