import { Controller, Get, Res, UseGuards } from '@nestjs/common';
import { ApiExcludeController } from '@nestjs/swagger';
import { Response } from 'express';
import * as path from 'path';
import { BrowserAuthGuard } from './browser-auth.guard';

@ApiExcludeController()
@UseGuards(BrowserAuthGuard)
@Controller('ui')
export class UiController {
  @Get('dashboard')
  dashboard(@Res() res: Response) {
    res.sendFile(path.join(process.cwd(), 'public', 'index.html'));
  }
}
