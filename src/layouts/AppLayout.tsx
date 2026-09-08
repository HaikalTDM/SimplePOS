import { Outlet } from "react-router-dom";
import { HeaderNav, MobileNav } from "../components";
import { useStall } from "../contexts/StallContext";

export default function AppLayout() {
  const { stall } = useStall();
  const stallName = stall?.name;

  return (
    <>
      <HeaderNav stallName={stallName} />
      <main className="app-layout__main">
        <Outlet />
      </main>
      <MobileNav stallName={stallName} />
    </>
  );
}
