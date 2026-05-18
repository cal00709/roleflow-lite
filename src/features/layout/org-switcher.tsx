import { useOrganisation } from "@/features/organisations/organisation-context";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export function OrgSwitcher({ compact = false }: { compact?: boolean }) {
  const { memberships, activeOrgId, selectOrg } = useOrganisation();

  if (memberships.length === 0) return null;

  return (
    <Select value={activeOrgId ?? undefined} onValueChange={selectOrg}>
      <SelectTrigger className={compact ? "h-8 w-[140px] text-xs" : "w-full"}>
        <SelectValue placeholder="Organisation" />
      </SelectTrigger>
      <SelectContent>
        {memberships.map((m) => (
          <SelectItem key={m.organisation_id} value={m.organisation_id}>
            <span className="truncate">{m.organisation.name}</span>
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
