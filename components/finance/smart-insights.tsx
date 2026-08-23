'use client';

import { financeUi } from '@/components/finance/ui';
import type { AiInsightResult } from '@/lib/finance/ai-insights';
import type { DeterministicInsight } from '@/lib/finance/insights';

export function SmartInsights({
  insights,
  onGenerate,
  isGenerating = false,
  aiResult = null,
  aiError = null,
  copy,
}: {
  insights: DeterministicInsight[];
  onGenerate?: () => void;
  isGenerating?: boolean;
  aiResult?: AiInsightResult | null;
  aiError?: string | null;
  copy: {
    title: string;
    subtitle: string;
    empty: string;
    generate: string;
    generating: string;
    aiGenerated: string;
    retry: string;
  };
}) {
  const tone = {
    positive: 'border-emerald-200 bg-emerald-50 dark:border-emerald-900/60 dark:bg-emerald-950/20',
    info: 'border-cyan-200 bg-cyan-50 dark:border-cyan-900/60 dark:bg-cyan-950/20',
    warning: 'border-amber-200 bg-amber-50 dark:border-amber-900/60 dark:bg-amber-950/20',
  } as const;

  return (
    <article className={`${financeUi.formCard} min-w-0`}>
      <header className='mb-3'>
        <h2 className={financeUi.sectionTitle}>{copy.title}</h2>
        <p className='mt-1 text-sm text-slate-500 dark:text-slate-400'>{copy.subtitle}</p>
      </header>
      <div className='space-y-2'>
        {insights.length > 0 ? (
          insights.map((insight) => (
            <div key={insight.id} className={`rounded-xl border p-3 ${tone[insight.severity]}`}>
              <div className='flex items-start gap-2'>
                <span aria-hidden='true'>{insight.severity === 'warning' ? '!' : insight.severity === 'positive' ? '✓' : 'i'}</span>
                <div>
                  <h3 className='text-sm font-semibold text-slate-900 dark:text-slate-100'>{insight.title}</h3>
                  <p className='mt-1 text-sm text-slate-600 dark:text-slate-300'>{insight.description}</p>
                  {insight.action ? <p className='mt-1 text-xs font-medium text-slate-700 dark:text-slate-200'>{insight.action}</p> : null}
                </div>
              </div>
            </div>
          ))
        ) : (
          <div className={financeUi.emptyState}>{copy.empty}</div>
        )}
      </div>

      {aiResult ? (
        <div className='mt-3 rounded-xl border border-violet-200 bg-violet-50 p-3 dark:border-violet-900/60 dark:bg-violet-950/20'>
          <p className='text-xs font-semibold uppercase tracking-wide text-violet-700 dark:text-violet-300'>{copy.aiGenerated}</p>
          <p className='mt-2 text-sm text-slate-700 dark:text-slate-200'>{aiResult.summary}</p>
          <div className='mt-3 space-y-2'>
            {aiResult.observations.map((observation) => (
              <div key={`${observation.title}-${observation.action}`} className='rounded-lg bg-white/70 p-2 dark:bg-slate-900/30'>
                <h3 className='text-sm font-semibold text-slate-900 dark:text-slate-100'>{observation.title}</h3>
                <p className='mt-1 text-sm text-slate-600 dark:text-slate-300'>{observation.explanation}</p>
                <p className='mt-1 text-xs font-medium text-violet-700 dark:text-violet-300'>{observation.action}</p>
              </div>
            ))}
          </div>
        </div>
      ) : null}
      {aiError ? <p className='mt-3 text-sm text-rose-600 dark:text-rose-400'>{aiError}</p> : null}
      <button
        type='button'
        className={`${financeUi.secondaryButton} mt-3 w-full`}
        disabled={!onGenerate || isGenerating}
        onClick={onGenerate}
      >
        {isGenerating ? copy.generating : aiError ? copy.retry : copy.generate}
      </button>
    </article>
  );
}
