import { PartialType, OmitType } from '@nestjs/mapped-types';
import { CreateAboutSectionDto } from './create-about-section.dto';

// `key` is immutable after creation — it's the section's stable identifier
export class UpdateAboutSectionDto extends PartialType(
  OmitType(CreateAboutSectionDto, ['key'] as const),
) {}
