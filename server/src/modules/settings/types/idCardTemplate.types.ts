export interface IdCardFieldConfig {
  id: string;
  key: string;              // 'name' | 'designation' | 'department' | 'employeeCode' | 'employeeType' | 'dateOfJoining' | 'bloodGroup' | 'reportingManager' | 'location' | 'phone' | 'email' | 'emergencyContact' | 'custom'
  label: string;            // Display label (e.g. "Employee Code", "Joined", "Blood Group")
  visible: boolean;         // Show/hide toggle
  side: 'front' | 'back' | 'both'; // Front, back or both
  fontSize?: 'xs' | 'sm' | 'base' | 'lg' | 'xl' | string;
  fontWeight?: 'normal' | 'medium' | 'semibold' | 'bold' | 'black';
  color?: string;           // Custom text color (e.g. '#ffffff', '#fde047', '')
  labelColor?: string;      // Custom label color
  isCustom?: boolean;       // Is custom user-added field
  customValue?: string;     // Static value or template placeholder
  showLabel?: boolean;      // Whether to show label or just value (e.g. for big name)
}

export interface IdCardQrConfig {
  enabled: boolean;
  content: 'profile_url' | 'employee_code' | 'vcard' | 'attendance_link' | 'custom_json';
  customValue?: string;
  position: 'bottom_right' | 'bottom_left' | 'center' | 'top_right' | 'back_bottom';
  side: 'front' | 'back' | 'both';
  size: number; // in px, default 64
  backgroundColor?: string;
  foregroundColor?: string;
}

export interface IdCardHeaderConfig {
  visible: boolean;
  showLogo: boolean;
  logoUrl: string | null;
  logoInitial?: string;
  logoSize: number; // e.g. 32
  orgName: string;
  orgNameColor?: string;
  subtitle: string;
  subtitleColor?: string;
  headerBackground: 'transparent' | 'solid' | 'gradient' | 'glass' | 'image';
  headerBgColor?: string;
  headerGradientFrom?: string;
  headerGradientTo?: string;
  bgImageUrl?: string | null;
  headerImageUrl?: string | null; // Dedicated full header slice image
  headerHeight?: number;
  statusBadge: {
    visible: boolean;
    type: 'auto' | 'static'; // auto from emp status vs static
    staticText: string;
    colorVariant: 'emerald' | 'amber' | 'blue' | 'purple' | 'rose' | 'slate';
  };
}

export interface IdCardPhotoConfig {
  visible: boolean;
  shape: 'circle' | 'rounded-square' | 'square';
  size: 'small' | 'medium' | 'large' | number; // e.g. 96px
  fallbackStyle: 'initials' | 'silhouette';
  fallbackBgColor: string;
  fallbackTextColor: string;
  borderWidth: number; // 0 to 8px
  borderColor: string;
  allowEmployeeUpload: boolean;
}

export interface IdCardFooterConfig {
  visible: boolean;
  text: string;
  textColor?: string;
  textSize?: string;
  showPoweredBy: boolean; // "Powered by Apponext HRMS" branding
  hrHelpline?: string;
  validityDate?: string;
  authorizedSignatoryText?: string;
  signatorySignatureUrl?: string | null;
  bgImageUrl?: string | null;
  footerImageUrl?: string | null;
  bottomBarcodeImageUrl?: string | null; // Dedicated bottom barcode + tagline slice image
  footerHeight?: number;
}

export interface IdCardBackConfig {
  headerTitle: string;
  companyAddress: string;
  disclaimer: string;
  showVerificationId: boolean;
  showQrCode: boolean;
  showSignatory: boolean;
  signatoryTitle: string;
  signatureImageUrl: string | null;
  emergencyTitle: string;
  backHeaderImageUrl?: string | null; // Dedicated back header slice image
  bgImageUrl?: string | null;
}

export interface IdCardThemeConfig {
  style: 'gradient' | 'solid' | 'image' | 'dark' | 'light' | 'kosqu-corporate';
  cardLayout?: 'standard' | 'kosqu-corporate' | 'modern-gradient' | 'minimal-light';
  showLanyardHole?: boolean;
  showRibbon?: boolean;
  ribbonColor?: string;
  ribbonImageUrl?: string | null; // Dedicated chevron ribbon slice image
  barcodeFormat?: 'qr' | 'barcode' | 'both';
  tagline?: string;
  showDecorations?: boolean;
  companyWebsite?: string;
  emergencyPhone?: string;
  supportEmail?: string;
  primaryColor: string;
  secondaryColor: string;
  accentColor: string;
  gradientAngle: number;
  gradientFrom: string;
  gradientVia?: string;
  gradientTo: string;
  solidBgColor: string;
  bgImageUrl?: string | null;
  borderRadius: number; // px e.g. 24
  fontFamily: string; // 'Inter' | 'Outfit' | 'Roboto' | 'Poppins' | 'Montserrat' | 'system-ui'
  textColor: string;
  cardWidth: number; // 320 standard
  cardHeight: number; // 490 standard
  orientation: 'portrait' | 'landscape';
}

export interface IdCardPrintConfig {
  paperSize: 'A4' | 'Letter' | 'CR80_Single';
  layout: '2-up' | '4-up' | '8-up' | 'single';
  showCutGuides: boolean;
  bleedMm: number;
  exportDpi: 150 | 300 | 600;
  exportMode: 'front' | 'back' | 'both' | 'sheet';
}

export interface IdCardConfig {
  header: IdCardHeaderConfig;
  photo: IdCardPhotoConfig;
  fields: IdCardFieldConfig[];
  qrCode: IdCardQrConfig;
  footer: IdCardFooterConfig;
  back: IdCardBackConfig;
  theme: IdCardThemeConfig;
  print: IdCardPrintConfig;
}

export interface TemplateAppliesTo {
  departments?: number[];
  employeeTypes?: string[];
  locations?: number[];
  grades?: number[];
}

export interface IdCardTemplate {
  id: number;
  organizationId: number;
  name: string;
  description?: string | null;
  isDefault: boolean;
  status: 'draft' | 'published';
  version: number;
  appliesTo?: TemplateAppliesTo | null;
  configJson: IdCardConfig;
  createdBy?: number | null;
  updatedBy?: number | null;
  createdAt: string;
  updatedAt: string;
  deletedAt?: string | null;
}

export interface IdCardTemplateVersion {
  id: number;
  templateId: number;
  organizationId: number;
  versionNumber: number;
  configJson: IdCardConfig;
  changelog?: string | null;
  createdBy?: number | null;
  createdAt: string;
}

export interface CreateTemplateInput {
  name: string;
  description?: string;
  isDefault?: boolean;
  appliesTo?: TemplateAppliesTo;
  configJson: IdCardConfig;
  status?: 'draft' | 'published';
}

export interface UpdateTemplateInput {
  name?: string;
  description?: string;
  isDefault?: boolean;
  appliesTo?: TemplateAppliesTo;
  configJson?: IdCardConfig;
  status?: 'draft' | 'published';
}
