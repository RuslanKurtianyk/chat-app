import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { UsersService } from '../users/users.service';
import { SignUpDto } from './dto/sign-up.dto';
import { User } from '../users/entities/user.entity';

@Injectable()
export class AuthService {
  constructor(
    private readonly usersService: UsersService,
    private readonly jwtService: JwtService,
  ) {}

  async signUp(signUpDto: SignUpDto) {
    const user = await this.usersService.create({
      mobile: signUpDto.mobile,
      password: signUpDto.password,
    });
    return this.loginPayload(user);
  }

  async validateUser(mobile: string, password: string): Promise<Omit<User, 'passwordHash'> | null> {
    const user = await this.usersService.findByMobile(mobile);
    if (!user) return null;
    const valid = await this.usersService.validatePassword(user, password);
    if (!valid) return null;
    const { passwordHash: _, ...sanitized } = user;
    return sanitized;
  }

  async signIn(mobile: string, password: string) {
    const user = await this.validateUser(mobile, password);
    if (!user) {
      throw new UnauthorizedException('Invalid mobile or password');
    }
    return this.loginPayload(user);
  }

  private loginPayload(user: { id: string; mobile: string; createdAt?: Date }) {
    const payload = { sub: user.id, mobile: user.mobile };
    return {
      access_token: this.jwtService.sign(payload),
      user: { id: user.id, mobile: user.mobile },
    };
  }
}
