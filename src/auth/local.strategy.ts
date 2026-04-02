import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { Strategy } from 'passport-local';
import { AuthService } from './auth.service';
import { User } from '../users/entities/user.entity';

@Injectable()
export class LocalStrategy extends PassportStrategy(Strategy, 'local') {
  constructor(private readonly authService: AuthService) {
    super({
      usernameField: 'mobile',
      passwordField: 'password',
    });
  }

  async validate(
    mobile: string,
    password: string,
  ): Promise<Omit<User, 'passwordHash'>> {
    const user = await this.authService.validateUser(mobile, password);
    if (!user) throw new UnauthorizedException('Invalid mobile or password');
    return user;
  }
}
