import { RequestDemoForm } from "@/components/request-demo/RequestDemoForm";
import { RequestDemoLayout } from "@/components/request-demo/RequestDemoLayout";
import { RequestDemoMarketing } from "@/components/request-demo/RequestDemoMarketing";

export default function RequestDemoPage() {
  return (
    <RequestDemoLayout>
      <div className="grid grid-cols-1 items-start gap-12 lg:grid-cols-[minmax(0,1fr)_minmax(0,34rem)] lg:gap-16 xl:gap-20">
        <RequestDemoMarketing />
        <div className="flex justify-center lg:justify-end">
          <RequestDemoForm />
        </div>
      </div>
    </RequestDemoLayout>
  );
}
