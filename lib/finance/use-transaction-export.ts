import { exportTableToPDF, generateFilename } from '@/lib/finance/pdf-export';
import { format } from 'date-fns';
import { useCallback } from 'react';

export interface TransactionExportOptions {
  transactions: Array<{
    id: string;
    account_id: string;
    category_id: string;
    type: 'income' | 'expense';
    amount: number;
    description: string | null;
    transaction_date: string;
  }>;
  accounts: Map<string, { id: string; name: string; currency: string }>;
  categories: Map<string, { id: string; name: string; type: 'income' | 'expense'; color: string | null }>;
  locale: string;
  formatMoney: (amount: number, currency: string) => string;
  t: (key: string) => string;
}

export function useTransactionExport() {
  const exportTransactionsToPDF = useCallback(async (options: TransactionExportOptions) => {
    const { transactions, accounts, categories, locale, formatMoney, t } = options;

    // Create a temporary container for the table
    const container = document.createElement('div');
    container.style.position = 'absolute';
    container.style.left = '-9999px';
    container.style.width = '100%';
    container.style.background = 'white';

    try {
      // Build HTML table
      const tableHTML = `
          <div style="padding: 20px; font-family: Arial, sans-serif; color: #0f172a;">
            <h1 style="margin: 0 0 10px 0; font-size: 24px; color: #0f172a;">
              ${t('transactions.exportTitle')}
            </h1>
            <p style="margin: 0 0 20px 0; color: #64748b; font-size: 12px;">
              ${t('transactions.exportSubtitle')}
            </p>
            <table style="width: 100%; border-collapse: collapse; font-size: 11px;">
              <thead>
                <tr style="background: #f1f5f9; border-bottom: 2px solid #cbd5e1;">
                  <th style="padding: 8px; text-align: left; font-weight: 600; color: #0f172a;">${t('transactions.date')}</th>
                  <th style="padding: 8px; text-align: left; font-weight: 600; color: #0f172a;">${t('transactions.account')}</th>
                  <th style="padding: 8px; text-align: left; font-weight: 600; color: #0f172a;">${t('transactions.category')}</th>
                  <th style="padding: 8px; text-align: left; font-weight: 600; color: #0f172a;">${t('transactions.description')}</th>
                  <th style="padding: 8px; text-align: right; font-weight: 600; color: #0f172a;">${t('transactions.amount')}</th>
                  <th style="padding: 8px; text-align: center; font-weight: 600; color: #0f172a;">${t('transactions.type')}</th>
                </tr>
              </thead>
              <tbody>
                ${transactions
                  .map(
                    (tx) => `
                  <tr style="border-bottom: 1px solid #e2e8f0;">
                    <td style="padding: 8px; color: #0f172a;">
                      ${format(new Date(tx.transaction_date), 'MMM dd, yyyy', { locale: locale === 'es' ? require('date-fns/locale/es') : undefined })}
                    </td>
                    <td style="padding: 8px; color: #0f172a;">
                      ${accounts.get(tx.account_id)?.name || '-'}
                    </td>
                    <td style="padding: 8px; color: #0f172a;">
                      ${categories.get(tx.category_id)?.name || '-'}
                    </td>
                    <td style="padding: 8px; color: #0f172a;">
                      ${tx.description || '-'}
                    </td>
                    <td style="padding: 8px; text-align: right; color: ${tx.type === 'income' ? '#059669' : '#dc2626'}; font-weight: 500;">
                      ${formatMoney(tx.amount, accounts.get(tx.account_id)?.currency || 'USD')}
                    </td>
                    <td style="padding: 8px; text-align: center; color: #64748b;">
                      <span style="display: inline-block; padding: 2px 6px; border-radius: 4px; background: ${tx.type === 'income' ? '#d1fae5' : '#fee2e2'}; color: ${tx.type === 'income' ? '#065f46' : '#991b1b'}; font-size: 10px; font-weight: 500;">
                        ${tx.type === 'income' ? t('transactions.income') : t('transactions.expense')}
                      </span>
                    </td>
                  </tr>
                `,
                  )
                  .join('')}
              </tbody>
            </table>
            <div style="margin-top: 20px; padding-top: 20px; border-top: 1px solid #e2e8f0; font-size: 10px; color: #64748b;">
              <p style="margin: 0;">
                <strong>${t('transactions.total')}:</strong> ${transactions.reduce((sum, tx) => sum + tx.amount, 0)} ${accounts.get(transactions[0]?.account_id)?.currency || 'USD'}
              </p>
            </div>
          </div>
        `;

      container.innerHTML = tableHTML;
      document.body.appendChild(container);

      const element = container.firstElementChild as HTMLElement;
      await exportTableToPDF(element, {
        filename: generateFilename('transactions'),
        title: t('transactions.exportTitle'),
        orientation: transactions.length > 50 ? 'landscape' : 'portrait',
        includeFooter: true,
      });
    } catch (error) {
      console.error('Failed to export transactions:', error);
      throw error;
    } finally {
      document.body.removeChild(container);
    }
  }, []);

  return { exportTransactionsToPDF };
}
