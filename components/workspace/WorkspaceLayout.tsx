"use client";

import { useEffect, useState } from "react";
import { WORKSPACE_REFRESH_FLAG } from "@/lib/workspaceRefresh";
import { WorkspaceHome } from "./WorkspaceHome";
import { WorkspaceShell } from "./WorkspaceShell";
import { WorkspaceTopBar } from "./WorkspaceTopBar";

export function WorkspaceLayout() {
  const [searchQuery, setSearchQuery] = useState("");
  const [modalOpen, setModalOpen] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);

  useEffect(() => {
    if (sessionStorage.getItem(WORKSPACE_REFRESH_FLAG) === "1") {
      sessionStorage.removeItem(WORKSPACE_REFRESH_FLAG);
      setRefreshKey((k) => k + 1);
    }
  }, []);

  return (
    <WorkspaceShell>
      <WorkspaceTopBar
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        onNewClient={() => setModalOpen(true)}
      />
      <main className="flex-1 overflow-y-auto">
        <WorkspaceHome
          searchQuery={searchQuery}
          onNewClient={() => setModalOpen(true)}
          modalOpen={modalOpen}
          onModalClose={() => setModalOpen(false)}
          refreshKey={refreshKey}
        />
      </main>
    </WorkspaceShell>
  );
}
