const projects = [
  {
    name: "Marina Towers",
    location: "New York",
    qcrs: 8,
    progress: 75,
    status: "On Track" as const,
  },
  {
    name: "Green Mall",
    location: "Chicago",
    qcrs: 5,
    progress: 50,
    status: "On Track" as const,
  },
  {
    name: "Tech Park",
    location: "San Francisco",
    qcrs: 2,
    progress: 25,
    status: "Overdue" as const,
  },
  {
    name: "City Plaza",
    location: "Los Angeles",
    qcrs: 6,
    progress: 100,
    status: "On Track" as const,
  },
  {
    name: "Riverside",
    location: "Boston",
    qcrs: 3,
    progress: 66,
    status: "On Track" as const,
  },
];

export function HeroDashboardMockup() {
  return (
    <div className="relative w-full max-w-2xl xl:max-w-3xl">
      <div
        className="pointer-events-none absolute -right-6 top-6 h-80 w-80 rounded-full border border-dashed border-slate-200"
        aria-hidden
      />
      <div
        className="pointer-events-none absolute -left-4 bottom-4 h-32 w-32 rounded-full bg-primary-100/40 blur-2xl"
        aria-hidden
      />

      {/* Outer frame */}
      <div className="relative rounded-[1.75rem] border border-slate-200/90 bg-gradient-to-br from-white via-slate-50/80 to-white p-3 shadow-[0_8px_30px_rgba(15,23,42,0.06)] sm:p-4">
        {/* Inner card */}
        <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-[0_20px_50px_-12px_rgba(15,23,42,0.14)] ring-1 ring-slate-100">
          <div className="border-b border-slate-100 bg-slate-50/80 px-6 py-4 sm:px-7">
            <h3 className="text-lg font-bold text-slate-900">Projects</h3>
            <div className="mt-3 flex flex-wrap gap-x-6 gap-y-2 text-sm">
              <Stat label="Total QCRs" value="24" />
              <Stat label="Active" value="18" valueClass="text-primary-600" />
              <Stat label="Escalated" value="6" />
              <Stat label="Overdue" value="3" valueClass="text-red-500" />
            </div>
          </div>

          <div className="px-4 py-4 sm:px-6 sm:py-5">
            <div className="overflow-x-auto rounded-xl border border-slate-100 bg-white">
              <table className="w-full min-w-[420px] text-left text-xs sm:text-sm">
                <thead>
                  <tr className="border-b border-slate-100 bg-slate-50/60 text-slate-500">
                    <th className="px-4 py-3 font-medium">Project Name</th>
                    <th className="px-3 py-3 font-medium">Location</th>
                    <th className="px-3 py-3 font-medium">QCRs</th>
                    <th className="px-3 py-3 font-medium">Progress</th>
                    <th className="px-4 py-3 font-medium">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {projects.map((project) => (
                    <tr
                      key={project.name}
                      className="border-b border-slate-50 last:border-0"
                    >
                      <td className="px-4 py-3 font-medium text-slate-800">
                        {project.name}
                      </td>
                      <td className="px-3 py-3 text-slate-600">{project.location}</td>
                      <td className="px-3 py-3 text-slate-600">{project.qcrs}</td>
                      <td className="px-3 py-3">
                        <div className="flex items-center gap-2">
                          <div className="h-1.5 w-16 overflow-hidden rounded-full bg-slate-100">
                            <div
                              className="h-full rounded-full bg-primary-500"
                              style={{ width: `${project.progress}%` }}
                            />
                          </div>
                          <span className="text-slate-600">{project.progress}%</span>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className={
                            project.status === "Overdue"
                              ? "font-medium text-red-500"
                              : "font-medium text-primary-600"
                          }
                        >
                          {project.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <button
              type="button"
              className="mt-5 w-full rounded-xl border-2 border-primary-500 bg-white px-4 py-3 text-sm font-semibold text-primary-600 transition hover:bg-primary-50"
            >
              View All Projects
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function Stat({
  label,
  value,
  valueClass = "text-slate-900",
}: {
  label: string;
  value: string;
  valueClass?: string;
}) {
  return (
    <div>
      <span className="text-slate-500">{label}: </span>
      <span className={`font-semibold ${valueClass}`}>{value}</span>
    </div>
  );
}
