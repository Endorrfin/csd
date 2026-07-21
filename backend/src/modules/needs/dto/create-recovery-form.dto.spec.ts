// === ADDED: PR-1 validation spec for the public Recovery payload ===
// reflect-metadata is required because the DTO uses @Type() (class-transformer);
// service specs get it transitively via @nestjs/testing, plain DTO specs don't.
import 'reflect-metadata';
import { plainToInstance } from 'class-transformer';
import { validateSync } from 'class-validator';
import { CreateRecoveryFormDto } from './create-recovery-form.dto';

// Collect failing property names (nested errors surface as the parent prop)
const errorProps = (dto: object): string[] =>
  validateSync(plainToInstance(CreateRecoveryFormDto, dto)).map(
    (e) => e.property,
  );

const photo = (n: number) => ({
  s3Key: `media/needs/recovery/photo/abc-${n}.jpg`,
  originalName: `photo-${n}.jpg`,
  mimeType: 'image/jpeg',
  sizeBytes: 1024,
});

/** Minimal valid public payload (non-education, non-healthcare object). */
const valid = {
  applicantCategory: 'municipality',
  organizationName: 'Чернівецька міська рада',
  region: 'Чернівецька',
  regionEn: 'Chernivtsi',
  district: 'Чернівецький',
  districtEn: 'Chernivtsi',
  community: 'Чернівецька',
  communityEn: 'Chernivtsi',
  communityCode: 'UA73060250000032727',
  contactName: 'Іван Іваненко',
  contactPosition: 'Заступник міського голови',
  phone: '+380501234567',
  email: 'admin@example.com',
  objectName: 'Пункт незламності №3',
  objectType: 'resilience_center',
  workCategories: ['building_repair', 'utilities'],
  damages: [
    { element: 'roof', volume: 120.5 },
    { element: 'windows', volume: 14 },
  ],
  damageDescription: 'а'.repeat(120),
  damageCause: 'shelling',
  damageCategory: 'category_1',
  functioningStatus: 'partially_operational',
  directBeneficiaries: 1500,
  idpCount: 300,
  childrenCount: 400,
  pwdCount: 50,
  elderlyCount: 200,
  estimatedCost: 2_500_000,
  costBasis: 'defect_act',
  cofinancing: 'partial',
  cofinancingDetails: '10% з місцевого бюджету',
  docsAvailable: ['defect_act', 'cost_estimate'],
  otherDonors: false,
  asbestosPresence: 'unknown',
  photos: [photo(1), photo(2), photo(3)],
  consentGiven: true,
};

describe('CreateRecoveryFormDto validation', () => {
  it('passes with a complete minimal payload', () => {
    expect(errorProps(valid)).toEqual([]);
  });

  it('requires consentGiven to be exactly true', () => {
    expect(errorProps({ ...valid, consentGiven: false })).toContain(
      'consentGiven',
    );
  });

  it('rejects fewer than 3 photos', () => {
    expect(errorProps({ ...valid, photos: [photo(1), photo(2)] })).toContain(
      'photos',
    );
  });

  it('rejects an s3Key outside the recovery prefix', () => {
    const foreign = {
      ...photo(1),
      s3Key: 'media/blog/steal-me.jpg',
    };
    expect(
      errorProps({ ...valid, photos: [foreign, photo(2), photo(3)] }),
    ).toContain('photos');
  });

  it('rejects an s3Key with ".." path traversal despite a valid prefix', () => {
    const traversal = {
      ...photo(1),
      s3Key: 'media/needs/recovery/../../blog/steal-me.jpg',
    };
    expect(
      errorProps({ ...valid, photos: [traversal, photo(2), photo(3)] }),
    ).toContain('photos');
  });

  it('requires at least one damage element', () => {
    expect(errorProps({ ...valid, damages: [] })).toContain('damages');
  });

  it('rejects a damageDescription shorter than 100 chars', () => {
    expect(errorProps({ ...valid, damageDescription: 'коротко' })).toContain(
      'damageDescription',
    );
  });

  it('requires educationMode and shelterStatus for education objects', () => {
    const errs = errorProps({ ...valid, objectType: 'education' });
    expect(errs).toContain('educationMode');
    expect(errs).toContain('shelterStatus');
  });

  it('does not require education fields for other object types', () => {
    expect(errorProps(valid)).not.toContain('educationMode');
  });

  it('requires healthFacilityKind for healthcare objects', () => {
    expect(errorProps({ ...valid, objectType: 'healthcare' })).toContain(
      'healthFacilityKind',
    );
  });

  it('requires otherDonorsDetails when otherDonors is true', () => {
    expect(errorProps({ ...valid, otherDonors: true })).toContain(
      'otherDonorsDetails',
    );
    expect(
      errorProps({
        ...valid,
        otherDonors: true,
        otherDonorsDetails: 'UNICEF, 2024, генератор',
      }),
    ).toEqual([]);
  });

  it('rejects a malformed phone', () => {
    expect(errorProps({ ...valid, phone: '0501234567' })).toContain('phone');
  });

  it('rejects an unknown damageCategory', () => {
    expect(errorProps({ ...valid, damageCategory: 'category_9' })).toContain(
      'damageCategory',
    );
  });

  it('requires applicantCategoryOther only when category is "other"', () => {
    expect(errorProps({ ...valid, applicantCategory: 'other' })).toContain(
      'applicantCategoryOther',
    );
    expect(
      errorProps({
        ...valid,
        applicantCategory: 'other',
        applicantCategoryOther: 'Благодійний фонд',
      }),
    ).toEqual([]);
  });
});
