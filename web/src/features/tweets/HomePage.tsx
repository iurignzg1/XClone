import { ComposePanel } from './ComposePanel';
import { FeedPanel } from './FeedPanel';

export function HomePage() {
  return <FeedPanel top={<ComposePanel />} />;
}
