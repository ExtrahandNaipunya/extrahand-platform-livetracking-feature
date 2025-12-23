import { NextRequest, NextResponse } from 'next/server';
import { getDatabase } from '@/lib/database';
import { savedAddressSchema } from '@/lib/addressValidation';
import { SavedAddress } from '@/types';

// GET /api/user/addresses - List all addresses
export async function GET(request: NextRequest) {
  try {
    // In production, get userId from session/JWT
    const userId = request.headers.get('x-user-id') || 'demo-user';

    const db = await getDatabase();
    const addresses = await db
      .collection<SavedAddress>('addresses')
      .find({ userId })
      .sort({ isDefault: -1, createdAt: -1 })
      .toArray();

    return NextResponse.json({
      success: true,
      addresses: addresses.map((addr) => ({
        ...addr,
        id: addr.id || addr._id?.toString(),
      })),
    });
  } catch (error: any) {
    console.error('Error fetching addresses:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch addresses' },
      { status: 500 }
    );
  }
}

// POST /api/user/addresses - Create new address
export async function POST(request: NextRequest) {
  try {
    const userId = request.headers.get('x-user-id') || 'demo-user';
    const body = await request.json();

    // Validate input
    const validatedData = savedAddressSchema.parse(body);

    const db = await getDatabase();
    const addressesCollection = db.collection<SavedAddress>('addresses');

    // If this is marked as default, unset other defaults
    if (body.isDefault) {
      await addressesCollection.updateMany(
        { userId, isDefault: true },
        { $set: { isDefault: false } }
      );
    }

    const newAddress: SavedAddress = {
      id: `addr_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      userId,
      ...validatedData,
      isDefault: body.isDefault || false,
      createdAt: new Date().toISOString(),
    };

    await addressesCollection.insertOne(newAddress as any);

    return NextResponse.json({
      success: true,
      address: newAddress,
      message: 'Address saved successfully',
    });
  } catch (error: any) {
    console.error('Error creating address:', error);
    
    if (error.name === 'ZodError') {
      return NextResponse.json(
        { success: false, error: 'Invalid address data', details: error.errors },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { success: false, error: 'Failed to save address' },
      { status: 500 }
    );
  }
}
