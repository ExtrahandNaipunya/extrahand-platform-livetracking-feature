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
