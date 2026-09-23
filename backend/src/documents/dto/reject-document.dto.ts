import { IsOptional, IsString } from 'class-validator';
import { ActionDto } from './action.dto';

export class RejectDocumentDto extends ActionDto {
  @IsOptional()
  @IsString()
  reason?: string;
}
