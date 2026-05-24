import { Test, TestingModule } from '@nestjs/testing';
import { AppController } from './app.controller';
import { AppService } from './app.service';

describe('AppController', () => {
  let appController: AppController;

  beforeEach(async () => {
    const app: TestingModule = await Test.createTestingModule({
      controllers: [AppController],
      providers: [AppService],
    }).compile();

    appController = app.get<AppController>(AppController);
  });

  describe('root', () => {
    // CHANGED: assert the actual greeting returned by AppService, not the stale default
    it('should return the CSD web-portal greeting', () => {
      expect(appController.getHello()).toBe('🙋‍♂️🙋🏼‍♀️ Hello CSD web-portal');
    });
  });

  // === ADDED: cover the health probe used by the deploy smoke test ===
  describe('health', () => {
    it('should report status ok with an ISO timestamp', () => {
      const result = appController.getHealth();
      expect(result.status).toBe('ok');
      expect(result.timestamp).toBe(new Date(result.timestamp).toISOString());
    });
  });
});
