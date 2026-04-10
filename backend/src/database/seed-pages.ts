import { DataSource } from 'typeorm';
import { config } from 'dotenv';
import { Page } from '../modules/content/entities/page.entity';

config();

async function seedPages() {
  // CHANGE: local DataSource instead of importing from run-seeds-standalone
  const ds = new DataSource({
    type: 'postgres',
    host: process.env.DB_HOST || 'localhost',
    port: Number(process.env.DB_PORT) || 5432,
    username: process.env.DB_USERNAME || 'postgres',
    password: process.env.DB_PASSWORD || 'postgres',
    database: process.env.DB_NAME || 'csd',
    entities: [Page],
    synchronize: false,
    ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
  });

  await ds.initialize();
  const repo = ds.getRepository(Page);

  const pages = [
    {
      slug: 'about',
      titleUa: 'Про нас',
      titleEn: 'About Us',
      contentUa: '<p>Ми – Благодійна організація «Благодійний фонд «Центр підтримки та розвитку».</p>',
      contentEn: '<p>We are a charitable organization "Centre for Support and Development".</p>',
      isPublished: true,
      sortOrder: 1,
    },
    {
      slug: 'achievements',
      titleUa: 'Досягнення',
      titleEn: 'Achievements',
      contentUa: '<p>Наші досягнення.</p>',
      contentEn: '<p>Our achievements.</p>',
      isPublished: true,
      sortOrder: 2,
    },
    {
      slug: 'contacts',
      titleUa: 'Контакти',
      titleEn: 'Contacts',
      contentUa: '<p>Контактна інформація.</p>',
      contentEn: '<p>Contact information.</p>',
      isPublished: true,
      sortOrder: 3,
    },
  ];

  for (const data of pages) {
    const exists = await repo.findOne({ where: { slug: data.slug } });
    if (!exists) {
      await repo.save(repo.create(data));
      console.log(`✅ Page "${data.slug}" created`);
    } else {
      console.log(`⏭️  Page "${data.slug}" already exists`);
    }
  }

  await ds.destroy();
}

seedPages().catch((err) => {
  console.error('❌ Seed failed:', err);
  process.exit(1);
});
