import { Link, useParams } from 'react-router-dom';

export default function CheckoutFail() {
  const { shopSlug } = useParams();
  return (
    <div className="max-w-lg mx-auto py-20 px-4 text-center">
      <div className="text-6xl mb-6">❌</div>
      <h1 className="text-3xl font-bold text-gray-900 mb-4">Payment Failed</h1>
      <p className="text-gray-500 mb-8">Your payment could not be processed. Please try again.</p>
      <div className="flex items-center justify-center gap-4">
        <Link to={`/store/${shopSlug}/cart`} className="bg-indigo-600 text-white px-6 py-2.5 rounded-lg font-medium hover:bg-indigo-700 transition">
          Try Again
        </Link>
        <Link to={`/store/${shopSlug}`} className="border border-gray-300 text-gray-700 px-6 py-2.5 rounded-lg font-medium hover:bg-gray-50 transition">
          Back to Store
        </Link>
      </div>
    </div>
  );
}
