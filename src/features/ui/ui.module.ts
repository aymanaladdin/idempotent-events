import { Module } from '@nestjs/common';
import { BrowserAuthGuard } from './browser-auth.guard';
import { UiController } from './ui.controller';

@Module({
  controllers: [UiController],
  providers: [BrowserAuthGuard],
})
export class UiModule {}
