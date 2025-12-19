import { NextRequest, NextResponse } from 'next/server';
import { getRoute, generateFallbackRoute } from '@/lib/routing';

/**
 * Server-side route fetching endpoint
 * Fetches route from Google Directions API without exposing API key to client
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { taskId: string } }
) {
  try {
    const { searchParams } = new URL(request.url);
    const pickupLat = parseFloat(searchParams.get('pickupLat') || '0');
    const pickupLng = parseFloat(searchParams.get('pickupLng') || '0');
    const destLat = parseFloat(searchParams.get('destLat') || '0');
    const destLng = parseFloat(searchParams.get('destLng') || '0');

    if (!pickupLat || !pickupLng || !destLat || !destLng) {
      return NextResponse.json(
        { error: 'Invalid coordinates' },
        { status: 400 }
      );
    }

    const route = await getRoute(
      { lat: pickupLat, lng: pickupLng },
      { lat: destLat, lng: destLng }
    );

    // If Google API fails, use fallback straight-line route
    if (!route) {
      console.log('Google Directions API failed, using fallback route');
      const fallbackRoute = generateFallbackRoute(
        { lat: pickupLat, lng: pickupLng },
        { lat: destLat, lng: destLng },
        20 // More points for smoother line
      );
      return NextResponse.json({ route: fallbackRoute });
    }

    return NextResponse.json({ route });
  } catch (error) {
    console.error('Error fetching route:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
