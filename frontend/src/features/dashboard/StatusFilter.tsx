import { Select } from '@/components/ui/Select';
import type { OnboardingStatus } from '@/types/onboarding';

/* -------------------------------------------------------------------------- */
/*  Types                                                                     */
/* -------------------------------------------------------------------------- */

export interface StatusFilterProps {
  /** Currently selected status filter (empty string = "All"). */
  value: OnboardingStatus | '';
  /** Called when the filter selection changes. */
  onChange: (status: OnboardingStatus | '') => void;
}

/* -------------------------------------------------------------------------- */
/*  Status options                                                            */
/* -------------------------------------------------------------------------- */

const STATUS_OPTIONS = [
  { value: '', label: 'All Statuses' },
  { value: 'DRAFT', label: 'Draft' },
  { value: 'IN_REVIEW', label: 'In Review' },
  { value: 'APPROVED', label: 'Approved' },
  { value: 'PROVISIONING', label: 'Provisioning' },
  { value: 'COMPLETED', label: 'Completed' },
  { value: 'REJECTED', label: 'Rejected' },
  { value: 'CANCELLED', label: 'Cancelled' },
];

/* -------------------------------------------------------------------------- */
/*  Component                                                                 */
/* -------------------------------------------------------------------------- */

export default function StatusFilter({ value, onChange }: StatusFilterProps) {
  return (
    <div className="w-48">
      <Select
        options={STATUS_OPTIONS}
        value={value}
        onChange={(e) => onChange(e.target.value as OnboardingStatus | '')}
        label="Filter by Status"
      />
    </div>
  );
}
