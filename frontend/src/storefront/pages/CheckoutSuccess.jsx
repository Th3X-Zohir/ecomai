import { Link, useParams, useSearchParams } from 'react-router-dom';

export default function CheckoutSuccess() {
  const { shopSlug } = useParams();
  const [searchParams] = useSearchParams();
  const tranId = searchParams.get('tran_id');

  return (
    <div className="max-w-lg mx-auto py-20 px-4 text-center">
      <div className="text-6xl mb-6">✅</div>
      <h1 className="text-3xl font-bold text-gray-900 mb-4">Payment Successful!</h1>
      <p className="text-gray-500 mb-2">Your order has been confirmed and is being processed.</p>
      {tranId && <p className="text-sm text-gray-400 mb-8">Transaction ID: {tranId}</p>}
      <div className="flex items-center justify-center gap-4">
        <Link to={`/store/${shopSlug}/account`} className="bg-indigo-600 text-white px-6 py-2.5 rounded-lg font-medium hover:bg-indigo-700 transition">
          View My Orders
        </Link>
        <Link to={`/store/${shopSlug}/products`} className="border border-gray-300 text-gray-700 px-6 py-2.5 rounded-lg font-medium hover:bg-gray-50 transition">
          Continue Shopping
        </Link>
      </div>
    </div>
  );
}
