import { Injectable, Logger } from '@nestjs/common';
import { UpsertCreatorDto } from './dto';
import { InjectModel } from '@nestjs/mongoose';
import { Creator, CreatorDocument } from '../common/schemas';
import { Model } from 'mongoose';

@Injectable()
export class CreatorsService {
  private readonly logger = new Logger(CreatorsService.name);

  constructor(
    @InjectModel(Creator.name)
    private readonly creatorModel: Model<CreatorDocument>,
  ) {}

  async upsertCreator(payload: UpsertCreatorDto) {
    const creator = await this.creatorModel.findOne({
      _id: payload.id,
    });

    if (creator) {
      try {
        await this.creatorModel.updateOne(
          { _id: payload.id },
          {
            displayName: payload.displayName,
            nickname: payload.nickname,
            thumbnailUrl: payload.thumbnailUrl,
          },
        );
        this.logger.log(`Creator (${payload.id}) is updated`);
      } catch {
        this.logger.error(
          `An error occurred when updating creator (${payload.id})`,
        );
      }
    } else {
      try {
        await this.creatorModel.create({
          _id: payload.id,
          displayName: payload.displayName,
          nickname: payload.nickname,
          thumbnailUrl: payload.thumbnailUrl,
        });
        this.logger.log(`Creator (${payload.id}) is created`);
      } catch {
        this.logger.error(
          `An error occurred when creating creator (${payload.id})`,
        );
      }
    }
  }
}
