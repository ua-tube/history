import { Controller } from '@nestjs/common';
import { CreatorsService } from './creators.service';
import { Ctx, EventPattern, Payload, RmqContext } from '@nestjs/microservices';
import { UpsertCreatorDto } from './dto';
import { ackMessage } from '../common/utils';

@Controller()
export class CreatorsController {
  constructor(private readonly creatorsService: CreatorsService) {}

  @EventPattern('upsert_creator')
  async handleUpsertCreator(
    @Payload() payload: UpsertCreatorDto,
    @Ctx() context: RmqContext,
  ) {
    await this.creatorsService.upsertCreator(payload);
    ackMessage(context);
  }
}
