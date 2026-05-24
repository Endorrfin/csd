import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsEmail,
  IsEnum,
  IsBoolean,
  MaxLength,
  Matches,
  ValidateIf,
} from 'class-validator';
import {
  InquiryReason,
  InquiryLang,
  MessengerType,
} from '../entities/inquiry.entity';
import { AtLeastOneContact } from './at-least-one-contact.validator';

export class CreateInquiryDto {
  @IsEnum(InquiryReason)
  reason: InquiryReason;

  // Required only when reason = 'other'
  @ValidateIf((o: CreateInquiryDto) => o.reason === InquiryReason.OTHER)
  @IsString()
  @IsNotEmpty()
  @MaxLength(160)
  reasonOther?: string;

  @IsOptional()
  @IsString()
  @MaxLength(120)
  name?: string;

  @IsOptional()
  @IsEmail()
  @MaxLength(254)
  email?: string;

  @IsOptional()
  @IsString()
  @Matches(/^\+380\d{9}$/, { message: 'Phone must be in format +380XXXXXXXXX' })
  phone?: string;

  @IsOptional()
  @IsEnum(MessengerType)
  messengerType?: MessengerType;

  // Required once a messenger type is chosen
  @ValidateIf((o: CreateInquiryDto) => !!o.messengerType)
  @IsString()
  @IsNotEmpty()
  @MaxLength(120)
  messengerHandle?: string;

  @IsEnum(InquiryLang)
  preferredLang: InquiryLang;

  @IsString()
  @IsNotEmpty()
  @MaxLength(5000)
  // Cross-field guard lives here because `message` is always present
  @AtLeastOneContact()
  message: string;

  @IsOptional()
  @IsBoolean()
  consent?: boolean;
}
