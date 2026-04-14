export interface SectionA {
  country: string;
  companyName: string;
  plantLocation: string;
}

export interface FillPacSection {
  units: number | null;
  oeeUnits: number | null;
  services: string[];
}

export interface BucketElevatorSection {
  units: number | null;
  conditionMonitoringUnits: number | null;
  type: string;
  installationDate: string;
  workingEfficiently: string;
  beltSlippage: string;
  maintenanceCost: string;
  services: string[];
}

export interface SectionC {
  products: string[];
  fillPac: FillPacSection;
  bucketElevator: BucketElevatorSection;
}

export interface SectionB {
  name: string;
  designation: string;
  contact: string;
  email: string;
}

export interface FillPacFeedback {
  spouts?: string;
  installationDate?: string;
  oeeAccurate?: string;
  perfAccurate?: string;
  qualAccurate?: string;
  availAccurate?: string;
  bagsMatch?: string;
  dataFreq?: string;
  bottlenecks?: string;
  usefulMetric?: string;
  missingFeatures?: string;
  faultInfo?: string;
  bagInfo?: string;
  userFriendly?: string;
  visualizations?: string;
  comments?: string;
}

export interface BucketElevatorFeedback {
  understanding?: string;
  effectiveness?: string;
  trainingSatisfaction?: string;
  userFriendly?: string;
  usageFreq?: string;
  reducedBreakdowns?: string;
  supportRating?: string;
  suggestions?: string;
}

export interface FormData {
  sectionA: SectionA;
  sectionB: SectionB;
  sectionC: SectionC;
  sectionD_FillPac: FillPacFeedback[];
  sectionD_BucketElevator: BucketElevatorFeedback[];
}
