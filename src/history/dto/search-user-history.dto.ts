import { CanBeUndefined } from '../../common/decorators';
import { IsString } from 'class-validator';

export class SearchUserHistoryDto {
  @CanBeUndefined()
  @IsString()
  query?: string;
}
