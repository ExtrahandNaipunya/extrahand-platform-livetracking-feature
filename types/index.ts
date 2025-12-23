export type TaskStatus = 'PENDING' | 'PICKED_UP' | 'ON_THE_WAY' | 'ARRIVING' | 'COMPLETED' | 'CANCELLED';

export interface Location {
  lat: number;
  lng: number;
  address?: string;
}

export interface DriverInfo {
  id: string;
  name: string;
  phone: string;
  vehicleNumber?: string;
  rating?: number;
}

export interface TaskLocation {
  taskId: string;
  driverId: string;
  lat: number;
  lng: number;
  speed: number;
  timestamp: number;
  status: TaskStatus;
  eta?: string;
  driver?: DriverInfo;
  direction?: number; // Bearing in degrees
  currentStreet?: string;
  remainingDistance?: number; // in kilometers
  estimatedArrivalTime?: string;
  traffic?: 'light' | 'moderate' | 'heavy';
}

export interface TrackingData {
  taskId: string;
  pickup: Location;
  destination: Location;
  currentLocation: Location;
  status: TaskStatus;
  eta: string;
  driver: DriverInfo;
  route?: Array<{ lat: number; lng: number }>;
  distance?: number;
  duration?: number;
  customer?: { name: string; phone: string };
  item?: string;
  speed?: number;
  direction?: number;
  currentStreet?: string;
  remainingDistance?: number;
  estimatedArrivalTime?: string;
  traffic?: 'light' | 'moderate' | 'heavy';
  lastUpdateTime?: number;
  deliveryInstructions?: DeliveryInstructions;
  proofOfDelivery?: ProofOfDelivery;
  deliveryOTP?: string; // OTP for delivery verification
  waypoints?: Array<{
    lat: number;
    lng: number;
    address?: string;
    name?: string;
    order: number;
    type: 'pickup' | 'stop' | 'destination';
    completed?: boolean;
  }>;
}

export interface DriverUpdatePayload {
  taskId: string;
  driverId: string;
  lat: number;
  lng: number;
  speed: number;
  timestamp: number;
}

export interface WebSocketMessage {
  type: 'location_update' | 'status_update' | 'eta_update' | 'error';
  data: TaskLocation;
}

export interface ETAResult {
  eta: string;
  distance: number;
  duration: number;
}

export interface DeliveryInstructions {
  type: 'ring_bell' | 'leave_at_door' | 'call_on_arrival' | 'meet_outside' | 'custom';
  notes?: string;
  gateCode?: string;
  buildingAccess?: string;
  parkingInstructions?: string;
  contactPreference?: 'call' | 'message' | 'none';
}

export interface ProofOfDelivery {
  otp?: string;
  otpVerified?: boolean;
  photoUrl?: string;
  signatureUrl?: string;
  deliveredAt?: string;
  deliveredBy?: string;
  recipientName?: string;
  failureReason?: string;
  notes?: string;
}

export interface OrderHistory {
  taskId: string;
  pickup: Location;
  destination: Location;
  status: TaskStatus;
  createdAt: string;
  completedAt?: string;
  driver?: DriverInfo;
  item?: string;
  customer: { name: string; phone: string };
  totalDistance?: number;
  totalDuration?: number;
  proofOfDelivery?: ProofOfDelivery;
  rating?: number;
  review?: string;
}

export type AddressLabel = 'HOME' | 'WORK' | 'OTHER';

export interface SavedAddress {
  id: string;
  userId: string;
  label: AddressLabel;
  fullAddress: string;
  houseNumber: string;
  landmark?: string;
  cityId: string;
  cityName: string;
  pincode: string;
  latitude: number;
  longitude: number;
  isDefault: boolean;
  createdAt: string;
  updatedAt?: string;
}
