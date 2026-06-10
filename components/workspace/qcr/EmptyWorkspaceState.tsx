"use client";

import Link from "next/link";
import { projectWorkstationPath } from "@/lib/projectWorkstation";

export function EmptyWorkspaceState({ projectId }: { projectId: string }) {
  return (
    <div className="flex h-screen flex-col items-center justify-center bg-[#f4f5f7] p-8 text-center">
      <div className="max-w-md rounded-2xl border border-slate-200 bg-white p-8 shadow-sm">
        <h1 className="text-xl font-semibold text-slate-900">No workspace yet</h1>
        <p className="mt-2 text-sm text-slate-600">
          Generate a QCR from the workstation after mapping policy sections to your
          RFQ rows. The structured workspace will open here.
        </p>
        <Link
          href={projectWorkstationPath(projectId)}
          className="mt-6 inline-flex rounded-lg bg-primary-600 px-4 py-2 text-sm font-semibold text-white hover:bg-primary-700"
        >
          Go to workstation
        </Link>
      </div>
    </div>
  );
}
