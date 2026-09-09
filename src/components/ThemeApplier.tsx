import { useEffect } from "react";
import { useStall } from "../contexts/StallContext";
import { applyTheme } from "../theme/theme";

/** Applies the stall's chosen theme (or clears to the built-in default)
 *  whenever the stall record loads or its theme changes. */
export default function ThemeApplier() {
  const { stall } = useStall();
  useEffect(() => {
    applyTheme(stall?.theme ?? null);
  }, [stall?.theme]);
  return null;
}
