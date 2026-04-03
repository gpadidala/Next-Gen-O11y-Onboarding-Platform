import { Check } from 'lucide-react';
import { cn } from '@/utils/cn';

/* -------------------------------------------------------------------------- */
/*  Types                                                                     */
/* -------------------------------------------------------------------------- */

export interface StepItem {
  /** Unique identifier for the step */
  id: string;
  /** Display label */
  label: string;
}

export interface StepperProps {
  /** Array of steps (supports up to 9 steps for the onboarding flow) */
  steps: StepItem[];
  /** Zero-based index of the current active step */
  currentStep: number;
  /** Called when a completed step is clicked (optional navigation) */
  onStepClick?: (stepIndex: number) => void;
  /** Additional class names */
  className?: string;
}

type StepState = 'completed' | 'current' | 'upcoming';

/* -------------------------------------------------------------------------- */
/*  Component                                                                 */
/* -------------------------------------------------------------------------- */

function Stepper({ steps, currentStep, onStepClick, className }: StepperProps) {
  const getState = (index: number): StepState => {
    if (index < currentStep) return 'completed';
    if (index === currentStep) return 'current';
    return 'upcoming';
  };

  return (
    <nav
      aria-label="Onboarding progress"
      className={cn('w-full', className)}
    >
      <ol className="flex items-center">
        {steps.map((step, index) => {
          const state = getState(index);
          const isLast = index === steps.length - 1;
          const isClickable = state === 'completed' && onStepClick;

          return (
            <li
              key={step.id}
              className={cn('flex items-center', !isLast && 'flex-1')}
            >
              {/* Step circle + label */}
              <button
                type="button"
                disabled={!isClickable}
                onClick={() => isClickable && onStepClick(index)}
                className={cn(
                  'group flex flex-col items-center gap-1.5',
                  isClickable && 'cursor-pointer',
                  !isClickable && 'cursor-default',
                )}
                aria-current={state === 'current' ? 'step' : undefined}
                aria-label={`Step ${index + 1}: ${step.label}${
                  state === 'completed' ? ' (completed)' : state === 'current' ? ' (current)' : ''
                }`}
              >
                {/* Circle */}
                <span
                  className={cn(
                    'flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-xs font-semibold transition-colors duration-200',
                    state === 'completed' &&
                      'bg-brand-600 text-white group-hover:bg-brand-700',
                    state === 'current' &&
                      'border-2 border-brand-600 bg-brand-50 text-brand-700 ring-4 ring-brand-100',
                    state === 'upcoming' &&
                      'border-2 border-slate-300 bg-white text-slate-400',
                  )}
                >
                  {state === 'completed' ? (
                    <Check className="h-4 w-4" aria-hidden="true" />
                  ) : (
                    index + 1
                  )}
                </span>

                {/* Label */}
                <span
                  className={cn(
                    'hidden text-center text-2xs font-medium sm:block',
                    'max-w-[5rem] leading-tight',
                    state === 'completed' && 'text-brand-700',
                    state === 'current' && 'text-brand-700 font-semibold',
                    state === 'upcoming' && 'text-slate-400',
                  )}
                >
                  {step.label}
                </span>
              </button>

              {/* Connecting line */}
              {!isLast && (
                <div
                  className={cn(
                    'mx-2 h-0.5 flex-1 transition-colors duration-200',
                    index < currentStep ? 'bg-brand-600' : 'bg-slate-200',
                  )}
                  aria-hidden="true"
                />
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}

export { Stepper };
export default Stepper;
