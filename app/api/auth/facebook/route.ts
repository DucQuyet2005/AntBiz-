import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  const appId = process.env.FB_APP_ID || '';
  const redirectUri = process.env.FB_REDIRECT_URI || `${request.nextUrl.origin}/api/auth/facebook/callback`;
  const state = request.nextUrl.searchParams.get('state') || 'facebook';
  
  // Các quyền của Facebook Page và Instagram Business
  const scope = [
    'pages_show_list',
    'pages_read_engagement',
    'pages_manage_posts',
    'instagram_basic',
    'instagram_content_publish',
    'public_profile'
  ].join(',');

  const authUrl = `https://www.facebook.com/v19.0/dialog/oauth?client_id=${appId}&redirect_uri=${encodeURIComponent(redirectUri)}&scope=${scope}&response_type=code&state=${state}`;
  return NextResponse.redirect(authUrl);
}
