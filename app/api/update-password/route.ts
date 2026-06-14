import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'

export async function POST(request: Request) {
  try {
    const { token, newPassword } = await request.json()

    if (!token || !newPassword) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    if (newPassword.length < 6) {
      return NextResponse.json({ error: 'Password must be at least 6 characters' }, { status: 400 })
    }

    const supabaseAdmin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false
        }
      }
    )

    const { data: profile, error: findError } = await supabaseAdmin
      .from('profiles')
      .select('id, reset_expires')
      .eq('reset_token', token)
      .single()

    if (findError || !profile) {
      return NextResponse.json({ error: 'Invalid or expired reset link' }, { status: 400 })
    }

    const expiresUTC = new Date(profile.reset_expires)
    const nowUTC = new Date()
    
    if (expiresUTC < nowUTC) {
      return NextResponse.json({ error: 'Reset link has expired' }, { status: 400 })
    }

    const { error: updateError } = await supabaseAdmin.auth.admin.updateUserById(
      profile.id,
      { password: newPassword }
    )

    if (updateError) {
      console.error('Update error:', updateError)
      return NextResponse.json({ error: updateError.message }, { status: 500 })
    }

    await supabaseAdmin
      .from('profiles')
      .update({ reset_token: null, reset_expires: null })
      .eq('id', profile.id)

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('API error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
