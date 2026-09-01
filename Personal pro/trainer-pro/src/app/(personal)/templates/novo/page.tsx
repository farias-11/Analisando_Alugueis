import { TopBar } from "@/components/nav/top-bar";
import { NovoTemplateForm } from "./novo-template-form";

export default function NovoTemplatePage() {
  return (
    <div>
      <TopBar title="Novo template" back="/templates" />
      <div className="p-4 md:max-w-md md:p-0">
        <NovoTemplateForm />
      </div>
    </div>
  );
}
