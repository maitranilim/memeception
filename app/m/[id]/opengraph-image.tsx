import { ImageResponse } from 'next/og';
import { fetchMemeById } from '@/lib/reddit';

export const alt = 'Meme shared from Memeception';
export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';

const BACKGROUND = '#09090b';
const SURFACE = '#18181b';
const FOREGROUND = '#fafafa';
const MUTED = '#a1a1aa';
const ACCENT = '#3b82f6';

function Wordmark() {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
      <div
        style={{
          width: 20,
          height: 20,
          borderRadius: 6,
          background: ACCENT,
          display: 'flex',
        }}
      />
      <div style={{ fontSize: 26, color: MUTED, letterSpacing: -0.4 }}>
        Memeception
      </div>
    </div>
  );
}

/**
 * Generated per-meme so a shared link unfurls with the actual image in
 * Slack, iMessage, Discord and X rather than a generic site card.
 */
export default async function Image({
  params,
}: {
  // Next does not type-check metadata image routes, and `params` is a promise
  // here just as it is in a page. Reading it synchronously yields undefined.
  params: Promise<{ id: string }>;
}): Promise<ImageResponse> {
  const { id } = await params;
  const meme = await fetchMemeById(id).catch(() => null);

  if (!meme) {
    return new ImageResponse(
      (
        <div
          style={{
            width: '100%',
            height: '100%',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 20,
            background: BACKGROUND,
            color: FOREGROUND,
          }}
        >
          <div style={{ fontSize: 48, letterSpacing: -1 }}>Memeception</div>
          <div style={{ fontSize: 26, color: MUTED }}>
            This meme is no longer available
          </div>
        </div>
      ),
      size,
    );
  }

  const title =
    meme.title.length > 90 ? `${meme.title.slice(0, 90)}…` : meme.title;

  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          background: BACKGROUND,
          padding: 40,
          gap: 40,
        }}
      >
        <div
          style={{
            display: 'flex',
            width: 520,
            height: 550,
            borderRadius: 12,
            background: SURFACE,
            alignItems: 'center',
            justifyContent: 'center',
            overflow: 'hidden',
          }}
        >
          <img
            src={meme.url}
            alt=""
            width={520}
            height={550}
            style={{ objectFit: 'contain', width: 520, height: 550 }}
          />
        </div>

        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between',
            flex: 1,
            height: 550,
          }}
        >
          <Wordmark />
          <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
            <div
              style={{
                fontSize: 44,
                lineHeight: 1.15,
                color: FOREGROUND,
                letterSpacing: -1,
              }}
            >
              {title}
            </div>
            <div style={{ display: 'flex', fontSize: 24, color: MUTED }}>
              r/{meme.subreddit}
            </div>
          </div>
          <div style={{ display: 'flex', fontSize: 22, color: MUTED }}>
            {meme.ups.toLocaleString()} upvotes
          </div>
        </div>
      </div>
    ),
    size,
  );
}
