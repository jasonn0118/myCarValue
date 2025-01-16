import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { UsersService } from './users.service';
import { randomBytes, scrypt as _scrypt } from 'crypto';
import { promisify } from 'util';

const scrypt = promisify(_scrypt);

@Injectable()
export class AuthService {
  constructor(private usersService: UsersService) {}

  async signUp(email: string, password: string) {
    // See if email is in use
    const users = await this.usersService.findByEmail(email);

    if (users.length) {
      throw new BadRequestException('Email in use');
    }

    // Hash the user's password
    /**
     * 1. Generate a salt
     * 2. Combine the salt and the user's password
     * 3. Hash the combined value
     */
    const salt = randomBytes(8).toString('hex');

    const hash = (await scrypt(password, salt, 32)) as Buffer;

    const result = salt + '.' + hash.toString('hex');

    // Create a new user and save it

    const user = await this.usersService.create(email, result);

    // return the user

    return user;
  }

  async signIn(email: string, password: string) {
    const [user] = await this.usersService.findByEmail(email);

    if (!user) {
      throw new NotFoundException('User not found');
    }

    const [salt, storedHash] = user.password.split('.');

    const hash = (await scrypt(password, salt, 32)) as Buffer;

    if (storedHash !== hash.toString('hex')) {
      throw new BadRequestException('Password is incorrect');
    }

    return user;
  }
}
