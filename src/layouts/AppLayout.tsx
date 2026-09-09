import { Outlet, useLocation } from "react-router-dom";
import { HeaderNav, MobileNav } from "../components";
import InstallPrompt from "../components/InstallPrompt";
import { useStall } from "../contexts/StallContext";

export default function AppLayout() {
  const { stall } = useStall();
  const stallName = stall?.name;
  const { pathname } = useLocation();
  // Don't interrupt the cashier mid-flow.
  const showInstall = pathname !== "/pos";

  return (
    <>
      <HeaderNav stallName={stallName} />
      <main className="app-layout__main">
        <Outlet />
      </main>
      <MobileNav stallName={stallName} />
      {showInstall && <InstallPrompt />}
    </>
  );
}
