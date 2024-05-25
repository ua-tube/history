import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios from 'axios';
import { isEmpty } from 'class-validator';

@Injectable()
export class OptionalAuthUserGuard implements CanActivate {
  constructor(private readonly configService: ConfigService) {}

  public async canActivate(ctx: ExecutionContext): Promise<boolean> | never {
    const req = ctx.switchToHttp().getRequest();

    const authorizationHeader = req.headers['authorization'] || '';
    if (isEmpty(authorizationHeader)) {
      return true;
    }

    const split = authorizationHeader.split(' ');
    if (split.length < 2) {
      return true;
    }

    if (isEmpty(split[1])) return true;

    try {
      const { data } = await axios.get(
        this.configService.get<string>('AUTH_SVC_URL'),
        {
          headers: {
            Authorization: `Bearer ${split[1]}`,
          },
        },
      );

      req.userId = data.id;

      return true;
    } catch {
      return true;
    }
  }
}
