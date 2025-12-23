import { NextRequest, NextResponse } from 'next/server';
import { getDatabase } from '@/lib/database';
import { savedAddressSchema } from '@/lib/addressValidation';
import { SavedAddress } from '@/types';

// PUT /api/user/addresses/[id] - Update address
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const userId = request.headers.get('x-user-id') || 'demo-user';
    const { id } = params;
    const body = await request.json();

    // Validate input
    const validatedData = savedAddressSchema.parse(body);

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

    // If marking as default, unset other defaults
    if (body.isDefault) {
      await addressesCollection.updateMany(
        { userId, isDefault: true, id: { $ne: id } },
        { $set: { isDefault: false } }
      );
    }

    const updated = await addressesCollection.findOneAndUpdate(
      { id, userId },
      {
        $set: {
          ...validatedData,
          isDefault: body.isDefault || false,
          updatedAt: new Date().toISOString(),
        },
      },
      { returnDocument: 'after' }
    );

    if (!updated) {
      return NextResponse.json(
        { success: false, error: 'Failed to update address' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      address: updated,
      message: 'Address updated successfully',
    });
  } catch (error: any) {
    console.error('Error updating address:', error);
    
    if (error.name === 'ZodError') {
      return NextResponse.json(
        { success: false, error: 'Invalid address data', details: error.errors },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { success: false, error: 'Failed to update address' },
      { status: 500 }
    );
  }
}

// DELETE /api/user/addresses/[id] - Delete address
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
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

    await addressesCollection.deleteOne({ id, userId });

    return NextResponse.json({
      success: true,
      message: 'Address deleted successfully',
    });
  } catch (error: any) {
    console.error('Error deleting address:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to delete address' },
      { status: 500 }
    );
  }
}
