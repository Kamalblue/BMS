
export interface BatteryDataPoint {
  time: string;
  temperature: number;
  ambientTemp: number;
  twinBaseline: number; // Digital Twin predicted healthy temperature
  voltage: number;
  voltageTwin: number;
  soc: number;
}

export interface Vehicle {
  id: string;
  name: string;
  status: 'Critical' | 'Warning' | 'Healthy';
  currentTemp: number;
  lastMonthAvgTemp: number;
  soh: number; // State of Health
  lastUpdate: string;
  projectedLoss: number; // Monthly financial loss due to degradation
  costOfInaction: number; // Financial delta if not fixed
  anomalyProbability: number; // ML forecast probability
  soakTestStatus: 'Pending' | 'Success' | 'Fail-Calibration' | 'Not Run';
  chargeCapActive: boolean;
  routeAssigned: boolean;
  guardrailsActive: boolean;
  recommendedRoute: string;
  certificationId: string;
}

export type UserRole = 'manager' | 'technician';
export type WorkflowStage = 'detect' | 'triage' | 'mitigate';

export interface TestResult {
  component: string;
  status: 'Pass' | 'Fail' | 'Degraded';
  details: string;
}
