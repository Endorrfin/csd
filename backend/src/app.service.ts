import { Injectable } from '@nestjs/common';

@Injectable()
export class AppService {
  getHello(): string {
    return '🙋‍♂️🙋🏼‍♀️ Hello CSD web-portal';
  }
}
