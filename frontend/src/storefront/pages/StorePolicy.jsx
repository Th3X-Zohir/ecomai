import { useParams, Link } from 'react-router-dom';
import { useStore } from '../../contexts/StoreContext';
import { resolveTokens } from '../templates';

const policyMap = {
  about: { key: 'about_us', title: 'About Us' },
  return: { key: 'return_policy', title: 'Return & Refund Policy' },
  privacy: { key: 'privacy_policy', title: 'Privacy Policy' },
  terms: { key: 'terms', title: 'Terms of Service' },
};

/* Simple Markdown renderer — supports headings, bold, italic, lists, links, hr */
function SimpleMarkdown({ content, textColor, mutedColor }) {
  if (!content) return null;
  const lines = content.split('\n');
  const elements = [];
  let listItems = [];
  const flushList = () => {
    if (listItems.length > 0) {
      elements.push(<ul key={`ul-${elements.length}`} className="list-disc ml-6 space-y-1 mb-4">{listItems}</ul>);
      listItems = [];
    }
  };
  for (let i = 0; i < lines.length; i++) {
    let line = lines[i];
    // --- / hr
    if (/^[-*_]{3,}\s*$/.test(line)) { flushList(); elements.push(<hr key={i} className="my-6 border-current opacity-20" />); continue; }
    // Headings
    const hMatch = line.match(/^(#{1,4})\s+(.+)/);
    if (hMatch) {
      flushList();
      const level = hMatch[1].length;
      const text = inlineFormat(hMatch[2]);
      const Tag = level === 1 ? 'h2' : level === 2 ? 'h3' : level === 3 ? 'h4' : 'h5';
      const sizes = { h2: 'text-2xl', h3: 'text-xl', h4: 'text-lg', h5: 'text-base' };
      elements.push(<Tag key={i} className={`${sizes[Tag]} font-bold mt-6 mb-3`} style={{ color: textColor }}>{text}</Tag>);
      continue;
    }
    // List items
    const liMatch = line.match(/^[-*•]\s+(.+)/);
    if (liMatch) { listItems.push(<li key={i} className="text-sm leading-relaxed">{inlineFormat(liMatch[1])}</li>); continue; }
    // Numbered list
    const olMatch = line.match(/^\d+[.)]\s+(.+)/);
    if (olMatch) { listItems.push(<li key={i} className="text-sm leading-relaxed">{inlineFormat(olMatch[1])}</li>); continue; }
    // Empty line
    if (line.trim() === '') { flushList(); continue; }
    // Paragraph
    flushList();
    elements.push(<p key={i} className="text-sm leading-relaxed mb-3" style={{ color: mutedColor || textColor }}>{inlineFormat(line)}</p>);
  }
  flushList();
  return <>{elements}</>;
}

function inlineFormat(text) {
  // Bold
  text = text.replace(/\*\*(.+?)\*\*/g, '<b>$1</b>');
  // Italic
  text = text.replace(/\*(.+?)\*/g, '<i>$1</i>');
  // Links [text](url)
  text = text.replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" target="_blank" rel="noreferrer" class="underline">$1</a>');
  if (text.includes('<')) return <span dangerouslySetInnerHTML={{ __html: text }} />;
  return text;
}

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

      <div className="prose prose-sm max-w-none" style={{ color: t.text }}>
        <SimpleMarkdown content={content} textColor={t.text} mutedColor={t.textMuted} />
      </div>

      <div className="mt-12 pt-6 border-t" style={{ borderColor: t.border }}>
        <p className="text-xs" style={{ color: t.textMuted }}>
          Last updated by {shop?.name}. If you have any questions, please contact us.
        </p>
      </div>
    </div>
  );
}
