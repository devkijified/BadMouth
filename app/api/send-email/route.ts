import { Resend } from 'resend';
import { NextResponse } from 'next/server';

const resend = new Resend(process.env.RESEND_API_KEY || 're_3oGxrwrj_NBP4XcMc5fqQrhqPLUPjqkMo');

export async function POST(request: Request) {
  try {
    const { to, subject, html, from } = await request.json();

    const data = await resend.emails.send({
      from: from || 'BADMOUTH <onboarding@resend.dev>',
      to: [to],
      subject: subject,
      html: html,
    });

    return NextResponse.json({ success: true, data });
  } catch (error) {
    console.error('Email send error:', error);
    return NextResponse.json({ success: false, error }, { status: 500 });
  }
}
