import { NewProject } from "@/editors/new-project";
import { FORMATS } from "@/projects/formats";
import type { FormatId } from "@/projects/types";
export default async function Page({
  searchParams,
}: {
  searchParams: Promise<{ format?: string; start?: string }>;
}) {
  const { format, start } = await searchParams;
  return (
    <NewProject
      initialStart={start === "templates" || start === "custom" ? start : "ai"}
      initialFormat={
        FORMATS.some((f) => f.id === format)
          ? (format as FormatId)
          : "card-news"
      }
    />
  );
}
