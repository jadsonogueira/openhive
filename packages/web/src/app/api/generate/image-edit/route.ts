import { NextRequest, NextResponse } from 'next/server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  const apiUrl = process.env.API_INTERNAL_URL || 'http://api:3001';

  try {
    const response = await fetch(`${apiUrl}/api/generate/image-edit`, {
      method: 'POST',
      headers: {
        'Authorization': request.headers.get('Authorization') || '',
        'Content-Type': request.headers.get('Content-Type') || '',
      },
      body: request.body,
      // @ts-ignore - duplex is needed for streaming
      duplex: 'half',
    });

    const data = await response.json();
    return NextResponse.json(data, { status: response.status });
  } catch (err: any) {
    return NextResponse.json(
      { success: false, error: err.message || 'Image edit proxy failed' },
      { status: 500 },
    );
  }
}
