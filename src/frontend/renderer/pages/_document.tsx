import { Html, Head, Main, NextScript } from 'next/document';

export default function Document() {
  return (
    <Html lang="en">
      <Head>
        {/* Content Security Policy - Allows localhost for development */}
        <meta
          httpEquiv="Content-Security-Policy"
          content="
            default-src 'self' http://localhost:* ws://localhost:* wss://localhost:*;
            script-src 'self' 'unsafe-inline' 'unsafe-eval' http://localhost:*;
            style-src 'self' 'unsafe-inline' http://localhost:*;
            img-src 'self' data: blob: http://localhost:* https:;
            font-src 'self' data: http://localhost:*;
            connect-src 'self' http://localhost:* ws://localhost:* wss://localhost:* https:;
            media-src 'self' blob: mediastream: http://localhost:*;
            worker-src 'self' blob:;
            child-src 'self' blob:;
            frame-ancestors 'none';
          "
        />
        {/* Additional security headers */}
        <meta httpEquiv="X-Content-Type-Options" content="nosniff" />
        <meta httpEquiv="X-Frame-Options" content="DENY" />
        <meta httpEquiv="X-XSS-Protection" content="1; mode=block" />
        <meta name="referrer" content="strict-origin-when-cross-origin" />
      </Head>
      <body>
        <Main />
        <NextScript />
      </body>
    </Html>
  );
}

