import { IsNotEmpty, IsString, IsUUID } from 'class-validator';

export class StageInputDto {
  @IsString()
  @IsNotEmpty()
  name!: string;

  @IsUUID()
  approverId!: string;
}
