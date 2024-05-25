import { IsNotEmpty, IsUUID } from 'class-validator';

export class RecordVideoViewDto {
  @IsNotEmpty()
  @IsUUID(4)
  videoId: string;
}
