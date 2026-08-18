import { redirect } from "next/navigation";

export default function NewChatAliasPage({
  searchParams,
}: {
  searchParams?: { folderId?: string };
}) {
  const folderId = searchParams?.folderId;
  if (folderId && folderId.trim() !== "") {
    redirect(`/home?folderId=${encodeURIComponent(folderId)}`);
  }
  redirect("/home");
}
