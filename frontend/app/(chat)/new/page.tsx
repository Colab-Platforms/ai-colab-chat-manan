import { redirect } from "next/navigation";

export default function NewChatAliasPage({
  searchParams,
}: {
  searchParams?: { folderId?: string };
}) {
  const folderId = searchParams?.folderId;
  if (folderId && folderId.trim() !== "") {
    redirect(`/?folderId=${encodeURIComponent(folderId)}`);
  }
  redirect("/");
}
