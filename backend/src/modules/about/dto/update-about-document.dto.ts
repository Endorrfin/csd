import { PartialType } from '@nestjs/mapped-types';
import { CreateAboutDocumentDto } from './create-about-document.dto';

export class UpdateAboutDocumentDto extends PartialType(
  CreateAboutDocumentDto,
) {}
