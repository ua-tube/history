import { Module } from '@nestjs/common';
import { HistoryModule } from './history/history.module';
import { ConfigModule, ConfigService } from '@nestjs/config';
import Joi from 'joi';
import { APP_INTERCEPTOR } from '@nestjs/core';
import { LoggingInterceptor } from './common/interceptors';
import { MongooseModule } from '@nestjs/mongoose';
import { CreatorsModule } from './creators/creators.module';
import { VideoManagerModule } from './video-manager/video-manager.module';
import { HealthModule } from './health/health.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      cache: true,
      isGlobal: true,
      validationSchema: Joi.object({
        NODE_ENV: Joi.valid('development', 'production', 'test').required(),
        HTTP_HOST: Joi.string().required(),
        HTTP_PORT: Joi.number().required(),
        CLIENT_URL: Joi.string().required(),
        AUTH_SVC_URL: Joi.string().required(),
        REDIS_URL: Joi.string().required(),
        DATABASE_URL: Joi.string().required(),
        RABBITMQ_URL: Joi.string().required(),
        RABBITMQ_QUEUE: Joi.string().required(),
      }),
    }),
    MongooseModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        uri: configService.getOrThrow<string>('DATABASE_URL'),
      }),
    }),
    HealthModule,
    CreatorsModule,
    VideoManagerModule,
    HistoryModule,
  ],
  providers: [
    {
      provide: APP_INTERCEPTOR,
      useClass: LoggingInterceptor,
    },
  ],
})
export class AppModule {}
