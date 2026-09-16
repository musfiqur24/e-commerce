import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'
export const revalidate = 0

export async function GET() {
  const publicApiKey =
    process.env.NEXT_PUBLIC_EWAY_PUBLIC_API_KEY || process.env.EWAY_PUBLIC_API_KEY || ''

  return NextResponse.json(
    { publicApiKey },
    {
      headers: {
        'Cache-Control': 'no-store',
      },
    }
  )
}
