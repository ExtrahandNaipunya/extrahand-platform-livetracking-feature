'use client';

import React, { useState } from 'react';
import { DeliveryInstructions as DeliveryInstructionsType } from '@/types';

interface DeliveryInstructionsProps {
  instructions?: DeliveryInstructionsType;
  onSave: (instructions: DeliveryInstructionsType) => void;
  onClose?: () => void;
}

export default function DeliveryInstructions({ instructions, onSave, onClose }: DeliveryInstructionsProps) {
  const [selectedType, setSelectedType] = useState<DeliveryInstructionsType['type']>(
    instructions?.type || 'ring_bell'
  );
  const [notes, setNotes] = useState(instructions?.notes || '');
  const [gateCode, setGateCode] = useState(instructions?.gateCode || '');
  const [buildingAccess, setBuildingAccess] = useState(instructions?.buildingAccess || '');
  const [parkingInstructions, setParkingInstructions] = useState(instructions?.parkingInstructions || '');
  const [contactPreference, setContactPreference] = useState<'call' | 'message' | 'none'>(
    instructions?.contactPreference || 'call'
  );

  const deliveryTypes = [
    { value: 'ring_bell', label: 'Ring Doorbell', icon: '🔔' },
    { value: 'leave_at_door', label: 'Leave at Door', icon: '🚪' },
    { value: 'call_on_arrival', label: 'Call on Arrival', icon: '📞' },
    { value: 'meet_outside', label: 'Meet Outside', icon: '🚶' },
    { value: 'custom', label: 'Custom', icon: '✏️' },
  ];

  const handleSave = () => {
    const newInstructions: DeliveryInstructionsType = {
      type: selectedType,
      notes: notes.trim() || undefined,
      gateCode: gateCode.trim() || undefined,
      buildingAccess: buildingAccess.trim() || undefined,
      parkingInstructions: parkingInstructions.trim() || undefined,
      contactPreference,
    };
    onSave(newInstructions);
  };

  return (
    <div className="bg-white rounded-xl shadow-lg border-2 border-yellow-400 p-5">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-bold text-gray-900 flex items-center">
          <span className="text-2xl mr-2">📋</span>
          Delivery Instructions
        </h3>
        {onClose && (
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-xl">
            ×
          </button>
        )}
      </div>

      {/* Quick Options */}
      <div className="mb-4">
        <label className="block text-sm font-bold text-gray-700 mb-2">How should we deliver?</label>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
          {deliveryTypes.map((type) => (
            <button
              key={type.value}
              onClick={() => setSelectedType(type.value as DeliveryInstructionsType['type'])}
              className={`p-3 rounded-lg border-2 transition-all text-sm font-semibold ${
                selectedType === type.value
                  ? 'border-yellow-400 bg-yellow-50 text-black'
                  : 'border-gray-200 bg-white text-gray-700 hover:border-yellow-300'
              }`}
            >
              <div className="text-xl mb-1">{type.icon}</div>
              {type.label}
            </button>
          ))}
        </div>
      </div>

      {/* Additional Notes */}
      <div className="mb-4">
        <label className="block text-sm font-bold text-gray-700 mb-2">Special Instructions</label>
        <textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="e.g., Fragile items, handle with care..."
          className="w-full border-2 border-gray-300 rounded-lg p-3 text-sm focus:outline-none focus:ring-2 focus:ring-yellow-400 focus:border-yellow-400"
          rows={3}
        />
      </div>

      {/* Access Details */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-4">
        <div>
          <label className="block text-xs font-bold text-gray-700 mb-1">Gate Code (Optional)</label>
          <input
            type="text"
            value={gateCode}
            onChange={(e) => setGateCode(e.target.value)}
            placeholder="#1234"
            className="w-full border-2 border-gray-300 rounded-lg p-2 text-sm focus:outline-none focus:ring-2 focus:ring-yellow-400 focus:border-yellow-400"
          />
        </div>
        <div>
          <label className="block text-xs font-bold text-gray-700 mb-1">Building Access</label>
          <input
            type="text"
            value={buildingAccess}
            onChange={(e) => setBuildingAccess(e.target.value)}
            placeholder="Floor 3, Apt 5B"
            className="w-full border-2 border-gray-300 rounded-lg p-2 text-sm focus:outline-none focus:ring-2 focus:ring-yellow-400 focus:border-yellow-400"
          />
        </div>
      </div>

      {/* Parking */}
      <div className="mb-4">
        <label className="block text-sm font-bold text-gray-700 mb-2">Parking Instructions</label>
        <input
          type="text"
          value={parkingInstructions}
          onChange={(e) => setParkingInstructions(e.target.value)}
          placeholder="Visitor parking on left side..."
          className="w-full border-2 border-gray-300 rounded-lg p-2 text-sm focus:outline-none focus:ring-2 focus:ring-yellow-400 focus:border-yellow-400"
        />
      </div>

      {/* Contact Preference */}
      <div className="mb-5">
        <label className="block text-sm font-bold text-gray-700 mb-2">Contact Preference</label>
        <div className="flex space-x-2">
          {[
            { value: 'call', label: 'Call Me', icon: '📞' },
            { value: 'message', label: 'Message Only', icon: '💬' },
            { value: 'none', label: 'No Contact', icon: '🔇' },
          ].map((pref) => (
            <button
              key={pref.value}
              onClick={() => setContactPreference(pref.value as 'call' | 'message' | 'none')}
              className={`flex-1 p-2 rounded-lg border-2 transition-all text-xs font-semibold ${
                contactPreference === pref.value
                  ? 'border-yellow-400 bg-yellow-50 text-black'
                  : 'border-gray-200 bg-white text-gray-700 hover:border-yellow-300'
              }`}
            >
              <div className="text-lg">{pref.icon}</div>
              {pref.label}
            </button>
          ))}
        </div>
      </div>

      {/* Save Button */}
      <button
        onClick={handleSave}
        className="w-full bg-yellow-400 hover:bg-yellow-500 text-black py-3 rounded-lg font-bold transition-colors border-2 border-black shadow-md"
      >
        Save Instructions
      </button>
    </div>
  );
}
