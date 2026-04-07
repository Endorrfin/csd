import { DataSource } from 'typeorm';
import { config } from 'dotenv';
import * as bcrypt from 'bcrypt';
import { User, UserRole } from '../modules/users/entities/user.entity';

config(); // load .env

const email = process.env.SUPER_ADMIN_EMAIL || 'v.krupka.csd@gmail.com';
const password = process.env.SUPER_ADMIN_PASSWORD || '#KvN312233$';

async function seed(): Promise<void> {
  const ds = new DataSource({
    type: 'postgres',
    host: process.env.DB_HOST || 'localhost',
    port: Number(process.env.DB_PORT) || 5432,
    username: process.env.DB_USERNAME || 'postgres',
    password: process.env.DB_PASSWORD || 'postgres',
    database: process.env.DB_NAME || 'csd',
    entities: [User],
    synchronize: false,
    // synchronize: true, // initial create table RDS
    ssl: process.env.NODE_ENV === 'production'
      ? { rejectUnauthorized: false }
      : false,
  });

  await ds.initialize();
  const repo = ds.getRepository(User);

  const existing = await repo.findOne({ where: { email } });

  if (existing) {
    if (existing.role === UserRole.SUPER_ADMIN) {
      console.log(`✅ User ${email} is already super_admin.`);
    } else {
      await repo.update(existing.id, { role: UserRole.SUPER_ADMIN });
      console.log(`✅ Promoted ${email} from "${existing.role}" to super_admin.`);
    }
  } else {
    const passwordHash = await bcrypt.hash(password, 10);
    const user = repo.create({
      email,
      passwordHash,
      firstName: 'Super',
      lastName: 'Admin',
      role: UserRole.SUPER_ADMIN,
    });
    await repo.save(user);
    console.log(`✅ Created super_admin: ${email} / ${password}`);
    console.log(`⚠️  Change the password after first login!`);
  }

  await ds.destroy();
}

seed().catch((err) => {
  console.error('❌ Seed failed:', err);
  process.exit(1);
});
