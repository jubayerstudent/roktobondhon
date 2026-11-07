export type Language = 'bn' | 'en';

export type BloodGroup = 'A+' | 'A-' | 'B+' | 'B-' | 'O+' | 'O-' | 'AB+' | 'AB-';

export type BargunaUpazilaId =
  | 'barguna-sadar'
  | 'amtali'
  | 'betagi'
  | 'bamna'
  | 'patharghata'
  | 'taltali';

export interface UpazilaInfo {
  id: BargunaUpazilaId;
  nameBn: string;
  nameEn: string;
  unionsCount: number;
  primaryHospitalBn: string;
  primaryHospitalEn: string;
  coordinatorZoneBn: string;
  coordinatorZoneEn: string;
}

export interface DistrictArchitectureConfig {
  districtId: string;
  nameBn: string;
  nameEn: string;
  divisionBn: string;
  divisionEn: string;
  isActiveLaunch: boolean;
  upazilas: UpazilaInfo[];
}

export interface DemoDonor {
  id: string;
  code: string;
  nameBn: string;
  nameEn: string;
  bloodGroup: BloodGroup;
  upazilaId: BargunaUpazilaId;
  locationBn: string;
  locationEn: string;
  isAvailable: boolean;
  lastDonationDaysAgo: number;
  totalDonations: number;
  maskedPhone: string;
  verifiedByOrgBn: string;
  verifiedByOrgEn: string;
  isDemoRecord: true;
}

export interface EmergencyBloodRequest {
  id: string;
  patientName: string;
  bloodGroup: BloodGroup;
  bagsNeeded: number;
  upazilaId: BargunaUpazilaId;
  hospitalName: string;
  urgency: 'critical' | 'urgent' | 'scheduled';
  reasonBn: string;
  reasonEn: string;
  contactPhone: string;
  postedTimeBn: string;
  postedTimeEn: string;
  isDemoRecord: boolean;
}

export interface BloodCompatibilityInfo {
  group: BloodGroup;
  nameBn: string;
  canDonateTo: BloodGroup[];
  canReceiveFrom: BloodGroup[];
  plasmaCanDonateTo: BloodGroup[];
  clinicalNoteBn: string;
  clinicalNoteEn: string;
}

export interface CampaignItem {
  id: string;
  titleBn: string;
  titleEn: string;
  dateBn: string;
  dateEn: string;
  upazilaId: BargunaUpazilaId;
  venueBn: string;
  venueEn: string;
  organizerBn: string;
  organizerEn: string;
  targetServicesBn: string;
  targetServicesEn: string;
  status: 'upcoming' | 'registration-open';
}

export interface VolunteerCoordinator {
  id: string;
  nameBn: string;
  nameEn: string;
  roleBn: string;
  roleEn: string;
  upazilaId: BargunaUpazilaId;
  responsibilityBn: string;
  responsibilityEn: string;
  isDemoRecord: true;
}

export interface PartnerOrganization {
  id: string;
  nameBn: string;
  nameEn: string;
  category: 'hospital' | 'youth-org' | 'clinic';
  categoryLabelBn: string;
  categoryLabelEn: string;
  upazilaId: BargunaUpazilaId;
  addressBn: string;
  addressEn: string;
  servicesBn: string;
  servicesEn: string;
}
