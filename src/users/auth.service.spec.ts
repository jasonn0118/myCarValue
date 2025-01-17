import { Test } from '@nestjs/testing';
import { AuthService } from './auth.service';
import { UsersService } from './users.service';
import { User } from './user.entity';
import { BadRequestException, NotFoundException } from '@nestjs/common';

describe('AuthService', () => {
  let service: AuthService;
  let fakeUsersService: Partial<UsersService>;

  beforeEach(async () => {
    // create a fake copy of the users service
    fakeUsersService = {
      findByEmail: () => Promise.resolve([]),
      create: (email: string, password: string) =>
        Promise.resolve({ id: 1, email, password } as User),
    };

    const module = await Test.createTestingModule({
      providers: [
        AuthService,
        {
          provide: UsersService,
          useValue: fakeUsersService,
        },
      ],
    }).compile();

    service = module.get(AuthService);
  });

  it('can create an instance of auth service', async () => {
    expect(service).toBeDefined();
  });

  it('creates a new user with a salted and hashed password', async () => {
    const user = await service.signUp('test@test.com', 'password');

    expect(user.password).not.toEqual('password');
    const [salt, hash] = user.password.split('.');
    expect(salt).toBeDefined();
    expect(hash).toBeDefined();
  });

  it('throws an error if a user signs up with an email that is in use', async () => {
    fakeUsersService.findByEmail = () =>
      Promise.resolve([{ id: 1, email: 'a', password: 'b' } as User]);

    await expect(service.signUp('test@test.com', 'password')).rejects.toThrow(
      BadRequestException,
    );
  });

  it('throws if signIn is called with an unused email', async () => {
    await expect(
      service.signIn('test@asdlfkj.com', 'passdflkj'),
    ).rejects.toThrow(NotFoundException);
  });

  it('throws if an invalid password is provided', async () => {
    fakeUsersService.findByEmail = () =>
      Promise.resolve([
        { email: 'test@test.com', password: 'password' } as User,
      ]);
    await expect(service.signIn('test@test.com', 'password1')).rejects.toThrow(
      BadRequestException,
    );
  });

  it('returns a user if correct password is provided', async () => {
    fakeUsersService.findByEmail = () =>
      Promise.resolve([
        {
          email: 'test@test.com',
          password:
            '9b8b0ce214d81bdf.c742aef554147a9e823de091b44797a98064b8edf4fe595ecbbdf6f22186b2b6',
        } as User,
      ]);
    const user = await service.signIn('test@test.com', 'password.salt');
    expect(user).toBeDefined();
  });
});
