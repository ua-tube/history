import { CanBeUndefined } from '../../common/decorators';
import { IsNumber, Max, Min } from 'class-validator';
import { Transform } from 'class-transformer';

export class PaginationDto {
  @CanBeUndefined()
  @IsNumber()
  @Min(1)
  @Transform(({ value }) => Number(value))
  page?: number;

  @CanBeUndefined()
  @IsNumber()
  @Min(1)
  @Max(100)
  @Transform(({ value }) => Number(value))
  perPage?: number;
}
