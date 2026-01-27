import { NextRequest, NextResponse } from 'next/server';
import { getRoute, generateFallbackRoute } from '@/lib/routing';

/**
 * Server-side route fetching endpoint
 * Fetches route from Google Directions API without exposing API key to client
 * Supports optional waypoint for routing through pickup location
 */
export async function GET(
  request: NextRequest,
  props: { params: Promise<{ taskId: string }> }
) {
  try {
    const params = await props.params;
    const { searchParams } = new URL(request.url);
    const pickupLat = parseFloat(searchParams.get('pickupLat') || '0');
    const pickupLng = parseFloat(searchParams.get('pickupLng') || '0');
    const destLat = parseFloat(searchParams.get('destLat') || '0');
    const destLng = parseFloat(searchParams.get('destLng') || '0');

    // Optional waypoint for routing through pickup
    const viaLat = searchParams.get('viaLat') ? parseFloat(searchParams.get('viaLat')!) : null;
    const viaLng = searchParams.get('viaLng') ? parseFloat(searchParams.get('viaLng')!) : null;

    if (!pickupLat || !pickupLng || !destLat || !destLng) {
      return NextResponse.json(
        { error: 'Invalid coordinates' },
        { status: 400 }
      );
    }

    // If waypoint provided, route through it
    const waypoint = (viaLat && viaLng) ? { lat: viaLat, lng: viaLng } : undefined;

    const route = await getRoute(
      { lat: pickupLat, lng: pickupLng },
      { lat: destLat, lng: destLng },
      waypoint
    );

    // If Google API fails, use fallback straight-line route
    if (!route) {
      console.log('Google Directions API failed, using fallback route');

      let fallbackRoute: Array<{ lat: number; lng: number }>;

      if (waypoint) {
        // Fallback with waypoint: create two segments
        const routeToWaypoint = generateFallbackRoute(
          { lat: pickupLat, lng: pickupLng },
          waypoint,
          10
        );
        const routeToDestination = generateFallbackRoute(
          waypoint,
          { lat: destLat, lng: destLng },
          10
        );
        fallbackRoute = [...routeToWaypoint, ...routeToDestination];
      } else {
        // Fallback direct route
        fallbackRoute = generateFallbackRoute(
          { lat: pickupLat, lng: pickupLng },
          { lat: destLat, lng: destLng },
          20 // More points for smoother line
        );
      }
      return NextResponse.json({
        route: fallbackRoute,
        distance: null,
        duration: null
      });
    }

    return NextResponse.json({
      route: route.path,
      distance: route.distance,
      duration: route.duration
    });
  } catch (error) {
    console.error('Error fetching route:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
