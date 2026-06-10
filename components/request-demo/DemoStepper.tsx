const steps = [
  { number: 1, label: "Your Details" },
  { number: 2, label: "Workflow Qualification" },
  { number: 3, label: "Schedule Demo" },
];

interface DemoStepperProps {
  currentStep: number;
}

export function DemoStepper({ currentStep }: DemoStepperProps) {
  return (
    <div className="mb-8">
      <div className="flex items-center">
        {steps.map((step, index) => {
          const isActive = step.number === currentStep;
          const isComplete = step.number < currentStep;
          const isLast = index === steps.length - 1;

          return (
            <div key={step.number} className={`flex items-center ${isLast ? "" : "flex-1"}`}>
              <div className="flex min-w-[4.5rem] flex-col items-center sm:min-w-[5.5rem]">
                <span
                  className={`flex h-9 w-9 items-center justify-center rounded-full text-sm font-semibold transition-colors ${
                    isActive || isComplete
                      ? "bg-primary-600 text-white"
                      : "border-2 border-slate-200 bg-white text-slate-400"
                  }`}
                >
                  {step.number}
                </span>
                <span
                  className={`mt-2 text-center text-[11px] font-medium leading-tight sm:text-xs ${
                    isActive || isComplete ? "text-slate-800" : "text-slate-400"
                  }`}
                >
                  {step.label}
                </span>
              </div>
              {!isLast ? (
                <div
                  className={`mx-2 mb-5 h-0.5 flex-1 sm:mx-3 ${
                    isComplete ? "bg-primary-600" : "bg-slate-200"
                  }`}
                />
              ) : null}
            </div>
          );
        })}
      </div>
    </div>
  );
}
