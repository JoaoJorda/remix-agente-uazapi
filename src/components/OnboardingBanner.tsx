import React from 'react';
import { Rocket, CheckCircle, Circle, AlertCircle, ArrowRight } from 'lucide-react';
import { Button } from '@/components/Button';
import { useOnboardingStatus } from '@/hooks/useOnboardingStatus';

interface OnboardingBannerProps {
  onOpenWizard: () => void;
}

export const OnboardingBanner: React.FC<OnboardingBannerProps> = ({ onOpenWizard }) => {
  const { loading, isComplete, steps, completionPercentage, isAdmin } = useOnboardingStatus();

  // Only show onboarding banner for admins
  if (loading || isComplete || !isAdmin) return null;

  return (
    <div className="relative overflow-hidden rounded-2xl border border-primary/20 bg-gradient-to-r from-primary/10 via-card to-primary/5 p-6 mb-8">
      {/* Background Glow */}
      <div className="absolute -top-20 -right-20 w-40 h-40 bg-primary/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute -bottom-20 -left-20 w-40 h-40 bg-primary/10 rounded-full blur-3xl pointer-events-none" />

      <div className="relative z-10">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="flex-1">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 rounded-xl bg-primary/20 border border-primary/30 flex items-center justify-center">
                <Rocket className="w-5 h-5 text-primary" />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-foreground">Complete a configuração do sistema</h3>
                <p className="text-sm text-muted-foreground">Configure sua empresa para começar a usar o sistema</p>
              </div>
            </div>

            {/* Progress Bar */}
            <div className="mb-4">
              <div className="flex items-center justify-between text-xs text-muted-foreground mb-2">
                <span>Progresso</span>
                <span className="text-primary font-medium">{completionPercentage}% concluído</span>
              </div>
              <div className="h-2 bg-secondary rounded-full overflow-hidden">
                <div 
                  className="h-full bg-gradient-to-r from-primary to-primary/80 rounded-full transition-all duration-500"
                  style={{ width: `${completionPercentage}%` }}
                />
              </div>
            </div>

            {/* Steps Summary */}
            <div className="flex flex-wrap gap-3">
              {steps.map((step) => (
                <div
                  key={step.id}
                  className={`flex items-center gap-1.5 text-xs px-2 py-1 rounded-full ${
                    step.isComplete
                      ? 'bg-emerald-500/10 text-emerald-600 border border-emerald-500/20'
                      : step.isRequired
                      ? 'bg-amber-500/10 text-amber-600 border border-amber-500/20'
                      : 'bg-muted text-muted-foreground border border-border'
                  }`}
                >
                  {step.isComplete ? (
                    <CheckCircle className="w-3 h-3" />
                  ) : step.isRequired ? (
                    <AlertCircle className="w-3 h-3" />
                  ) : (
                    <Circle className="w-3 h-3" />
                  )}
                  {step.title}
                </div>
              ))}
            </div>
          </div>

          <div className="flex-shrink-0">
            <Button
              variant="primary"
              onClick={onOpenWizard}
              className="gap-2 whitespace-nowrap"
            >
              Continuar Configuração
              <ArrowRight className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};
