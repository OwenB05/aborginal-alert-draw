import { TopNav } from "@/components/layout/top-nav";
import { SettingsMenu } from "@/components/layout/settings-menu";
import { Footer } from "@/components/layout/footer";
import { AcceptInviteForm } from "./accept-form";

export const dynamic = "force-dynamic";

export default async function AcceptInvitePage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  return (
    <>
      <TopNav>
        <SettingsMenu />
      </TopNav>
      <main className="mx-auto w-full max-w-7xl flex-1 px-4 pb-10 sm:px-6">
        <AcceptInviteForm token={token} />
      </main>
      <Footer />
    </>
  );
}
