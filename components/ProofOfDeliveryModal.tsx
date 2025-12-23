'use client';

import React, { useState, useRef } from 'react';
import { ProofOfDelivery as ProofOfDeliveryType } from '@/types';

interface ProofOfDeliveryModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (pod: ProofOfDeliveryType) => void;
  taskId: string;
  expectedOTP?: string;
}

export default function ProofOfDeliveryModal({
  isOpen,
  onClose,
  onSubmit,
  taskId,
  expectedOTP,
}: ProofOfDeliveryModalProps) {
  const [step, setStep] = useState<'otp' | 'photo' | 'signature' | 'complete'>('otp');
  const [otp, setOtp] = useState('');
  const [otpVerified, setOtpVerified] = useState(false);
  const [recipientName, setRecipientName] = useState('');
  const [photo, setPhoto] = useState<string | null>(null);
  const [signature, setSignature] = useState<string | null>(null);
  const [notes, setNotes] = useState('');
  const [isDrawing, setIsDrawing] = useState(false);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!isOpen) return null;

  const handleOTPVerify = () => {
    if (expectedOTP && otp === expectedOTP) {
      setOtpVerified(true);
      setStep('photo');
    } else if (!expectedOTP) {
      // If no OTP required, skip
      setOtpVerified(true);
      setStep('photo');
    } else {
      alert('Invalid OTP. Please try again.');
    }
  };

  const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setPhoto(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const startDrawing = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    setIsDrawing(true);
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    
    const rect = canvas.getBoundingClientRect();
    const x = 'touches' in e ? e.touches[0].clientX - rect.left : e.clientX - rect.left;
    const y = 'touches' in e ? e.touches[0].clientY - rect.top : e.clientY - rect.top;
    
    ctx.beginPath();
    ctx.moveTo(x, y);
  };

  const draw = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    if (!isDrawing) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    
    const rect = canvas.getBoundingClientRect();
    const x = 'touches' in e ? e.touches[0].clientX - rect.left : e.clientX - rect.left;
    const y = 'touches' in e ? e.touches[0].clientY - rect.top : e.clientY - rect.top;
    
    ctx.lineTo(x, y);
    ctx.strokeStyle = '#000';
    ctx.lineWidth = 2;
    ctx.stroke();
  };

  const stopDrawing = () => {
    setIsDrawing(false);
    if (canvasRef.current) {
      setSignature(canvasRef.current.toDataURL());
    }
  };

  const clearSignature = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    setSignature(null);
  };

  const handleComplete = () => {
    const pod: ProofOfDeliveryType = {
      otp: otpVerified ? otp : undefined,
      otpVerified,
      photoUrl: photo || undefined,
      signatureUrl: signature || undefined,
      deliveredAt: new Date().toISOString(),
      recipientName: recipientName || undefined,
      notes: notes || undefined,
    };
    onSubmit(pod);
    setStep('complete');
    setTimeout(() => onClose(), 2000);
  };

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-[100] p-4 animate-fade-in">
      <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full p-6 border-4 border-yellow-400 animate-bounce-in max-h-[90vh] overflow-y-auto">
        {step === 'complete' ? (
          <div className="text-center py-8">
            <div className="text-6xl mb-4 animate-pulse">✅</div>
            <h3 className="text-2xl font-bold text-gray-900 mb-2">Delivery Confirmed!</h3>
            <p className="text-gray-600">Proof of delivery submitted successfully</p>
          </div>
        ) : (
          <>
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-xl font-bold text-gray-800 flex items-center">
                <span className="text-2xl mr-2">📦</span>
                Proof of Delivery
              </h3>
              <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-2xl">
                ×
              </button>
            </div>

            {/* Progress Steps */}
            <div className="flex items-center justify-between mb-6">
              {['OTP', 'Photo', 'Signature'].map((label, idx) => {
                const stepNames: ('otp' | 'photo' | 'signature')[] = ['otp', 'photo', 'signature'];
                const currentIdx = stepNames.indexOf(step);
                const isActive = idx === currentIdx;
                const isComplete = idx < currentIdx;
                
                return (
                  <div key={label} className="flex-1 flex items-center">
                    <div
                      className={`w-8 h-8 rounded-full flex items-center justify-center font-bold ${
                        isComplete
                          ? 'bg-green-500 text-white'
                          : isActive
                          ? 'bg-yellow-400 text-black'
                          : 'bg-gray-200 text-gray-500'
                      }`}
                    >
                      {isComplete ? '✓' : idx + 1}
                    </div>
                    <span className="ml-2 text-xs font-semibold text-gray-700">{label}</span>
                    {idx < 2 && <div className="flex-1 h-0.5 bg-gray-300 mx-2"></div>}
                  </div>
                );
              })}
            </div>

            {/* OTP Step */}
            {step === 'otp' && (
              <div className="space-y-4">
                <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4 rounded">
                  <p className="text-sm text-gray-800">
                    <strong>🔐 Verification:</strong> Enter the OTP shared with the recipient
                  </p>
                </div>
                
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-2">Enter OTP</label>
                  <input
                    type="text"
                    value={otp}
                    onChange={(e) => setOtp(e.target.value)}
                    placeholder="Enter 4-6 digit OTP"
                    maxLength={6}
                    className="w-full border-2 border-gray-300 rounded-lg p-3 text-center text-2xl font-bold tracking-widest focus:outline-none focus:ring-2 focus:ring-yellow-400 focus:border-yellow-400"
                  />
                </div>

                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-2">Recipient Name (Optional)</label>
                  <input
                    type="text"
                    value={recipientName}
                    onChange={(e) => setRecipientName(e.target.value)}
                    placeholder="Who received the delivery?"
                    className="w-full border-2 border-gray-300 rounded-lg p-3 text-sm focus:outline-none focus:ring-2 focus:ring-yellow-400 focus:border-yellow-400"
                  />
                </div>

                <button
                  onClick={handleOTPVerify}
                  disabled={!otp}
                  className={`w-full py-3 rounded-lg font-bold transition-colors ${
                    otp
                      ? 'bg-yellow-400 hover:bg-yellow-500 text-black border-2 border-black'
                      : 'bg-gray-300 text-gray-500 cursor-not-allowed'
                  }`}
                >
                  Verify & Continue
                </button>
              </div>
            )}

            {/* Photo Step */}
            {step === 'photo' && (
              <div className="space-y-4">
                <div className="bg-blue-50 border-l-4 border-blue-400 p-4 rounded">
                  <p className="text-sm text-gray-800">
                    <strong>📸 Photo:</strong> Take a photo of the delivered package
                  </p>
                </div>

                {photo ? (
                  <div className="relative">
                    <img src={photo} alt="Delivery proof" className="w-full rounded-lg border-2 border-gray-300" />
                    <button
                      onClick={() => setPhoto(null)}
                      className="absolute top-2 right-2 bg-red-500 text-white px-3 py-1 rounded-lg text-sm font-bold"
                    >
                      Remove
                    </button>
                  </div>
                ) : (
                  <button
                    onClick={() => fileInputRef.current?.click()}
                    className="w-full border-2 border-dashed border-gray-300 rounded-lg p-8 text-center hover:border-yellow-400 transition-colors"
                  >
                    <div className="text-4xl mb-2">📷</div>
                    <p className="text-sm font-semibold text-gray-700">Click to upload photo</p>
                  </button>
                )}
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  capture="environment"
                  onChange={handlePhotoUpload}
                  className="hidden"
                />

                <div className="flex space-x-2">
                  <button
                    onClick={() => setStep('otp')}
                    className="flex-1 bg-gray-200 hover:bg-gray-300 text-black py-3 rounded-lg font-bold transition-colors"
                  >
                    Back
                  </button>
                  <button
                    onClick={() => setStep('signature')}
                    className="flex-1 bg-yellow-400 hover:bg-yellow-500 text-black py-3 rounded-lg font-bold transition-colors border-2 border-black"
                  >
                    {photo ? 'Continue' : 'Skip Photo'}
                  </button>
                </div>
              </div>
            )}

            {/* Signature Step */}
            {step === 'signature' && (
              <div className="space-y-4">
                <div className="bg-purple-50 border-l-4 border-purple-400 p-4 rounded">
                  <p className="text-sm text-gray-800">
                    <strong>✍️ Signature:</strong> Get recipient's signature
                  </p>
                </div>

                <div className="border-2 border-gray-300 rounded-lg bg-white">
                  <canvas
                    ref={canvasRef}
                    width={400}
                    height={200}
                    onMouseDown={startDrawing}
                    onMouseMove={draw}
                    onMouseUp={stopDrawing}
                    onMouseLeave={stopDrawing}
                    onTouchStart={startDrawing}
                    onTouchMove={draw}
                    onTouchEnd={stopDrawing}
                    className="w-full cursor-crosshair touch-none"
                  />
                </div>

                <button
                  onClick={clearSignature}
                  className="w-full bg-gray-200 hover:bg-gray-300 text-black py-2 rounded-lg font-bold transition-colors text-sm"
                >
                  Clear Signature
                </button>

                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-2">Additional Notes (Optional)</label>
                  <textarea
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    placeholder="Any special notes about the delivery..."
                    className="w-full border-2 border-gray-300 rounded-lg p-3 text-sm focus:outline-none focus:ring-2 focus:ring-yellow-400 focus:border-yellow-400"
                    rows={3}
                  />
                </div>

                <div className="flex space-x-2">
                  <button
                    onClick={() => setStep('photo')}
                    className="flex-1 bg-gray-200 hover:bg-gray-300 text-black py-3 rounded-lg font-bold transition-colors"
                  >
                    Back
                  </button>
                  <button
                    onClick={handleComplete}
                    className="flex-1 bg-green-500 hover:bg-green-600 text-white py-3 rounded-lg font-bold transition-colors shadow-md"
                  >
                    ✓ Complete Delivery
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
