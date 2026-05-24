import { plainToInstance } from 'class-transformer';
import { validateSync } from 'class-validator';
import { CreateInquiryDto } from './create-inquiry.dto';
import {
  InquiryReason,
  InquiryLang,
  MessengerType,
} from '../entities/inquiry.entity';

// Collect failing property names for easy assertions
const errorProps = (dto: object): string[] =>
  validateSync(plainToInstance(CreateInquiryDto, dto)).map((e) => e.property);

// Required fields minus any contact channel
const core = {
  reason: InquiryReason.GENERAL,
  preferredLang: InquiryLang.UA,
  message: 'Hello',
};
const valid = { ...core, email: 'a@b.com' };

describe('CreateInquiryDto validation', () => {
  it('passes with a reason, a language, a message and one contact', () => {
    expect(errorProps(valid)).toEqual([]);
  });

  it('fails when no contact method is provided', () => {
    // the cross-field rule is attached to `message`
    expect(errorProps(core)).toContain('message');
  });

  it('accepts a messenger handle as the sole contact', () => {
    expect(
      errorProps({
        ...core,
        messengerType: MessengerType.TELEGRAM,
        messengerHandle: '@olha',
      }),
    ).toEqual([]);
  });

  it('requires messengerHandle once a messengerType is set', () => {
    expect(
      errorProps({ ...valid, messengerType: MessengerType.VIBER }),
    ).toContain('messengerHandle');
  });

  it('requires reasonOther only when reason is "other"', () => {
    expect(errorProps({ ...valid, reason: InquiryReason.OTHER })).toContain(
      'reasonOther',
    );
    expect(
      errorProps({
        ...valid,
        reason: InquiryReason.OTHER,
        reasonOther: 'Research',
      }),
    ).toEqual([]);
  });

  it('rejects a malformed phone', () => {
    expect(errorProps({ ...core, phone: '0501234567' })).toContain('phone');
  });
});
