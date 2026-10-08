import { AddButton } from "@/components/AddButton";
import { TopNav } from "@/components/TopNav";

export default function AppLayout({ children }: LayoutProps<"/">) {
  return (
    <>
      <TopNav />
      <main className="mx-auto max-w-xl px-4 pb-24 pt-6">{children}</main>
      <AddButton />
    </>
  );
}
