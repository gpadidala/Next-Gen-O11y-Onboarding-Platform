import { useParams } from 'react-router-dom';

/**
 * OnboardingWizard - multi-step form for creating or editing
 * an observability onboarding request.
 *
 * Scaffold -- full step-by-step wizard implementation to follow.
 */
export default function OnboardingWizard() {
  const { id } = useParams<{ id: string }>();
  const isEditing = Boolean(id);

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">
            {isEditing ? 'Edit Onboarding Request' : 'New Onboarding Request'}
          </h1>
          <p className="page-subtitle">
            {isEditing
              ? `Editing request ${id}`
              : 'Configure observability for your service'}
          </p>
        </div>
      </div>

      {/* Wizard steps placeholder */}
      <div className="card">
        <p className="text-sm text-slate-500">
          Wizard steps will be implemented here: Service Info, Signal
          Selection, Configuration, Review &amp; Submit.
        </p>
      </div>
    </div>
  );
}
