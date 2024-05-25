import { IsBoolean, IsNotEmpty } from 'class-validator';

export class SwitchWatchHistoryDto {
  @IsNotEmpty()
  @IsBoolean()
  enabled: boolean;
}
