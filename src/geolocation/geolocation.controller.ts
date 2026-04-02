import { Controller, Get, Post, Body, Headers, Query } from '@nestjs/common';
import { GeolocationService } from './geolocation.service';

@Controller('geolocation')
export class GeolocationController {
  constructor(private readonly geolocationService: GeolocationService) {}

  @Post('share')
  async share(
    @Headers('x-user-id') userId: string,
    @Body() body: { lat: number; lng: number },
  ) {
    if (!userId) return { error: 'Missing X-User-Id' };
    if (typeof body?.lat !== 'number' || typeof body?.lng !== 'number')
      return { error: 'lat and lng required' };
    return this.geolocationService.shareLocation(userId, body.lat, body.lng);
  }

  @Get('route/today')
  async getTodayRoute(@Headers('x-user-id') userId: string) {
    if (!userId) return { error: 'Missing X-User-Id' };
    return this.geolocationService.getTodayRoute(userId);
  }

  @Get('route')
  async getRoute(
    @Headers('x-user-id') userId: string,
    @Query('from') fromStr: string,
    @Query('to') toStr: string,
  ) {
    if (!userId) return { error: 'Missing X-User-Id' };
    const from = new Date(fromStr);
    const to = new Date(toStr);
    if (isNaN(from.getTime()) || isNaN(to.getTime()))
      return { error: 'Valid from and to query params required' };
    return this.geolocationService.getRoute(userId, from, to);
  }
}
