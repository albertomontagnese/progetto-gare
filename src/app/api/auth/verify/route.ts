import { NextResponse } from 'next/server';
import { verifyMagicLink, getUser, getPendingInvitationsForEmail } from '@/lib/auth-db';
import { createSessionToken, setSessionCookie } from '@/lib/session';

export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const token = url.searchParams.get('token');

    if (!token) {
      return NextResponse.redirect(new URL('/login?error=missing_token', request.url));
    }

    const email = await verifyMagicLink(token);
    if (!email) {
      return NextResponse.redirect(new URL('/login?error=invalid_token', request.url));
    }

    // Check if user exists
    const user = await getUser(email);
    if (user) {
      // Existing user - create session and redirect to app
      const sessionToken = await createSessionToken(user);
      await setSessionCookie(sessionToken);
      return NextResponse.redirect(new URL('/', request.url));
    }

    // New user - check if they have a pending invitation
    const invitations = await getPendingInvitationsForEmail(email);
    if (invitations.length > 0) {
      // Redirect to signup with invitation context
      return NextResponse.redirect(
        new URL(`/signup?email=${encodeURIComponent(email)}&invitation=${invitations[0].id}`, request.url)
      );
    }

    // New user, no invitation - redirect to signup as new company
    return NextResponse.redirect(
      new URL(`/signup?email=${encodeURIComponent(email)}`, request.url)
    );
  } catch (error) {
    console.error('Verify error:', error);
    return NextResponse.redirect(new URL('/login?error=server_error', request.url));
  }
}
