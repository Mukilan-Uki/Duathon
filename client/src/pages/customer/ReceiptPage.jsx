import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import Alert from '../../components/common/Alert';
import { transactionService } from '../../services/transactionService';
import { getApiError } from '../../utils/apiError';
import { formatMinorUnits } from '../../utils/money';

export default function ReceiptPage() {
  const { transactionId } = useParams();
  const [receipt, setReceipt] = useState(null);
  const [apiError, setApiError] = useState('');
  useEffect(() => {
    transactionService
      .receipt(transactionId)
      .then(({ data }) => setReceipt(data.receipt))
      .catch((error) => setApiError(getApiError(error)));
  }, [transactionId]);
  if (apiError) return <div className="mx-auto max-w-3xl p-8"><Alert>{apiError}</Alert></div>;
  if (!receipt) return <div className="p-12 text-center">Generating receipt…</div>;

  return (
    <div className="mx-auto max-w-2xl px-5 py-10 print:p-0">
      <section className="rounded-2xl border border-slate-300 bg-white p-8 print:border-0">
        <div className="border-b border-slate-200 pb-6 text-center">
          <h1 className="text-2xl font-bold">{receipt.bank}</h1>
          <p className="mt-2 text-sm text-slate-500">Transaction receipt</p>
        </div>
        <p className="my-8 text-center text-3xl font-bold">{formatMinorUnits(receipt.amount, receipt.currency)}</p>
        <dl className="space-y-4">
          {[
            ['Reference', receipt.reference],
            ['Date', new Date(receipt.date).toLocaleString()],
            ['Direction', receipt.direction],
            ['Sender account', receipt.senderAccount],
            ['Receiver account', receipt.receiverAccount],
            ['Description', receipt.description || '—'],
            ['Status', receipt.status],
          ].map(([label, value]) => (
            <div className="flex justify-between gap-6 border-b border-slate-100 pb-3" key={label}>
              <dt className="text-sm text-slate-500">{label}</dt>
              <dd className="break-all text-right text-sm font-medium capitalize">{value}</dd>
            </div>
          ))}
        </dl>
        <p className="mt-8 text-center text-xs text-slate-500">This computer-generated receipt does not require a signature.</p>
      </section>
      <button className="mx-auto mt-6 block rounded-lg bg-bank-700 px-5 py-2.5 font-semibold text-white print:hidden" onClick={() => window.print()}>
        Print or save as PDF
      </button>
    </div>
  );
}
