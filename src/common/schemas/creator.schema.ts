import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type CreatorDocument = Creator & Document;

@Schema({ versionKey: false, _id: false })
export class Creator {
  @Prop(String)
  _id: string;

  @Prop(String)
  displayName: string;

  @Prop(String)
  nickname: string;

  @Prop(String)
  thumbnailUrl?: string;

  @Prop(Boolean)
  recordWatchHistory: boolean;
}

export const CreatorSchema = SchemaFactory.createForClass(Creator);
