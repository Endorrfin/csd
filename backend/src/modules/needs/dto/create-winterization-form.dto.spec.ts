// === ADDED: PR-W1 validation spec for the public Winterization payload ===
// reflect-metadata is required because the DTO uses @Type() (class-transformer);
// service specs get it transitively via @nestjs/testing, plain DTO specs don't.
import 'reflect-metadata';
import { plainToInstance } from 'class-transformer';
import { validateSync } from 'class-validator';
import { CreateWinterizationFormDto } from './create-winterization-form.dto';

/** Collect failing property names (nested errors surface as the parent prop). */
const errorProps = (dto: object): string[] =>
  validateSync(plainToInstance(CreateWinterizationFormDto, dto)).map(
    (e) => e.property,
  );

/**
 * Drop keys from a fixture. Written as a helper rather than
 * `const { a: _unused, ...rest } = fixture` because the discarded binding trips
 * @typescript-eslint/no-unused-vars in this repo's config.
 */
const omit = <T extends object>(
  obj: T,
  ...keys: Array<keyof T>
): Partial<T> => {
  const clone: Partial<T> = { ...obj };
  for (const key of keys) delete clone[key];
  return clone;
};

const photo = (n: number) => ({
  s3Key: `media/needs/winterization/photo/abc-${n}.jpg`,
  originalName: `photo-${n}.jpg`,
  mimeType: 'image/jpeg',
  sizeBytes: 1024,
});

const location = {
  region: 'Донецька',
  regionEn: 'Donetsk',
  district: 'Покровський',
  districtEn: 'Pokrovskyi',
  community: 'Покровська',
  communityEn: 'Pokrovska',
  communityCode: 'UA14120150000012345',
};

/** Minimal valid ОМС payload: solid fuel for communal boiler houses. */
const validMunicipality = {
  applicantType: 'municipality',
  organizationName: 'Покровська міська територіальна громада',
  ...location,
  contactName: 'Іван Іваненко',
  contactPosition: 'Заступник міського голови',
  phone: '+380501234567',
  email: 'rada@example.com',
  needCategories: ['solid_fuel'],
  situationDescription: 'а'.repeat(60),
  needs: [{ category: 'solid_fuel', item: 'coal', quantity: 15, unit: 't' }],
  directBeneficiaries: 5200,
  idpCount: 800,
  childrenCount: 900,
  pwdCount: 120,
  elderlyCount: 1400,
  needBy: 'by_october',
  urgency: 'critical',
  otherDonors: false,
  cofinancing: 'no',
  consentGiven: true,
};

/** Minimal valid інституція payload: a school asking for a generator. */
const validInstitution = {
  ...validMunicipality,
  applicantType: 'institution',
  organizationName: 'Ліцей №1 Покровської МТГ',
  facilityName: 'Ліцей №1',
  facilityKind: 'education',
  heatingSource: 'district',
  backupPower: 'none',
  needCategories: ['generators'],
  needs: [
    {
      category: 'generators',
      item: 'generator',
      quantity: 2,
      powerKw: 10,
      fuelType: 'diesel',
      purpose: 'facility',
    },
  ],
};

/** Household payload — DTO-valid; the SERVICE still rejects it while gated off. */
const validHousehold = {
  applicantType: 'household',
  organizationName: 'Іваненко Іван Іванович',
  ...location,
  contactName: 'Іваненко Іван Іванович',
  phone: '+380501234567',
  email: 'ivan@example.com',
  hhStreetAddress: 'вул. Центральна',
  hhHouseNumber: '12а',
  hhVulnerabilities: ['idp', 'single_pensioner'],
  hhAdults: 1,
  hhChildren: 0,
  hhElderly: 1,
  hhHeatingType: 'stove',
  hhCriticalNeed: 'solid_fuel',
  needBy: 'by_november',
  urgency: 'high',
  otherDonors: false,
  consentGiven: true,
};

describe('CreateWinterizationFormDto validation', () => {
  describe('municipality scenario', () => {
    it('passes with a complete minimal payload', () => {
      expect(errorProps(validMunicipality)).toEqual([]);
    });

    it('requires consentGiven to be exactly true', () => {
      expect(
        errorProps({ ...validMunicipality, consentGiven: false }),
      ).toContain('consentGiven');
    });

    it('requires at least one need category', () => {
      expect(
        errorProps({ ...validMunicipality, needCategories: [] }),
      ).toContain('needCategories');
    });

    it('requires a situation description of at least 50 chars', () => {
      expect(
        errorProps({ ...validMunicipality, situationDescription: 'коротко' }),
      ).toContain('situationDescription');
    });

    it('requires contactPosition for an organization', () => {
      expect(errorProps(omit(validMunicipality, 'contactPosition'))).toContain(
        'contactPosition',
      );
    });

    it('does not require the institution facility block', () => {
      const errs = errorProps(validMunicipality);
      expect(errs).not.toContain('facilityKind');
      expect(errs).not.toContain('heatingSource');
      expect(errs).not.toContain('backupPower');
    });

    it('rejects a malformed phone', () => {
      expect(
        errorProps({ ...validMunicipality, phone: '0501234567' }),
      ).toContain('phone');
    });

    it('rejects an ЄДРПОУ that is not exactly 8 digits', () => {
      expect(errorProps({ ...validMunicipality, edrpou: '1234' })).toContain(
        'edrpou',
      );
      expect(errorProps({ ...validMunicipality, edrpou: '04058441' })).toEqual(
        [],
      );
    });

    it('rejects an unknown needBy bucket', () => {
      expect(
        errorProps({ ...validMunicipality, needBy: 'by_spring' }),
      ).toContain('needBy');
    });
  });

  describe('institution scenario', () => {
    it('passes with the facility block filled', () => {
      expect(errorProps(validInstitution)).toEqual([]);
    });

    it('requires facilityName, facilityKind, heatingSource and backupPower', () => {
      const errs = errorProps(
        omit(
          validInstitution,
          'facilityName',
          'facilityKind',
          'heatingSource',
          'backupPower',
        ),
      );
      expect(errs).toContain('facilityName');
      expect(errs).toContain('facilityKind');
      expect(errs).toContain('heatingSource');
      expect(errs).toContain('backupPower');
    });

    it('requires facilityKindOther only when the kind is "other"', () => {
      expect(
        errorProps({ ...validInstitution, facilityKind: 'other' }),
      ).toContain('facilityKindOther');
      expect(
        errorProps({
          ...validInstitution,
          facilityKind: 'other',
          facilityKindOther: 'Комунальний музей',
        }),
      ).toEqual([]);
    });
  });

  describe('category-driven conditional blocks', () => {
    it('requires heatingRepairDescription when repairs are requested', () => {
      expect(
        errorProps({
          ...validMunicipality,
          needCategories: ['heating_system_repair'],
          needs: [{ category: 'heating_system_repair', item: 'boiler' }],
        }),
      ).toContain('heatingRepairDescription');
    });

    it('requires liquidFuelMonthsNeeded when generator fuel is requested', () => {
      expect(
        errorProps({
          ...validMunicipality,
          needCategories: ['liquid_fuel'],
          needs: [{ category: 'liquid_fuel', item: 'diesel', quantity: 400 }],
        }),
      ).toContain('liquidFuelMonthsNeeded');
    });

    it('requires resiliencePointStatus for resilience point equipment', () => {
      expect(
        errorProps({
          ...validMunicipality,
          needCategories: ['resilience_point_equipment'],
          needs: [
            { category: 'resilience_point_equipment', item: 'powerbanks' },
          ],
        }),
      ).toContain('resiliencePointStatus');
    });

    it('requires needCategoryOther when "other" is selected', () => {
      expect(
        errorProps({
          ...validMunicipality,
          needCategories: ['solid_fuel', 'other'],
        }),
      ).toContain('needCategoryOther');
    });

    it('rejects a need row with an unknown item', () => {
      expect(
        errorProps({
          ...validMunicipality,
          needs: [{ category: 'solid_fuel', item: 'uranium' }],
        }),
      ).toContain('needs');
    });
  });

  describe('budget & coordination', () => {
    it('accepts a payload with no cost figure at all (estimatedCost is [I])', () => {
      expect(errorProps(validMunicipality)).toEqual([]);
      expect(validMunicipality).not.toHaveProperty('estimatedCost');
    });

    it('requires costBasis as soon as estimatedCost is given', () => {
      expect(
        errorProps({ ...validMunicipality, estimatedCost: 1_250_000 }),
      ).toContain('costBasis');
      expect(
        errorProps({
          ...validMunicipality,
          estimatedCost: 1_250_000,
          costBasis: 'price_offer',
        }),
      ).toEqual([]);
    });

    it('requires otherDonorsDetails when otherDonors is true', () => {
      expect(errorProps({ ...validMunicipality, otherDonors: true })).toContain(
        'otherDonorsDetails',
      );
      expect(
        errorProps({
          ...validMunicipality,
          otherDonors: true,
          otherDonorsDetails: 'UNICEF, жовтень 2025, генератор 10 кВт',
        }),
      ).toEqual([]);
    });
  });

  describe('attachments', () => {
    it('accepts a payload with no photos (fuel/NFI requests need none)', () => {
      expect(errorProps(validMunicipality)).toEqual([]);
    });

    it('rejects an s3Key outside the winterization prefix', () => {
      const foreign = {
        ...photo(1),
        s3Key: 'media/needs/recovery/photo/x.jpg',
      };
      expect(errorProps({ ...validMunicipality, photos: [foreign] })).toContain(
        'photos',
      );
    });

    it('rejects an s3Key with ".." path traversal despite a valid prefix', () => {
      const traversal = {
        ...photo(1),
        s3Key: 'media/needs/winterization/../../blog/steal-me.jpg',
      };
      expect(
        errorProps({ ...validMunicipality, photos: [traversal] }),
      ).toContain('photos');
    });

    it('rejects more than 10 photos', () => {
      const photos = Array.from({ length: 11 }, (_, i) => photo(i));
      expect(errorProps({ ...validMunicipality, photos })).toContain('photos');
    });
  });

  describe('household scenario (§7 — DTO-valid, service-gated)', () => {
    it('passes without the organization blocks', () => {
      expect(errorProps(validHousehold)).toEqual([]);
    });

    it('requires the vulnerability list, composition, heating type and critical need', () => {
      const errs = errorProps(
        omit(
          validHousehold,
          'hhVulnerabilities',
          'hhAdults',
          'hhChildren',
          'hhElderly',
          'hhHeatingType',
          'hhCriticalNeed',
        ),
      );
      expect(errs).toContain('hhVulnerabilities');
      expect(errs).toContain('hhAdults');
      expect(errs).toContain('hhChildren');
      expect(errs).toContain('hhElderly');
      expect(errs).toContain('hhHeatingType');
      expect(errs).toContain('hhCriticalNeed');
    });

    it('does not require contactPosition, needCategories or beneficiary counts', () => {
      const errs = errorProps(validHousehold);
      expect(errs).not.toContain('contactPosition');
      expect(errs).not.toContain('needCategories');
      expect(errs).not.toContain('directBeneficiaries');
      expect(errs).not.toContain('situationDescription');
    });
  });
});
