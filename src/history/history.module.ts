import { Module } from '@nestjs/common';
import { HistoryController } from './history.controller';
import { HistoryService } from './history.service';
import { MongooseModule } from '@nestjs/mongoose';
import { Creator, CreatorSchema, Video, VideoSchema } from '../common/schemas';
import { ConfigService } from '@nestjs/config';
import { RedisModule } from '@nestjs-modules/ioredis';
import { MeiliSearchModule } from 'nestjs-meilisearch';
import { HistoryScheduler } from './history.scheduler';
import { ScheduleModule } from '@nestjs/schedule';
import { ClientsModule, Transport } from '@nestjs/microservices';
import { microserviceClients } from 'src/common/constants';

@Module({
  imports: [
    ScheduleModule.forRoot(),
    MongooseModule.forFeature([
      { name: Creator.name, schema: CreatorSchema },
      { name: Video.name, schema: VideoSchema },
    ]),
    RedisModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        url: configService.getOrThrow<string>('REDIS_URL'),
        type: 'single',
      }),
    }),
    MeiliSearchModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        host: configService.getOrThrow<string>('MEILISEARCH_URL'),
        apiKey: configService.getOrThrow<string>('MEILISEARCH_MASTERKEY'),
      }),
    }),
    ClientsModule.registerAsync(
      microserviceClients.map((item) => ({
        name: item[0],
        inject: [ConfigService],
        useFactory: (configService: ConfigService) => ({
          transport: Transport.RMQ,
          options: {
            urls: [configService.get<string>('RABBITMQ_URL')],
            queue: configService.get<string>(`RABBITMQ_${item[1]}_QUEUE`),
            persistent: true,
            queueOptions: {
              durable: false,
            },
          },
        }),
      })),
    ),
  ],
  controllers: [HistoryController],
  providers: [HistoryService, HistoryScheduler],
})
export class HistoryModule {}
