import { DataSource } from 'typeorm';
import { EquipmentCategory } from '../modules/equipment-catalog/entities/equipment-category.entity';
import { EquipmentItem, EquipmentUnit } from '../modules/equipment-catalog/entities/equipment-item.entity';

interface CategorySeed {
  code: string;
  nameEn: string;
  nameUa: string;
  sortOrder: number;
  items: Array<{
    ltaCode: number;
    nameEn: string;
    nameUa: string;
    unit: EquipmentUnit;
    specifications?: string;
  }>;
}

const U = EquipmentUnit;

const CATEGORIES: CategorySeed[] = [
  // ── 1. ЗВАРЮВАЛЬНЕ ОБЛАДНАННЯ ──
  {
    code: 'welding_equipment',
    nameEn: 'Welding Equipment',
    nameUa: 'Зварювальне обладнання',
    sortOrder: 1,
    items: [
      { ltaCode: 10, nameEn: 'PE pipe fusion welding machine (Ø90-Ø315mm, semi-automatic)', nameUa: 'Зварювальний апарат для ПЕ труб (Ø90-Ø315мм, напівавтоматична)', unit: U.PCS },
      { ltaCode: 20, nameEn: 'PE pipe fusion welding machine (Ø90-Ø315mm, automatic)', nameUa: 'Зварювальний апарат для ПЕ труб (Ø90-Ø315мм, автоматична)', unit: U.PCS },
      { ltaCode: 30, nameEn: 'PE pipe fusion welding machine (Ø315-Ø630mm, semi-automatic)', nameUa: 'Зварювальний апарат для ПЕ труб (Ø315-Ø630мм, напівавтоматична)', unit: U.PCS },
      { ltaCode: 40, nameEn: 'PE pipe fusion welding machine (Ø315-Ø630mm, automatic)', nameUa: 'Зварювальний апарат для ПЕ труб (Ø315-Ø630мм, автоматична)', unit: U.PCS },
      { ltaCode: 50, nameEn: 'Manual arc welding machine 380V, 500A', nameUa: 'Зварювальний апарат для ручного дугового зварювання 380В, 500А', unit: U.PCS, specifications: 'Напруга 380В; макс. струм 500А; діаметр електродів 2-7мм; кабелі від 50м' },
      { ltaCode: 60, nameEn: 'Diesel welding unit 400A', nameUa: 'Агрегат зварювальний дизельний 400А', unit: U.PCS, specifications: 'Номінальний струм 400А; діапазон 60-450А; напруга 24-48В; постійний струм' },
      { ltaCode: 70, nameEn: 'Three-phase gasoline welding generator 5kW', nameUa: 'Трифазний бензиновий зварювальний генератор 5кВт', unit: U.PCS, specifications: 'Потужність: 5кВт (3 фази) / 3кВт (1 фаза); струм 40-220А; AVR' },
    ],
  },

  // ── 2. ЗВАРЮВАЛЬНІ МАТЕРІАЛИ ──
  {
    code: 'welding_consumables',
    nameEn: 'Welding Consumables',
    nameUa: 'Зварювальні матеріали',
    sortOrder: 2,
    items: [
      { ltaCode: 80, nameEn: 'Arc-welding electrodes ANO-21-3.0mm', nameUa: 'Електрод АНО-21-3,0мм ДСТУ ISO 2560', unit: U.KG },
      { ltaCode: 90, nameEn: 'Arc-welding electrodes ANO-21-4.0mm', nameUa: 'Електрод АНО-21-4,0мм ДСТУ ISO 2560', unit: U.KG },
      { ltaCode: 100, nameEn: 'Arc-welding electrodes ANO-21-5.0mm', nameUa: 'Електрод АНО-21-5,0мм ДСТУ ISO 2560', unit: U.KG },
    ],
  },

  // ── 3. ЕЛЕКТРОСТАНЦІЇ ──
  {
    code: 'power_generators',
    nameEn: 'Portable Power Generators',
    nameUa: 'Пересувні електростанції',
    sortOrder: 3,
    items: [
      { ltaCode: 110, nameEn: 'Portable power plant 5-5.5kW, 220V', nameUa: 'Пересувна електростанція 5-5.5кВт, 220В', unit: U.PCS },
      { ltaCode: 120, nameEn: 'Portable power plant 11-12kW, 380V', nameUa: 'Пересувна електростанція 11-12кВт, 380В', unit: U.PCS },
      { ltaCode: 130, nameEn: 'Portable power plant 19-21kW, 380V', nameUa: 'Пересувна електростанція 19-21кВт, 380В', unit: U.PCS },
    ],
  },

  // ── 4. НАСОСНЕ ОБЛАДНАННЯ ──
  {
    code: 'pumping_equipment',
    nameEn: 'Pumping Equipment',
    nameUa: 'Насосне обладнання',
    sortOrder: 4,
    items: [
      { ltaCode: 140, nameEn: 'Mobile diesel pump 100 m³/h, Ø100mm', nameUa: 'Пересувний дизельний насос 100 м³/год, Ø100мм, 12кВт', unit: U.PCS },
      { ltaCode: 150, nameEn: 'Mobile diesel pump 300-350 m³/h, Ø200mm', nameUa: 'Пересувний дизельний насос 300-350 м³/год, Ø200мм, 40кВт', unit: U.PCS },
    ],
  },

  // ── 5. КОМПРЕСІЙНІ ФІТИНГИ ──
  {
    code: 'compression_fittings',
    nameEn: 'Compression Fittings',
    nameUa: 'Компресійні фітинги',
    sortOrder: 5,
    items: [
      { ltaCode: 160, nameEn: 'Compression elbow 90°, 32mm', nameUa: 'Відвід 90° компресійний 32мм', unit: U.PCS },
      { ltaCode: 170, nameEn: 'Compression elbow 90°, 40mm', nameUa: 'Відвід 90° компресійний 40мм', unit: U.PCS },
      { ltaCode: 180, nameEn: 'Compression elbow 90°, 50mm', nameUa: 'Відвід 90° компресійний 50мм', unit: U.PCS },
      { ltaCode: 190, nameEn: 'Coupling 32mm', nameUa: 'Муфта з\'єднувальна компресійна 32мм', unit: U.PCS },
      { ltaCode: 200, nameEn: 'Coupling 40mm', nameUa: 'Муфта з\'єднувальна компресійна 40мм', unit: U.PCS },
      { ltaCode: 210, nameEn: 'Coupling 50mm', nameUa: 'Муфта з\'єднувальна компресійна 50мм', unit: U.PCS },
      { ltaCode: 220, nameEn: 'T-coupling 32mm', nameUa: 'Трійник компресійний 32мм', unit: U.PCS },
      { ltaCode: 230, nameEn: 'T-coupling 40mm', nameUa: 'Трійник компресійний 40мм', unit: U.PCS },
      { ltaCode: 240, nameEn: 'T-coupling 50mm', nameUa: 'Трійник компресійний 50мм', unit: U.PCS },
      { ltaCode: 250, nameEn: 'Compression coupling 32×1¼" male thread', nameUa: 'Муфта компресійна 32×1¼" з зовнішньою різьбою', unit: U.PCS },
      { ltaCode: 260, nameEn: 'Compression coupling 32×1¼" female thread', nameUa: 'Муфта компресійна 32×1¼" з внутрішньою різьбою', unit: U.PCS },
      { ltaCode: 270, nameEn: 'Compression coupling 32×1" female thread', nameUa: 'Муфта компресійна 32×1" з внутрішньою різьбою', unit: U.PCS },
      { ltaCode: 280, nameEn: 'Compression coupling 32×1" male thread', nameUa: 'Муфта компресійна 32×1" з зовнішньою різьбою', unit: U.PCS },
      { ltaCode: 290, nameEn: 'Compression coupling 40×1¼" male thread', nameUa: 'Муфта компресійна 40×1¼" з зовнішньою різьбою', unit: U.PCS },
      { ltaCode: 300, nameEn: 'Compression coupling 40×1¼" female thread', nameUa: 'Муфта компресійна 40×1¼" з внутрішньою різьбою', unit: U.PCS },
      { ltaCode: 310, nameEn: 'Compression coupling 40×1½" male thread', nameUa: 'Муфта компресійна 40×1½" з зовнішньою різьбою', unit: U.PCS },
      { ltaCode: 320, nameEn: 'Compression coupling 40×1½" female thread', nameUa: 'Муфта компресійна 40×1½" з внутрішньою різьбою', unit: U.PCS },
      { ltaCode: 330, nameEn: 'Compression coupling 50×2" female thread', nameUa: 'Муфта компресійна 50×2" з внутрішньою різьбою', unit: U.PCS },
      { ltaCode: 340, nameEn: 'Compression coupling 50×2" male thread', nameUa: 'Муфта компресійна 50×2" з зовнішньою різьбою', unit: U.PCS },
      { ltaCode: 1480, nameEn: 'Reducing coupling 90×63', nameUa: 'Муфта редукційна компресійна 90×63', unit: U.PCS },
      { ltaCode: 1490, nameEn: 'Reducing coupling 110×90', nameUa: 'Муфта редукційна компресійна 110×90', unit: U.PCS },
    ],
  },

  // ── 6. СІДЛОВІ ТРІЙНИКИ КОМПРЕСІЙНІ ──
  {
    code: 'saddle_tees_compression',
    nameEn: 'Compression Saddle Tees',
    nameUa: 'Сідлові трійники компресійні',
    sortOrder: 6,
    items: [
      { ltaCode: 350, nameEn: 'Saddle tee compression 63×1"', nameUa: 'Сідловий трійник компресійний 63×1" з внутрішньою різьбою', unit: U.PCS },
      { ltaCode: 360, nameEn: 'Saddle tee 63×½"', nameUa: 'Сідловий трійник компресійний 63×½" з внутрішньою різьбою', unit: U.PCS },
      { ltaCode: 370, nameEn: 'Saddle tee 63×¾"', nameUa: 'Сідловий трійник компресійний 63×¾" з внутрішньою різьбою', unit: U.PCS },
      { ltaCode: 380, nameEn: 'Saddle tee 110×¾"', nameUa: 'Сідловий трійник компресійний 110×¾" з внутрішньою різьбою', unit: U.PCS },
      { ltaCode: 390, nameEn: 'Saddle tee 110×1"', nameUa: 'Сідловий трійник компресійний 110×1" з внутрішньою різьбою', unit: U.PCS },
      { ltaCode: 400, nameEn: 'Saddle tee 110×2"', nameUa: 'Сідловий трійник компресійний 110×2" з внутрішньою різьбою', unit: U.PCS },
      { ltaCode: 410, nameEn: 'Saddle tee 110×1¼"', nameUa: 'Сідловий трійник компресійний 110×1¼" з внутрішньою різьбою', unit: U.PCS },
      { ltaCode: 420, nameEn: 'Saddle tee 90×1"', nameUa: 'Сідловий трійник компресійний 90×1" з внутрішньою різьбою', unit: U.PCS },
      { ltaCode: 430, nameEn: 'Saddle tee 90×½"', nameUa: 'Сідловий трійник компресійний 90×½" з внутрішньою різьбою', unit: U.PCS },
      { ltaCode: 440, nameEn: 'Saddle tee 90×¾"', nameUa: 'Сідловий трійник компресійний 90×¾" з внутрішньою різьбою', unit: U.PCS },
    ],
  },

  // ── 7. ФЛАНЦЕВІ З'ЄДНАННЯ КОМПРЕСІЙНІ ──
  {
    code: 'flange_connections_compression',
    nameEn: 'Compression Flange Connections',
    nameUa: 'Фланцеві з\'єднання компресійні',
    sortOrder: 7,
    items: [
      { ltaCode: 450, nameEn: 'Flange connection 63×2"', nameUa: 'Фланцеве з\'єднання компресійне 63×2"', unit: U.PCS },
      { ltaCode: 460, nameEn: 'Flange connection 75×3"', nameUa: 'Фланцеве з\'єднання компресійне 75×3"', unit: U.PCS },
      { ltaCode: 470, nameEn: 'Flange connection 90×3"', nameUa: 'Фланцеве з\'єднання компресійне 90×3"', unit: U.PCS },
      { ltaCode: 480, nameEn: 'Flange connection 110×4"', nameUa: 'Фланцеве з\'єднання компресійне 110×4"', unit: U.PCS },
    ],
  },

  // ── 8. ЕЛЕКТРОЗВАРНІ ФІТИНГИ ──
  {
    code: 'electrowelded_fittings',
    nameEn: 'Electrowelded Fittings',
    nameUa: 'Електрозварні фітинги',
    sortOrder: 8,
    items: [
      { ltaCode: 490, nameEn: 'Electrowelded elbow 90°, 63mm PE100 SDR11', nameUa: 'Відвід 90° електрозварний 63 ПE100 SDR11', unit: U.PCS },
      { ltaCode: 500, nameEn: 'Electrowelded elbow 45°, 63mm PE100 SDR11', nameUa: 'Відвід 45° електрозварний 63 ПE100 SDR11', unit: U.PCS },
      { ltaCode: 510, nameEn: 'Electrowelded elbow 90°, 75mm PE100 SDR11', nameUa: 'Відвід 90° електрозварний 75 ПE100 SDR11', unit: U.PCS },
      { ltaCode: 520, nameEn: 'Electrowelded elbow 45°, 75mm PE100 SDR11', nameUa: 'Відвід 45° електрозварний 75 ПE100 SDR11', unit: U.PCS },
      { ltaCode: 530, nameEn: 'Electrowelded elbow 45°, 90mm PE100 SDR11', nameUa: 'Відвід 45° електрозварний 90 ПE100 SDR11', unit: U.PCS },
      { ltaCode: 540, nameEn: 'Electrowelded elbow 90°, 90mm PE100 SDR11', nameUa: 'Відвід 90° електрозварний 90 ПE100 SDR11', unit: U.PCS },
      { ltaCode: 550, nameEn: 'Branch saddle tee electrowelded 110×63 PE100 SDR11', nameUa: 'Сідловий трійник електрозварний 110×63 ПE100 SDR11', unit: U.PCS },
      { ltaCode: 560, nameEn: 'Branch saddle tee electrowelded 90×63 PE100 SDR11', nameUa: 'Сідловий трійник електрозварний 90×63 ПE100 SDR11', unit: U.PCS },
      { ltaCode: 570, nameEn: 'Branch saddle tee electrowelded 63×63 PE100 SDR11', nameUa: 'Сідловий трійник електрозварний 63×63 ПE100 SDR11', unit: U.PCS },
      { ltaCode: 580, nameEn: 'Branch saddle tee electrowelded 160×63 PE100 SDR11', nameUa: 'Сідловий трійник електрозварний 160×63 ПE100 SDR11', unit: U.PCS },
      { ltaCode: 590, nameEn: 'Electrowelded tee 63 PE100 SDR11', nameUa: 'Трійник електрозварний 63 ПE100 SDR11', unit: U.PCS },
      { ltaCode: 600, nameEn: 'Electrowelded tee 75 PE100 SDR11', nameUa: 'Трійник електрозварний 75 ПE100 SDR11', unit: U.PCS },
      { ltaCode: 610, nameEn: 'Electrowelded tee 90 PE100 SDR11', nameUa: 'Трійник електрозварний 90 ПE100 SDR11', unit: U.PCS },
      { ltaCode: 620, nameEn: 'Electrowelded coupling 63 PE100 SDR11', nameUa: 'Муфта електрозварна 63 ПE100 SDR11', unit: U.PCS },
      { ltaCode: 630, nameEn: 'Electrowelded coupling 75 PE100 SDR11', nameUa: 'Муфта електрозварна 75 ПE100 SDR11', unit: U.PCS },
      { ltaCode: 640, nameEn: 'Electrowelded coupling 90 PE100 SDR11', nameUa: 'Муфта електрозварна 90 ПE100 SDR11', unit: U.PCS },
      { ltaCode: 650, nameEn: 'Electrowelded coupling 110 PE100 SDR11', nameUa: 'Муфта електрозварна 110 ПE100 SDR11', unit: U.PCS },
      { ltaCode: 660, nameEn: 'Electrowelded coupling 160 PE100 SDR11', nameUa: 'Муфта електрозварна 160 ПE100 SDR11', unit: U.PCS },
      { ltaCode: 670, nameEn: 'Electrowelded coupling 200 PE100 SDR11', nameUa: 'Муфта електрозварна 200 ПE100 SDR11', unit: U.PCS },
      { ltaCode: 680, nameEn: 'Electrowelded coupling 225 PE100 SDR11', nameUa: 'Муфта електрозварна 225 ПE100 SDR11', unit: U.PCS },
      { ltaCode: 690, nameEn: 'Electrowelded coupling 250 PE100 SDR11', nameUa: 'Муфта електрозварна 250 ПE100 SDR11', unit: U.PCS },
      { ltaCode: 700, nameEn: 'Electrowelded coupling 315 PE100 SDR11', nameUa: 'Муфта електрозварна 315 ПE100 SDR11', unit: U.PCS },
      { ltaCode: 710, nameEn: 'Electrowelded coupling 400 PE100 SDR11', nameUa: 'Муфта електрозварна 400 ПE100 SDR11', unit: U.PCS },
      { ltaCode: 720, nameEn: 'Electrowelded coupling 500 PE100 SDR17', nameUa: 'Муфта електрозварна 500 ПE100 SDR17', unit: U.PCS },
      { ltaCode: 730, nameEn: 'Electrowelded coupling 630 PE100 SDR17', nameUa: 'Муфта електрозварна 630 ПE100 SDR17', unit: U.PCS },
    ],
  },

  // ── 9. ЛИТІ ТА ЗВАРНІ ФІТИНГИ ──
  {
    code: 'cast_welded_fittings',
    nameEn: 'Cast & Welded Fittings',
    nameUa: 'Литі та зварні фітинги',
    sortOrder: 9,
    items: [
      { ltaCode: 740, nameEn: 'Elbow cast 90° PE100 SDR17 110', nameUa: 'Відвід 90° литий ПE100 SDR17 110', unit: U.PCS },
      { ltaCode: 750, nameEn: 'Elbow cast 90° PE100 SDR17 160', nameUa: 'Відвід 90° литий ПE100 SDR17 160', unit: U.PCS },
      { ltaCode: 760, nameEn: 'Elbow cast 90° PE100 SDR17 200', nameUa: 'Відвід 90° литий ПE100 SDR17 200', unit: U.PCS },
      { ltaCode: 770, nameEn: 'Elbow cast 90° PE100 SDR17 250', nameUa: 'Відвід 90° литий ПE100 SDR17 250', unit: U.PCS },
      { ltaCode: 780, nameEn: 'Elbow cast 90° PE100 SDR17 315', nameUa: 'Відвід 90° литий ПE100 SDR17 315', unit: U.PCS },
      { ltaCode: 790, nameEn: 'Elbow welded 90° PE100 SDR17 400', nameUa: 'Відвід 90° зварний ПE100 SDR17 400', unit: U.PCS },
      { ltaCode: 800, nameEn: 'Elbow welded 90° PE100 SDR17 500', nameUa: 'Відвід 90° зварний ПE100 SDR17 500', unit: U.PCS },
      { ltaCode: 810, nameEn: 'Elbow welded 90° PE100 SDR17 630', nameUa: 'Відвід 90° зварний ПE100 SDR17 630', unit: U.PCS },
      { ltaCode: 820, nameEn: 'Elbow cast 45° PE100 SDR17 110', nameUa: 'Відвід 45° литий ПE100 SDR17 110', unit: U.PCS },
      { ltaCode: 830, nameEn: 'Elbow cast 45° PE100 SDR17 160', nameUa: 'Відвід 45° литий ПE100 SDR17 160', unit: U.PCS },
      { ltaCode: 840, nameEn: 'Elbow cast 45° PE100 SDR17 200', nameUa: 'Відвід 45° литий ПE100 SDR17 200', unit: U.PCS },
      { ltaCode: 850, nameEn: 'Elbow cast 45° PE100 SDR17 225', nameUa: 'Відвід 45° литий ПE100 SDR17 225', unit: U.PCS },
      { ltaCode: 860, nameEn: 'Elbow cast 45° PE100 SDR17 250', nameUa: 'Відвід 45° литий ПE100 SDR17 250', unit: U.PCS },
      { ltaCode: 870, nameEn: 'Elbow cast 45° PE100 SDR17 315', nameUa: 'Відвід 45° литий ПE100 SDR17 315', unit: U.PCS },
      { ltaCode: 880, nameEn: 'Elbow welded 45° PE100 SDR17 400', nameUa: 'Відвід 45° зварний ПE100 SDR17 400', unit: U.PCS },
      { ltaCode: 890, nameEn: 'Elbow welded 45° PE100 SDR17 500', nameUa: 'Відвід 45° зварний ПE100 SDR17 500', unit: U.PCS },
      { ltaCode: 900, nameEn: 'Elbow welded 45° PE100 SDR17 630', nameUa: 'Відвід 45° зварний ПE100 SDR17 630', unit: U.PCS },
      { ltaCode: 910, nameEn: 'Tee cast 90° PE100 SDR11 110', nameUa: 'Трійник 90° литий ПE100 SDR11 110', unit: U.PCS },
      { ltaCode: 920, nameEn: 'Tee cast 90° PE100 SDR17 160', nameUa: 'Трійник 90° литий ПE100 SDR17 160', unit: U.PCS },
      { ltaCode: 930, nameEn: 'Tee cast 90° PE100 SDR17 200', nameUa: 'Трійник 90° литий ПE100 SDR17 200', unit: U.PCS },
      { ltaCode: 940, nameEn: 'Tee cast 90° PE100 SDR17 225', nameUa: 'Трійник 90° литий ПE100 SDR17 225', unit: U.PCS },
      { ltaCode: 950, nameEn: 'Tee cast 90° PE100 SDR17 250', nameUa: 'Трійник 90° литий ПE100 SDR17 250', unit: U.PCS },
      { ltaCode: 960, nameEn: 'Tee cast 90° PE100 SDR17 315', nameUa: 'Трійник 90° литий ПE100 SDR17 315', unit: U.PCS },
      { ltaCode: 970, nameEn: 'Tee welded 90° PE100 SDR17 400', nameUa: 'Трійник 90° зварний ПE100 SDR17 400', unit: U.PCS },
      { ltaCode: 980, nameEn: 'Tee welded 90° PE100 SDR17 500', nameUa: 'Трійник 90° зварний ПE100 SDR17 500', unit: U.PCS },
      { ltaCode: 990, nameEn: 'Tee welded 90° PE100 SDR17 630', nameUa: 'Трійник 90° зварний ПE100 SDR17 630', unit: U.PCS },
    ],
  },

  // ── 10. ВТУЛКИ ПІД ФЛАНЕЦЬ ──
  {
    code: 'pe_stub_flanges',
    nameEn: 'PE Stub Flanges',
    nameUa: 'Втулки під фланець ПE',
    sortOrder: 10,
    items: [
      { ltaCode: 1000, nameEn: 'PE stub flange 63mm', nameUa: 'Втулка під фланець ПE100 SDR17 63 подовжена', unit: U.PCS },
      { ltaCode: 1010, nameEn: 'PE stub flange 75mm', nameUa: 'Втулка під фланець ПE100 SDR17 75 подовжена', unit: U.PCS },
      { ltaCode: 1020, nameEn: 'PE stub flange 90mm', nameUa: 'Втулка під фланець ПE100 SDR17 90 подовжена', unit: U.PCS },
      { ltaCode: 1030, nameEn: 'PE stub flange 110mm', nameUa: 'Втулка під фланець ПE100 SDR17 110 подовжена', unit: U.PCS },
      { ltaCode: 1040, nameEn: 'PE stub flange 160mm', nameUa: 'Втулка під фланець ПE100 SDR17 160 подовжена', unit: U.PCS },
      { ltaCode: 1050, nameEn: 'PE stub flange 200mm', nameUa: 'Втулка під фланець ПE100 SDR17 200 подовжена', unit: U.PCS },
      { ltaCode: 1060, nameEn: 'PE stub flange 225mm', nameUa: 'Втулка під фланець ПE100 SDR17 225 подовжена', unit: U.PCS },
      { ltaCode: 1070, nameEn: 'PE stub flange 250mm', nameUa: 'Втулка під фланець ПE100 SDR17 250 подовжена', unit: U.PCS },
      { ltaCode: 1080, nameEn: 'PE stub flange 315mm', nameUa: 'Втулка під фланець ПE100 SDR17 315 подовжена', unit: U.PCS },
      { ltaCode: 1090, nameEn: 'PE stub flange 400mm', nameUa: 'Втулка під фланець ПE100 SDR17 400 подовжена', unit: U.PCS },
      { ltaCode: 1100, nameEn: 'PE stub flange 500mm', nameUa: 'Втулка під фланець ПE100 SDR17 500 подовжена', unit: U.PCS },
      { ltaCode: 1110, nameEn: 'PE stub flange 630mm', nameUa: 'Втулка під фланець ПE100 SDR17 630 подовжена', unit: U.PCS },
    ],
  },

  // ── 11. ФЛАНЦІ СТАЛЕВІ ПІД ПE ВТУЛКУ ──
  {
    code: 'steel_flanges_pe',
    nameEn: 'Steel Flanges for PE Bushing',
    nameUa: 'Фланці сталеві під ПE втулку',
    sortOrder: 11,
    items: [
      { ltaCode: 1120, nameEn: 'Steel flange for PE bushing 63 PN10', nameUa: 'Фланець сталевий під ПЕ втулку 63 PN10', unit: U.PCS },
      { ltaCode: 1130, nameEn: 'Steel flange for PE bushing 75 PN10', nameUa: 'Фланець сталевий під ПЕ втулку 75 PN10', unit: U.PCS },
      { ltaCode: 1140, nameEn: 'Steel flange for PE bushing 90 PN10', nameUa: 'Фланець сталевий під ПЕ втулку 90 PN10', unit: U.PCS },
      { ltaCode: 1150, nameEn: 'Steel flange for PE bushing 110 PN10', nameUa: 'Фланець сталевий під ПЕ втулку 110 PN10', unit: U.PCS },
      { ltaCode: 1160, nameEn: 'Steel flange for PE bushing 160 PN10', nameUa: 'Фланець сталевий під ПЕ втулку 160 PN10', unit: U.PCS },
      { ltaCode: 1170, nameEn: 'Steel flange for PE bushing 200/225 PN10', nameUa: 'Фланець сталевий під ПЕ втулку 200/225 PN10', unit: U.PCS },
      { ltaCode: 1180, nameEn: 'Steel flange for PE bushing 250 PN10', nameUa: 'Фланець сталевий під ПЕ втулку 250 PN10', unit: U.PCS },
      { ltaCode: 1190, nameEn: 'Steel flange for PE bushing 315 PN10', nameUa: 'Фланець сталевий під ПЕ втулку 315 PN10', unit: U.PCS },
      { ltaCode: 1200, nameEn: 'Steel flange for PE bushing 400 PN10', nameUa: 'Фланець сталевий під ПЕ втулку 400 PN10', unit: U.PCS },
      { ltaCode: 1210, nameEn: 'Steel flange for PE bushing 500 PN10', nameUa: 'Фланець сталевий під ПЕ втулку 500 PN10', unit: U.PCS },
      { ltaCode: 1220, nameEn: 'Steel flange for PE bushing 630 PN10', nameUa: 'Фланець сталевий під ПЕ втулку 630 PN10', unit: U.PCS },
    ],
  },

  // ── 12. ФЛАНЦЕВІ АДАПТЕРИ ТА УНІВЕРСАЛЬНІ МУФТИ ──
  {
    code: 'flange_adapters_universal',
    nameEn: 'Universal Flange Adapters & Couplings',
    nameUa: 'Фланцеві адаптери та універсальні муфти',
    sortOrder: 12,
    items: [
      { ltaCode: 1230, nameEn: 'Universal flange adapter DN100 (109-128) PN10', nameUa: 'Фланцевий адаптер універсальний DN100 (109-128) PN10', unit: U.PCS },
      { ltaCode: 1240, nameEn: 'Universal flange adapter DN150 (159-182) PN10', nameUa: 'Фланцевий адаптер універсальний DN150 (159-182) PN10', unit: U.PCS },
      { ltaCode: 1250, nameEn: 'Universal flange adapter DN200 (218-235) PN10', nameUa: 'Фланцевий адаптер універсальний DN200 (218-235) PN10', unit: U.PCS },
      { ltaCode: 1260, nameEn: 'Universal flange adapter DN250 (272-289) PN10', nameUa: 'Фланцевий адаптер універсальний DN250 (272-289) PN10', unit: U.PCS },
      { ltaCode: 1270, nameEn: 'Universal flange adapter DN300 (315-332) PN10', nameUa: 'Фланцевий адаптер універсальний DN300 (315-332) PN10', unit: U.PCS },
      { ltaCode: 1280, nameEn: 'Universal coupling DN100 (109-128) PN16', nameUa: 'Муфта з\'єднувальна універсальна DN100 (109-128) PN16', unit: U.PCS },
      { ltaCode: 1290, nameEn: 'Universal coupling DN150 (159-182) PN16', nameUa: 'Муфта з\'єднувальна універсальна DN150 (159-182) PN16', unit: U.PCS },
      { ltaCode: 1300, nameEn: 'Universal coupling DN200 (218-235) PN16', nameUa: 'Муфта з\'єднувальна універсальна DN200 (218-235) PN16', unit: U.PCS },
      { ltaCode: 1310, nameEn: 'Universal coupling DN300 (315-332) PN16', nameUa: 'Муфта з\'єднувальна універсальна DN300 (315-332) PN16', unit: U.PCS },
    ],
  },

  // ── 13. ПРОКЛАДКИ ТА КРІПЛЕННЯ ──
  {
    code: 'gaskets_fasteners',
    nameEn: 'Gaskets & Fasteners',
    nameUa: 'Прокладки та кріплення',
    sortOrder: 13,
    items: [
      { ltaCode: 1320, nameEn: 'Flange gasket DN65', nameUa: 'Прокладка фланцева DN65', unit: U.PCS },
      { ltaCode: 1330, nameEn: 'Flange gasket DN80', nameUa: 'Прокладка фланцева DN80', unit: U.PCS },
      { ltaCode: 1340, nameEn: 'Flange gasket DN100', nameUa: 'Прокладка фланцева DN100', unit: U.PCS },
      { ltaCode: 1350, nameEn: 'Flange gasket DN150', nameUa: 'Прокладка фланцева DN150', unit: U.PCS },
      { ltaCode: 1360, nameEn: 'Flange gasket DN200', nameUa: 'Прокладка фланцева DN200', unit: U.PCS },
      { ltaCode: 1370, nameEn: 'Flange gasket DN250', nameUa: 'Прокладка фланцева DN250', unit: U.PCS },
      { ltaCode: 1380, nameEn: 'Flange gasket DN300', nameUa: 'Прокладка фланцева DN300', unit: U.PCS },
      { ltaCode: 1390, nameEn: 'Bolt set M16×100 (galvanized)', nameUa: 'Комплект болт, гайка, шайби оцинков. М16×100', unit: U.PCS },
      { ltaCode: 1400, nameEn: 'Bolt set M20×140 (galvanized)', nameUa: 'Комплект болт, гайка, шайби оцинков. М20×140', unit: U.PCS },
      { ltaCode: 1410, nameEn: 'Bolt set M24×150 (galvanized)', nameUa: 'Комплект болт, гайка, шайби оцинков. М24×150', unit: U.PCS },
    ],
  },

  // ── 14. ХОМУТИ РЕМОНТНІ ──
  {
    code: 'repair_collars',
    nameEn: 'Repair Collars',
    nameUa: 'Хомути ремонтні',
    sortOrder: 14,
    items: [
      { ltaCode: 1420, nameEn: 'Repair collar DN114 L=200mm PN16', nameUa: 'Хомут ремонтний DN114 L=200мм PN16', unit: U.PCS },
      { ltaCode: 1430, nameEn: 'Repair collar DN159 L=200mm PN16', nameUa: 'Хомут ремонтний DN159 L=200мм PN16', unit: U.PCS },
      { ltaCode: 1440, nameEn: 'Repair collar DN219 L=200mm PN16', nameUa: 'Хомут ремонтний DN219 L=200мм PN16', unit: U.PCS },
      { ltaCode: 1450, nameEn: 'Repair collar DN273 L=300mm PN16', nameUa: 'Хомут ремонтний DN273 L=300мм PN16', unit: U.PCS },
      { ltaCode: 1460, nameEn: 'Repair collar DN325 L=300mm PN16', nameUa: 'Хомут ремонтний DN325 L=300мм PN16', unit: U.PCS },
      { ltaCode: 1470, nameEn: 'Repair collar DN426 L=300mm PN16', nameUa: 'Хомут ремонтний DN426 L=300мм PN16', unit: U.PCS },
    ],
  },

  // ── 15. ТРУБИ ПЕ (ПИТНА ВОДА) ──
  {
    code: 'pe_pipes',
    nameEn: 'PE Pipes (Drinking Water)',
    nameUa: 'Труби ПЕ (питна вода)',
    sortOrder: 15,
    items: [
      { ltaCode: 1500, nameEn: 'PE100 SDR17 pipe D32, coils 100m', nameUa: 'Труба ПE100 SDR17-32 бух. питна, ДСТУ EN 12201-2', unit: U.METERS },
      { ltaCode: 1510, nameEn: 'PE100 SDR17 pipe D40, coils 100m', nameUa: 'Труба ПE100 SDR17-40 бух. питна, ДСТУ EN 12201-2', unit: U.METERS },
      { ltaCode: 1520, nameEn: 'PE100 SDR17 pipe D50, coils 100m', nameUa: 'Труба ПE100 SDR17-50 бух. питна, ДСТУ EN 12201-2', unit: U.METERS },
      { ltaCode: 1530, nameEn: 'PE100 SDR17 pipe D63, coils 100m', nameUa: 'Труба ПE100 SDR17-63 бух. питна, ДСТУ EN 12201-2', unit: U.METERS },
      { ltaCode: 1540, nameEn: 'PE100 SDR17 pipe D75, coils 100m', nameUa: 'Труба ПE100 SDR17-75 бух. питна, ДСТУ EN 12201-2', unit: U.METERS },
      { ltaCode: 1550, nameEn: 'PE100 SDR17 pipe D90, coils 100m', nameUa: 'Труба ПE100 SDR17-90 бух. питна, ДСТУ EN 12201-2', unit: U.METERS },
      { ltaCode: 1560, nameEn: 'PE100 SDR17 pipe D110, coils 100m', nameUa: 'Труба ПE100 SDR17-110 бух. питна, ДСТУ EN 12201-2', unit: U.METERS },
      { ltaCode: 1570, nameEn: 'PE100 SDR17 pipe D160, strait 12m', nameUa: 'Труба ПE100 SDR17-160 відр. питна, ДСТУ EN 12201-2', unit: U.METERS },
      { ltaCode: 1580, nameEn: 'PE100 SDR17 pipe D200, strait 12m', nameUa: 'Труба ПE100 SDR17-200 відр. питна, ДСТУ EN 12201-2', unit: U.METERS },
      { ltaCode: 1590, nameEn: 'PE100 SDR17 pipe D225, strait 12m', nameUa: 'Труба ПE100 SDR17-225 відр. питна, ДСТУ EN 12201-2', unit: U.METERS },
      { ltaCode: 1600, nameEn: 'PE100 SDR17 pipe D250, strait 12m', nameUa: 'Труба ПE100 SDR17-250 відр. питна, ДСТУ EN 12201-2', unit: U.METERS },
      { ltaCode: 1610, nameEn: 'PE100 SDR17 pipe D315, strait 12m', nameUa: 'Труба ПE100 SDR17-315 відр. питна, ДСТУ EN 12201-2', unit: U.METERS },
      { ltaCode: 1620, nameEn: 'PE100 SDR17 pipe D355, strait 12m', nameUa: 'Труба ПE100 SDR17-355 відр. питна, ДСТУ EN 12201-2', unit: U.METERS },
      { ltaCode: 1630, nameEn: 'PE100 SDR26 pipe D355, strait 12m', nameUa: 'Труба ПE100 SDR26-355 відр. питна, ДСТУ EN 12201-2', unit: U.METERS },
      { ltaCode: 1640, nameEn: 'PE100 SDR17 pipe D400, strait 12m', nameUa: 'Труба ПE100 SDR17-400 відр. питна, ДСТУ EN 12201-2', unit: U.METERS },
      { ltaCode: 1650, nameEn: 'PE100 SDR17 pipe D500, strait 12m', nameUa: 'Труба ПE100 SDR17-500 відр. питна, ДСТУ EN 12201-2', unit: U.METERS },
      { ltaCode: 1660, nameEn: 'PE100 SDR17 pipe D630, strait 12m', nameUa: 'Труба ПE100 SDR17-630 відр. питна, ДСТУ EN 12201-2', unit: U.METERS },
    ],
  },

  // ── 16. ГОФРОВАНІ ТРУБИ ТА УЩІЛЬНЕННЯ ──
  {
    code: 'corrugated_pipes',
    nameEn: 'Corrugated Pipes & Sealing Rings',
    nameUa: 'Гофровані труби та ущільнювальні кільця',
    sortOrder: 16,
    items: [
      { ltaCode: 1670, nameEn: 'Corrugated pipe D110/93mm, 6m, SN8', nameUa: 'Труба двостінна гофрована D110/93мм, SN8', unit: U.METERS },
      { ltaCode: 1680, nameEn: 'Sealing ring OD 110mm', nameUa: 'Ущільнювальне кільце для труб Ø110мм', unit: U.PCS },
      { ltaCode: 1690, nameEn: 'Corrugated pipe D160/138mm, 6m, SN8', nameUa: 'Труба двостінна гофрована D160/138мм, SN8', unit: U.METERS },
      { ltaCode: 1700, nameEn: 'Sealing ring OD 160mm', nameUa: 'Ущільнювальне кільце для труб Ø160мм', unit: U.PCS },
      { ltaCode: 1710, nameEn: 'Corrugated pipe D200/176mm, 6m, SN8', nameUa: 'Труба двостінна гофрована D200/176мм, SN8', unit: U.METERS },
      { ltaCode: 1720, nameEn: 'Sealing ring OD 200mm', nameUa: 'Ущільнювальне кільце для труб Ø200мм', unit: U.PCS },
      { ltaCode: 1730, nameEn: 'Corrugated pipe D250/216mm, 6m, SN8', nameUa: 'Труба двостінна гофрована D250/216мм, SN8', unit: U.METERS },
      { ltaCode: 1740, nameEn: 'Sealing ring OD 250mm', nameUa: 'Ущільнювальне кільце для труб Ø250мм', unit: U.PCS },
      { ltaCode: 1750, nameEn: 'Corrugated pipe D300/339mm, 6m, SN8', nameUa: 'Труба двостінна гофрована D300/339мм, SN8', unit: U.METERS },
      { ltaCode: 1760, nameEn: 'Sealing ring OD 300mm', nameUa: 'Ущільнювальне кільце для труб Ø300мм', unit: U.PCS },
      { ltaCode: 1770, nameEn: 'Corrugated pipe D400/452mm, 6m, SN8', nameUa: 'Труба двостінна гофрована D400/452мм, SN8', unit: U.METERS },
      { ltaCode: 1780, nameEn: 'Sealing ring OD 400mm', nameUa: 'Ущільнювальне кільце для труб Ø400мм', unit: U.PCS },
      { ltaCode: 1790, nameEn: 'Corrugated pipe D500/566mm, 6m, SN8', nameUa: 'Труба двостінна гофрована D500/566мм, SN8', unit: U.METERS },
      { ltaCode: 1800, nameEn: 'Sealing ring OD 500mm', nameUa: 'Ущільнювальне кільце для труб Ø500мм', unit: U.PCS },
      { ltaCode: 1810, nameEn: 'Corrugated pipe D600/679mm, 6m, SN8', nameUa: 'Труба двостінна гофрована D600/679мм, SN8', unit: U.METERS },
      { ltaCode: 1820, nameEn: 'Sealing ring OD 600mm', nameUa: 'Ущільнювальне кільце для труб Ø600мм', unit: U.PCS },
    ],
  },

  // ── 17. ЗАСУВКИ ДЛЯ ВОДОПОСТАЧАННЯ ──
  {
    code: 'gate_valves_water_supply',
    nameEn: 'Gate Valves (Water Supply)',
    nameUa: 'Засувки для водопостачання',
    sortOrder: 17,
    items: [
      { ltaCode: 1830, nameEn: 'Cast-iron gate valve DN50 PN10', nameUa: 'Засувка чавунна фланцева DN50 PN10 зі штурвалом', unit: U.PCS },
      { ltaCode: 1840, nameEn: 'Cast-iron gate valve DN65 PN10', nameUa: 'Засувка чавунна фланцева DN65 PN10 зі штурвалом', unit: U.PCS },
      { ltaCode: 1850, nameEn: 'Cast-iron gate valve DN80 PN10', nameUa: 'Засувка чавунна фланцева DN80 PN10 зі штурвалом', unit: U.PCS },
      { ltaCode: 1860, nameEn: 'Cast-iron gate valve DN100 PN10', nameUa: 'Засувка чавунна фланцева DN100 PN10 зі штурвалом', unit: U.PCS },
      { ltaCode: 1870, nameEn: 'Cast-iron gate valve DN150 PN10', nameUa: 'Засувка чавунна фланцева DN150 PN10 зі штурвалом', unit: U.PCS },
      { ltaCode: 1880, nameEn: 'Cast-iron gate valve DN200 PN10', nameUa: 'Засувка чавунна фланцева DN200 PN10 зі штурвалом', unit: U.PCS },
      { ltaCode: 1890, nameEn: 'Cast-iron gate valve DN250 PN10', nameUa: 'Засувка чавунна фланцева DN250 PN10 зі штурвалом', unit: U.PCS },
      { ltaCode: 1900, nameEn: 'Cast-iron gate valve DN300 PN10', nameUa: 'Засувка чавунна фланцева DN300 PN10 зі штурвалом', unit: U.PCS },
      { ltaCode: 1910, nameEn: 'Cast-iron gate valve DN350 PN10', nameUa: 'Засувка чавунна фланцева DN350 PN10 зі штурвалом', unit: U.PCS },
      { ltaCode: 1920, nameEn: 'Cast-iron gate valve DN400 PN10', nameUa: 'Засувка чавунна фланцева DN400 PN10 зі штурвалом', unit: U.PCS },
    ],
  },

  // ── 18. ЗАСУВКИ ДЛЯ ВОДОВІДВЕДЕННЯ ──
  {
    code: 'gate_valves_drainage',
    nameEn: 'Gate Valves (Drainage)',
    nameUa: 'Засувки для водовідведення',
    sortOrder: 18,
    items: [
      { ltaCode: 1930, nameEn: 'Flanged gate valve drainage DN50 PN10', nameUa: 'Засувка шиберна фланцева для водовідведення DN50 PN10', unit: U.PCS },
      { ltaCode: 1940, nameEn: 'Flanged gate valve drainage DN65 PN10', nameUa: 'Засувка шиберна фланцева для водовідведення DN65 PN10', unit: U.PCS },
      { ltaCode: 1950, nameEn: 'Flanged gate valve drainage DN80 PN10', nameUa: 'Засувка шиберна фланцева для водовідведення DN80 PN10', unit: U.PCS },
      { ltaCode: 1960, nameEn: 'Flanged gate valve drainage DN100 PN10', nameUa: 'Засувка шиберна фланцева для водовідведення DN100 PN10', unit: U.PCS },
      { ltaCode: 1970, nameEn: 'Flanged gate valve drainage DN150 PN10', nameUa: 'Засувка шиберна фланцева для водовідведення DN150 PN10', unit: U.PCS },
      { ltaCode: 1980, nameEn: 'Flanged gate valve drainage DN200 PN10', nameUa: 'Засувка шиберна фланцева для водовідведення DN200 PN10', unit: U.PCS },
      { ltaCode: 1990, nameEn: 'Flanged gate valve drainage DN250 PN10', nameUa: 'Засувка шиберна фланцева для водовідведення DN250 PN10', unit: U.PCS },
      { ltaCode: 2000, nameEn: 'Flanged gate valve drainage DN300 PN10', nameUa: 'Засувка шиберна фланцева для водовідведення DN300 PN10', unit: U.PCS },
      { ltaCode: 2010, nameEn: 'Flanged gate valve drainage DN350 PN10', nameUa: 'Засувка шиберна фланцева для водовідведення DN350 PN10', unit: U.PCS },
      { ltaCode: 2020, nameEn: 'Flanged gate valve drainage DN400 PN10', nameUa: 'Засувка шиберна фланцева для водовідведення DN400 PN10', unit: U.PCS },
    ],
  },

  // ── 19. ЗВОРОТНІ КЛАПАНИ (ВОДОПОСТАЧАННЯ) ──
  {
    code: 'check_valves_water',
    nameEn: 'Check Valves (Water Supply)',
    nameUa: 'Зворотні клапани (водопостачання)',
    sortOrder: 19,
    items: [
      { ltaCode: 2030, nameEn: 'Cast iron check valve DN50 PN10', nameUa: 'Зворотний клапан чавунний фланцевий Ду50 PN10', unit: U.PCS },
      { ltaCode: 2040, nameEn: 'Cast iron check valve DN65 PN10', nameUa: 'Зворотний клапан чавунний фланцевий Ду65 PN10', unit: U.PCS },
      { ltaCode: 2050, nameEn: 'Cast iron check valve DN80 PN10', nameUa: 'Зворотний клапан чавунний фланцевий Ду80 PN10', unit: U.PCS },
      { ltaCode: 2060, nameEn: 'Cast iron check valve DN100 PN10', nameUa: 'Зворотний клапан чавунний фланцевий Ду100 PN10', unit: U.PCS },
      { ltaCode: 2070, nameEn: 'Cast iron check valve DN150 PN10', nameUa: 'Зворотний клапан чавунний фланцевий Ду150 PN10', unit: U.PCS },
      { ltaCode: 2080, nameEn: 'Cast iron check valve DN200 PN10', nameUa: 'Зворотний клапан чавунний фланцевий Ду200 PN10', unit: U.PCS },
      { ltaCode: 2090, nameEn: 'Cast iron check valve DN250 PN10', nameUa: 'Зворотний клапан чавунний фланцевий Ду250 PN10', unit: U.PCS },
      { ltaCode: 2100, nameEn: 'Cast iron check valve DN300 PN10', nameUa: 'Зворотний клапан чавунний фланцевий Ду300 PN10', unit: U.PCS },
      { ltaCode: 2110, nameEn: 'Cast iron check valve DN350 PN10', nameUa: 'Зворотний клапан чавунний фланцевий Ду350 PN10', unit: U.PCS },
      { ltaCode: 2120, nameEn: 'Cast iron check valve DN400 PN10', nameUa: 'Зворотний клапан чавунний фланцевий Ду400 PN10', unit: U.PCS },
    ],
  },

  // ── 20. ЗВОРОТНІ КЛАПАНИ ШАРОВІ (ВОДОВІДВЕДЕННЯ) ──
  {
    code: 'ball_check_valves_drainage',
    nameEn: 'Ball Check Valves (Drainage)',
    nameUa: 'Зворотні клапани шарові (водовідведення)',
    sortOrder: 20,
    items: [
      { ltaCode: 2130, nameEn: 'Ball check valve DN50 PN10 (drainage)', nameUa: 'Зворотний клапан шаровий фланцевий DN50 PN10 для водовідведення', unit: U.PCS },
      { ltaCode: 2140, nameEn: 'Ball check valve DN65 PN10 (drainage)', nameUa: 'Зворотний клапан шаровий фланцевий DN65 PN10 для водовідведення', unit: U.PCS },
      { ltaCode: 2150, nameEn: 'Ball check valve DN80 PN10 (drainage)', nameUa: 'Зворотний клапан шаровий фланцевий DN80 PN10 для водовідведення', unit: U.PCS },
      { ltaCode: 2160, nameEn: 'Ball check valve DN100 PN10 (drainage)', nameUa: 'Зворотний клапан шаровий фланцевий DN100 PN10 для водовідведення', unit: U.PCS },
      { ltaCode: 2170, nameEn: 'Ball check valve DN150 PN10 (drainage)', nameUa: 'Зворотний клапан шаровий фланцевий DN150 PN10 для водовідведення', unit: U.PCS },
      { ltaCode: 2180, nameEn: 'Ball check valve DN200 PN10 (drainage)', nameUa: 'Зворотний клапан шаровий фланцевий DN200 PN10 для водовідведення', unit: U.PCS },
      { ltaCode: 2190, nameEn: 'Ball check valve DN250 PN10 (drainage)', nameUa: 'Зворотний клапан шаровий фланцевий DN250 PN10 для водовідведення', unit: U.PCS },
      { ltaCode: 2200, nameEn: 'Ball check valve DN300 PN10 (drainage)', nameUa: 'Зворотний клапан шаровий фланцевий DN300 PN10 для водовідведення', unit: U.PCS },
      { ltaCode: 2210, nameEn: 'Ball check valve DN350 PN10 (drainage)', nameUa: 'Зворотний клапан шаровий фланцевий DN350 PN10 для водовідведення', unit: U.PCS },
      { ltaCode: 2220, nameEn: 'Ball check valve DN400 PN10 (drainage)', nameUa: 'Зворотний клапан шаровий фланцевий DN400 PN10 для водовідведення', unit: U.PCS },
    ],
  },

  // ── 21. ФЛАНЦІ ПЛОСКІ СТАЛЕВІ ──
  {
    code: 'flat_steel_flanges',
    nameEn: 'Flat Welded Steel Flanges (DIN)',
    nameUa: 'Фланці плоскі приварні сталеві (DIN)',
    sortOrder: 21,
    items: [
      { ltaCode: 2230, nameEn: 'Flat welded steel flange DIN DN50 PN10', nameUa: 'Фланець плоский приварний сталевий DIN Ду50 PN10', unit: U.PCS },
      { ltaCode: 2240, nameEn: 'Flat welded steel flange DIN DN100 PN10', nameUa: 'Фланець плоский приварний сталевий DIN Ду100 PN10', unit: U.PCS },
      { ltaCode: 2250, nameEn: 'Flat welded steel flange DIN DN150 PN10', nameUa: 'Фланець плоский приварний сталевий DIN Ду150 PN10', unit: U.PCS },
      { ltaCode: 2260, nameEn: 'Flat welded steel flange DIN DN200 PN10', nameUa: 'Фланець плоский приварний сталевий DIN Ду200 PN10', unit: U.PCS },
      { ltaCode: 2270, nameEn: 'Flat welded steel flange DIN DN250 PN10', nameUa: 'Фланець плоский приварний сталевий DIN Ду250 PN10', unit: U.PCS },
      { ltaCode: 2280, nameEn: 'Flat welded steel flange DIN DN300 PN10', nameUa: 'Фланець плоский приварний сталевий DIN Ду300 PN10', unit: U.PCS },
      { ltaCode: 2290, nameEn: 'Flat welded steel flange DIN DN350 PN10', nameUa: 'Фланець плоский приварний сталевий DIN Ду350 PN10', unit: U.PCS },
      { ltaCode: 2300, nameEn: 'Flat welded steel flange DIN DN400 PN10', nameUa: 'Фланець плоский приварний сталевий DIN Ду400 PN10', unit: U.PCS },
    ],
  },
];


/*

Seeding equipment catalog...
  ✓ Welding Equipment: 7 items
  ✓ Welding Consumables: 3 items
  ✓ Portable Power Generators: 3 items
  ✓ Pumping Equipment: 2 items
  ✓ Compression Fittings: 21 items
  ✓ Compression Saddle Tees: 10 items
  ✓ Compression Flange Connections: 4 items
  ✓ Electrowelded Fittings: 25 items
  ✓ Cast & Welded Fittings: 26 items
  ✓ PE Stub Flanges: 12 items
  ✓ Steel Flanges for PE Bushing: 11 items
  ✓ Universal Flange Adapters & Couplings: 9 items
  ✓ Gaskets & Fasteners: 10 items
  ✓ Repair Collars: 6 items
  ✓ PE Pipes (Drinking Water): 17 items
  ✓ Corrugated Pipes & Sealing Rings: 16 items
  ✓ Gate Valves (Water Supply): 10 items
  ✓ Gate Valves (Drainage): 10 items
  ✓ Check Valves (Water Supply): 10 items
  ✓ Ball Check Valves (Drainage): 10 items
  ✓ Flat Welded Steel Flanges (DIN): 8 items
Equipment catalog seeded: 21 categories, 230 items.

 */



export async function seedEquipmentCatalog(dataSource: DataSource): Promise<void> {
  const categoryRepo = dataSource.getRepository(EquipmentCategory);
  const itemRepo = dataSource.getRepository(EquipmentItem);

  // Skip if already seeded
  const existingCount = await categoryRepo.count();
  if (existingCount > 0) {
    console.log(`Equipment catalog already seeded (${existingCount} categories). Skipping.`);
    return;
  }

  console.log('Seeding equipment catalog...');

  for (const catData of CATEGORIES) {
    const category = categoryRepo.create({
      code: catData.code,
      nameEn: catData.nameEn,
      nameUa: catData.nameUa,
      sortOrder: catData.sortOrder,
    });
    const savedCategory = await categoryRepo.save(category);

    const items = catData.items.map((itemData, index) =>
      itemRepo.create({
        ltaCode: itemData.ltaCode,
        nameEn: itemData.nameEn,
        nameUa: itemData.nameUa,
        unit: itemData.unit,
        // specifications: itemData.specifications ?? null,
        specifications: itemData.specifications,
        sortOrder: index,
        categoryId: savedCategory.id,
      }),
    );

    await itemRepo.save(items);
    console.log(`  ✓ ${catData.nameEn}: ${items.length} items`);
  }

  const totalItems = await itemRepo.count();
  console.log(`Equipment catalog seeded: ${CATEGORIES.length} categories, ${totalItems} items.`);
}
