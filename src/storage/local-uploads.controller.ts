import { Controller, Get, NotFoundException, Param, Res } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { Response } from 'express';
import { promises as fs } from 'node:fs';
import path from 'node:path';

const safeSegmentRe = /^[a-zA-Z0-9_-]+$/;
const safeFilenameRe = /^[a-zA-Z0-9._-]+$/;

@Controller('storage/local')
export class LocalUploadsController {
  constructor(private readonly config: ConfigService) {}

  @Get(':folder/:subfolder/:filename')
  async serve(
    @Param('folder') folder: string,
    @Param('subfolder') subfolder: string,
    @Param('filename') filename: string,
    @Res() res: Response,
  ) {
    if (!safeSegmentRe.test(folder))
      throw new NotFoundException('Invalid folder');
    if (!safeSegmentRe.test(subfolder))
      throw new NotFoundException('Invalid subfolder');
    if (!safeFilenameRe.test(filename))
      throw new NotFoundException('Invalid filename');

    const localUploadDir =
      this.config.get<string>('cloudinary.localUploadDir')?.trim() ||
      'data/uploads';

    const baseDirAbs = path.resolve(
      process.cwd(),
      localUploadDir,
      folder,
      subfolder,
    );
    const fileAbs = path.resolve(baseDirAbs, filename);

    // Extra guard against path traversal.
    if (!fileAbs.startsWith(baseDirAbs + path.sep)) {
      throw new NotFoundException('Not found');
    }

    try {
      await fs.stat(fileAbs);
    } catch {
      throw new NotFoundException('Not found');
    }

    res.setHeader('Cache-Control', 'no-store');
    return res.sendFile(fileAbs);
  }
}
