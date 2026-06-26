import { NextResponse } from 'next/server'

// List of common disposable email domains (fallback if API fails)
const FALLBACK_DOMAINS = [
  'mailinator.com', 'guerrillamail.com', '10minutemail.com', 
  'tempmail.com', 'yopmail.com', 'throwawayemail.com',
  'spamgourmet.com', 'trashmail.com', 'maildrop.cc'
]

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const email = searchParams.get('email')
  
  if (!email) {
    return NextResponse.json({ error: 'Email required' }, { status: 400 })
  }

  const domain = email.split('@')[1].toLowerCase()
  
  try {
    // Try to fetch from a disposable email API
    const response = await fetch(
      `https://api.block-disposable-email.com/v1/check?email=${email}`,
      { headers: { 'Accept': 'application/json' } }
    )
    
    if (response.ok) {
      const data = await response.json()
      return NextResponse.json({ 
        disposable: data.disposable || false,
        domain: domain
      })
    }
    
    // If API fails, use fallback list
    const isDisposable = FALLBACK_DOMAINS.includes(domain)
    return NextResponse.json({ 
      disposable: isDisposable,
      domain: domain,
      source: 'fallback'
    })
    
  } catch (error) {
    // If everything fails, use fallback list
    const isDisposable = FALLBACK_DOMAINS.includes(domain)
    return NextResponse.json({ 
      disposable: isDisposable,
      domain: domain,
      source: 'fallback'
    })
  }
}
