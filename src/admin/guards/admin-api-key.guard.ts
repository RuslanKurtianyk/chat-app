import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
  ServiceUnavailableException,
} from '@nestjs/common';

/**
 * Protects `/admin/*` routes. Set `ADMIN_API_KEY` in the environment and send:
 * `X-Admin-Api-Key: <same value>`
 */
@Injectable()
export class AdminApiKeyGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const key = process.env.ADMIN_API_KEY?.trim();
    if (!key) {
      throw new ServiceUnavailableException(
        'Admin API disabled: set ADMIN_API_KEY in environment',
      );
    }
    const req = context.switchToHttp().getRequest<{ headers: Record<string, string | string[] | undefined> }>();
    const header = req.headers['x-admin-api-key'];
    const provided = Array.isArray(header) ? header[0] : header;
    if (!provided || provided !== key) {
      throw new ForbiddenException('Invalid or missing X-Admin-Api-Key');
    }
    return true;
  }
}
