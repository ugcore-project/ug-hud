/*

    ug-hud - https://github.com/ugcore-project
    Copyright (C) 2026 UgCore Framework & Contributors
    Licensed under the GNU General Public License. See LICENSE for details.

*/

import { lazy, Suspense, useEffect } from "react";
import { Editor } from "@/components/Editor";
import { Hud } from "@/components/Hud";
import { isEnvBrowser, sendReady, sendViewport } from "@/lib/nui";
import { installMessages, useHud } from "@/store/hudStore";

// Dev only: removed from production builds.
// Dev and showcase builds only: removed from production builds.
const Preview = import.meta.env.DEV || import.meta.env.MODE === "showcase" ? lazy(() => import("@/dev/Preview")) : null;

export default function App() {
  const ready = useHud((state) => state.ready);
  const editing = useHud((state) => state.editing);
  const settings = useHud((state) => state.settings);

  useEffect(() => {
    const uninstall = installMessages();

    void sendReady();
    void sendViewport();

    // A resize posts once it settles, so dragging a window does not flood Lua.
    let timer = 0;
    const onResize = () => {
      window.clearTimeout(timer);
      timer = window.setTimeout(() => void sendViewport(), 250);
    };

    window.addEventListener("resize", onResize);

    return () => {
      uninstall();
      window.removeEventListener("resize", onResize);
      window.clearTimeout(timer);
    };
  }, []);

  return (
    <>
      {ready && (editing ? <Editor /> : <Hud settings={settings} editing={false} />)}
      {Preview && isEnvBrowser() && (
        <Suspense fallback={null}>
          <Preview />
        </Suspense>
      )}
    </>
  );
}
