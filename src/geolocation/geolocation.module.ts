import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { GeolocationService } from './geolocation.service';
import { GeolocationController } from './geolocation.controller';
import { GeolocationGateway } from './geolocation.gateway';
import { LocationPoint } from './entities/location-point.entity';

@Module({
  imports: [TypeOrmModule.forFeature([LocationPoint])],
  controllers: [GeolocationController],
  providers: [GeolocationService, GeolocationGateway],
  exports: [GeolocationService],
})
export class GeolocationModule {}
