'use client';

import React, { useState, useEffect } from 'react';
import { AddressLabel, SavedAddress } from '@/types';
import { validatePincode } from '@/lib/addressValidation';

interface AddressFormProps {
  initialAddress?: Partial<SavedAddress>;
  onSubmit: (address: Partial<SavedAddress>) => void;
  onCancel?: () => void;
  submitLabel?: string;
}

export default function AddressForm({
  initialAddress,
  onSubmit,
  onCancel,
  submitLabel = 'Save Address',
}: AddressFormProps) {
  const [formData, setFormData] = useState({
    label: (initialAddress?.label || 'HOME') as AddressLabel,
    fullAddress: initialAddress?.fullAddress || '',
    houseNumber: initialAddress?.houseNumber || '',
    landmark: initialAddress?.landmark || '',
    pincode: initialAddress?.pincode || '',
    isDefault: initialAddress?.isDefault || false,
  });

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [pincodeValid, setPincodeValid] = useState(true);

  // Validate pincode on change
  useEffect(() => {
    if (formData.pincode) {
      const validation = validatePincode(formData.pincode);
      setPincodeValid(validation.valid);
      if (!validation.valid) {
        setErrors((prev) => ({ ...prev, pincode: validation.error || 'Invalid pincode' }));
      } else {
        setErrors((prev) => {
          const { pincode, ...rest } = prev;
          return rest;
        });
      }
    }
  }, [formData.pincode]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    // Validation
    const newErrors: Record<string, string> = {};

    if (!formData.fullAddress || formData.fullAddress.length < 10) {
      newErrors.fullAddress = 'Address must be at least 10 characters';
    }
    if (!formData.houseNumber) {
      newErrors.houseNumber = 'House/Flat number is required';
    }
    if (!formData.pincode) {
      newErrors.pincode = 'Pincode is required';
    } else if (!pincodeValid) {
      newErrors.pincode = 'Invalid pincode format';
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    onSubmit(formData);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {/* Address Label */}
      <div>
        <label className="block text-sm font-semibold text-gray-700 mb-2">
          Address Type *
        </label>
        <div className="flex space-x-3">
          {(['HOME', 'WORK', 'OTHER'] as AddressLabel[]).map((label) => (
            <button
              key={label}
              type="button"
              onClick={() => setFormData({ ...formData, label })}
              className={`flex-1 py-3 rounded-lg font-bold transition-all border-2 ${
                formData.label === label
                  ? 'bg-yellow-400 border-black text-black'
                  : 'bg-white border-gray-300 text-gray-700 hover:border-yellow-400'
              }`}
            >
              {label === 'HOME' && '🏠 '}
              {label === 'WORK' && '💼 '}
              {label === 'OTHER' && '📍 '}
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* House Number */}
      <div>
        <label className="block text-sm font-semibold text-gray-700 mb-2">
          House/Flat/Building Number *
        </label>
        <input
          type="text"
          value={formData.houseNumber}
          onChange={(e) => setFormData({ ...formData, houseNumber: e.target.value })}
          placeholder="e.g., Flat 301, Building A"
          className={`w-full px-4 py-3 border-2 rounded-lg focus:ring-2 focus:ring-yellow-400 ${
            errors.houseNumber ? 'border-red-400' : 'border-yellow-400/30'
          }`}
        />
        {errors.houseNumber && (
          <p className="text-red-600 text-sm mt-1">{errors.houseNumber}</p>
        )}
      </div>

      {/* Full Address */}
      <div>
        <label className="block text-sm font-semibold text-gray-700 mb-2">
          Complete Address *
        </label>
        <textarea
          value={formData.fullAddress}
          onChange={(e) => setFormData({ ...formData, fullAddress: e.target.value })}
          placeholder="Street, Area, Locality"
          rows={3}
          className={`w-full px-4 py-3 border-2 rounded-lg focus:ring-2 focus:ring-yellow-400 ${
            errors.fullAddress ? 'border-red-400' : 'border-yellow-400/30'
          }`}
        />
        {errors.fullAddress && (
          <p className="text-red-600 text-sm mt-1">{errors.fullAddress}</p>
        )}
      </div>

      {/* Landmark */}
      <div>
        <label className="block text-sm font-semibold text-gray-700 mb-2">
          Landmark (Optional)
        </label>
        <input
          type="text"
          value={formData.landmark}
          onChange={(e) => setFormData({ ...formData, landmark: e.target.value })}
          placeholder="e.g., Near Metro Station, Behind Mall"
          className="w-full px-4 py-3 border-2 border-yellow-400/30 rounded-lg focus:ring-2 focus:ring-yellow-400"
        />
      </div>

      {/* Pincode */}
      <div>
        <label className="block text-sm font-semibold text-gray-700 mb-2">
          Pincode *
        </label>
        <input
          type="text"
          value={formData.pincode}
          onChange={(e) => {
            const value = e.target.value.replace(/\D/g, '').slice(0, 6);
            setFormData({ ...formData, pincode: value });
          }}
          placeholder="e.g., 500032"
          maxLength={6}
          className={`w-full px-4 py-3 border-2 rounded-lg focus:ring-2 focus:ring-yellow-400 ${
            errors.pincode ? 'border-red-400' : 'border-yellow-400/30'
          }`}
        />
        {errors.pincode && (
          <p className="text-red-600 text-sm mt-1">{errors.pincode}</p>
        )}
        {pincodeValid && formData.pincode.length === 6 && (
          <p className="text-green-600 text-sm mt-1 flex items-center">
            <span className="mr-1">✓</span>
            Valid pincode
          </p>
        )}
      </div>

      {/* Set as Default */}
      <div className="bg-yellow-50 border-2 border-yellow-400 rounded-lg p-4">
        <label className="flex items-center cursor-pointer">
          <input
            type="checkbox"
            checked={formData.isDefault}
            onChange={(e) => setFormData({ ...formData, isDefault: e.target.checked })}
            className="w-5 h-5 text-yellow-400 border-2 border-yellow-400 rounded focus:ring-yellow-400"
          />
          <span className="ml-3 text-sm font-semibold text-gray-700">
            Set as default address
          </span>
        </label>
        {formData.isDefault && (
          <p className="text-xs text-gray-600 mt-2 ml-8">
            This address will be auto-selected for future orders
          </p>
        )}
      </div>

      {/* Action Buttons */}
      <div className="flex space-x-3 pt-4">
        {onCancel && (
          <button
            type="button"
            onClick={onCancel}
            className="flex-1 bg-gray-200 hover:bg-gray-300 text-gray-800 py-3 rounded-lg font-bold transition-colors"
          >
            Cancel
          </button>
        )}
        <button
          type="submit"
          className="flex-1 bg-yellow-400 hover:bg-yellow-500 text-black py-3 rounded-lg font-bold transition-colors border-2 border-black shadow-md"
        >
          {submitLabel}
        </button>
      </div>
    </form>
  );
}
