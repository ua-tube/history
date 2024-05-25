import { VideoVisibility } from '../../common/schemas';

export class CreateVideoDto {
  id: string;
  creatorId: string;
  title: string;
  description: string;
  tags: string;
  lengthSeconds: number;
  visibility: VideoVisibility;
  createdAt: Date;
}
