import type { Metadata } from 'next'
import './globals.css'
import { Toaster } from 'react-hot-toast'

export const metadata: Metadata = {
  title: 'BADMOUTH - Movie & Music Recommendation',
  description: 'AI-powered recommendations based on your mood',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body className="bg-gray-900 text-white">
        {children}
        <Toaster position="bottom-right" />
      </body>
    </html>
  )
}
