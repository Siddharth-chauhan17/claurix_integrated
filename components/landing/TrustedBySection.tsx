const brokerages = [
  { name: "MARSH", subtitle: null },
  { name: "LOCKTON", subtitle: null },
  { name: "AON", subtitle: null },
  { name: "Willis", subtitle: "Towers Watson" },
  { name: "wtw", subtitle: null },
  { name: "HOWDEN", subtitle: null },
];

export function TrustedBySection() {
  return (
    <section className="bg-[#f7f8f9] pb-20 pt-10 sm:pb-24 sm:pt-12">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <p className="text-center text-base font-medium text-slate-500 sm:text-lg">
          Trusted by leading brokerage firms
        </p>
        <div className="mx-auto mt-10 flex max-w-6xl flex-wrap items-center justify-center gap-x-12 gap-y-8 sm:mt-12 sm:gap-x-16">
          {brokerages.map((firm) => (
            <div
              key={firm.name}
              className="flex min-w-[6.5rem] flex-col items-center text-center opacity-70 grayscale transition hover:opacity-100"
            >
              <span className="text-xl font-bold tracking-wide text-slate-700 sm:text-2xl">
                {firm.name}
              </span>
              {firm.subtitle ? (
                <span className="mt-1 text-[11px] font-medium uppercase tracking-widest text-slate-500 sm:text-xs">
                  {firm.subtitle}
                </span>
              ) : null}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
