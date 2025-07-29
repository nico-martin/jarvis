import React, { useEffect } from 'react';
import { onMcpAuthorization } from '@ai/mcp/auth/callback';

export default function OAuthCallbackPage() {
  useEffect(() => {
    // Handle the OAuth callback when component mounts
    onMcpAuthorization().catch((error) => {
      console.error('OAuth callback error:', error);
    });
  }, []);

  return (
    <div style={{ fontFamily: 'sans-serif', padding: '20px', textAlign: 'center' }}>
      <h1>Processing Authentication...</h1>
      <p>Please wait while we complete your authentication.</p>
      <p>This window will close automatically.</p>
    </div>
  );
}