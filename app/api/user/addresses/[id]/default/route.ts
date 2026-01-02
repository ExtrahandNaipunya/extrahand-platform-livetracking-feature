import { NextRequest, NextResponse } from 'next/server';
import { getDatabase } from '@/lib/database';
import { SavedAddress } from '@/types';

// PUT /api/user/addresses/[id]/default - Set as default address
export async function PUT(
  request: NextRequest,
  props: { params: Promise<{ id: string }> }
) {
  try {
    const params = await props.params;
    const userId = request.headers.get('x-user-id') || 'demo-user';
    const { id } = params;

    const db = await getDatabase();
    const addressesCollection = db.collection<SavedAddress>('addresses');

    // Check if address exists and belongs to user
    const existing = await addressesCollection.findOne({ id, userId });
    if (!existing) {
      return NextResponse.json(
        { success: false, error: 'Address not found' },
        { status: 404 }
      );
    }

    // Unset all other defaults
    await addressesCollection.updateMany(
      { userId, isDefault: true },
      { $set: { isDefault: false } }
    );

    // Set this as default
    const updated = await addressesCollection.findOneAndUpdate(
      { id, userId },
      {
        $set: {
          isDefault: true,
          updatedAt: new Date().toISOString(),
        },
      },
      { returnDocument: 'after' }
    );

    if (!updated) {
      return NextResponse.json(
        { success: false, error: 'Failed to update default address' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      address: updated,
      message: 'Default address updated successfully',
    });
  } catch (error: any) {
    console.error('Error setting default address:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to update default address' },
      { status: 500 }
    );
  }
}
