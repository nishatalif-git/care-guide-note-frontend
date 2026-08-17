import { Suspense } from 'react';
import { PostsClient } from '../../components/PostsClient';

// useSearchParams needs a Suspense boundary during prerender in Next 15.
export default function PostsPage() {
  return (
    <Suspense fallback={<p className="muted">Loading…</p>}>
      <PostsClient />
    </Suspense>
  );
}
