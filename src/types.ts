// Types for Dover Bin Collection Calendar Service

export interface Address {
  uprn: string;
  address: string;
}

export interface CollectionService {
  serviceId: string;
  taskId: string;
  serviceName: string;
  schedule: string;  // e.g., "Tuesday fortnightly", "Every Tuesday"
  lastCollection: Date | null;
  nextCollection: Date;
}

export interface Subscription {
  id: string;
  uprn: string;
  address: string;
  postcode: string;
  calendarToken: string;
  createdAt: Date;
  lastFetched: Date | null;
}

export interface Collection {
  id: number;
  uprn: string;
  serviceName: string;
  schedule: string;
  nextCollection: Date;
  fetchedAt: Date;
}

export interface CollectionOverride {
  id: number;
  uprn: string;
  serviceName: string;
  originalDate: Date;
  actualDate: Date;
  detectedAt: Date;
}

export interface CalendarEvent {
  date: Date;
  isOverride: boolean;
}

// API Response types
export interface LookupResponse {
  addresses: Address[];
}

export interface SubscribeRequest {
  uprn: string;
  address: string;
  postcode: string;
}

export interface SubscribeResponse {
  calendarUrl: string;
  token: string;
}

export interface DoverLookupResponse {
  status: 'OK' | 'FAIL' | 'REDIRECT';
  result?: string;
  message?: string;
  replace?: string;
}
