import { useParams, Link } from 'react-router-dom';
import { useStore } from '../../contexts/StoreContext';
import { resolveTokens } from '../templates';

const policyMap = {
  about: { key: 'about_us', title: 'About Us' },
  return: { key: 'return_policy', title: 'Return & Refund Policy' },
  privacy: { key: 'privacy_policy', title: 'Privacy Policy' },
  terms: { key: 'terms', title: 'Terms of Service' },
};

export default function StorePolicy() {
  const { type } = useParams();
  const { shop, shopSlug, theme, tokens, storePolicies } = useStore();
  const t = resolveTokens(theme, tokens);

  const policy = policyMap[type];
  const content = policy ? storePolicies[policy.key] : null;

  if (!policy || !content) {
    return (
      <div className="max-w-3xl mx-auto px-4 py-16 text-center">
        <h1 className="text-2xl font-bold mb-4" style={{ color: t.text }}>Page Not Found</h1>
        <p className="mb-6" style={{ color: t.textMuted }}>This policy page doesn't exist or hasn't been set up yet.</p>
        <Link
          to={`/store/${shopSlug}`}
          className="inline-block px-6 py-2.5 text-sm font-medium transition hover:opacity-80"
          style={{ backgroundColor: t.primary, color: t.bg, borderRadius: t.buttonRadius }}
        >
          Back to Home
        </Link>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      <nav className="text-sm mb-8" style={{ color: t.textMuted }}>
        <Link to={`/store/${shopSlug}`} className="hover:opacity-70">Home</Link>
        <span className="mx-2">/</span>
        <span>{policy.title}</span>
      </nav>

      <h1 className="text-3xl font-bold mb-8" style={{ color: t.text }}>
        {policy.title}
      </h1>

      <div
        className="prose prose-sm max-w-none space-y-4 whitespace-pre-wrap leading-relaxed"
        style={{ color: t.text }}
      >
        {content}
      </div>

      <div className="mt-12 pt-6 border-t" style={{ borderColor: t.border }}>
        <p className="text-xs" style={{ color: t.textMuted }}>
          Last updated by {shop?.name}. If you have any questions, please contact us.
        </p>
      </div>
    </div>
  );
}
