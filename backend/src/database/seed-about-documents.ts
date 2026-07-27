// === ADDED: PR-D1 — About document registry seed.
// Generated from docs/about-documents/Register of documents.xlsx (v7, 2026-07-27),
// 32 documents. The register is the source of truth for document METADATA; the seed
// therefore refreshes titles/descriptions/dates on every boot but never touches
// `is_published` or `access_mode`, which are operational decisions taken in the admin
// UI and must survive a redeploy. Files are attached separately (about_document_files). ===
import { DataSource } from 'typeorm';
import type {
  AboutDocumentAccessMode,
  AboutDocumentType,
} from '../modules/about/about-documents.constants';

interface AboutDocumentSeed {
  code: string;
  documentType: AboutDocumentType;
  accessMode: AboutDocumentAccessMode;
  titleUa: string;
  titleEn: string;
  descriptionUa: string;
  descriptionEn: string;
  version: string;
  lastReviewDate: string;
  nextReviewDate: string | null;
  sortOrder: number;
}

const ABOUT_DOCUMENTS: AboutDocumentSeed[] = [
  {
    code: 'CSD-POL-01',
    documentType: 'POLICY',
    accessMode: 'view_only',
    titleUa: 'Політика закупівель',
    titleEn: 'Procurement Policy',
    descriptionUa:
      'Встановлює єдиний порядок закупівель товарів, робіт і послуг Організації — від запиту на закупівлю до вибору постачальника й укладення договору. Визначає етичні принципи закупівель, вартісні пороги та відповідні їм процедури, особливі правила для екстрених і донорських закупівель, а також роботу з базою затверджених постачальників. Містить робочі форми: запит на закупівлю, замовлення на закупівлю, цінову пропозицію та базу постачальників.',
    descriptionEn:
      'Sets out a single procedure for procuring goods, works and services — from the purchase request through supplier selection to contract award. It defines procurement ethics, value thresholds and the procedures applicable to each, special rules for emergency and donor-funded procurement, and the maintenance of the approved supplier database. Working forms are annexed: purchase request, purchase order, price offer and supplier database.',
    version: 'v4',
    lastReviewDate: '2025-10-15',
    nextReviewDate: '2027-10-15',
    sortOrder: 1,
  },
  {
    code: 'CSD-POL-02',
    documentType: 'POLICY',
    accessMode: 'view_only',
    titleUa: 'Екологічна політика',
    titleEn: 'Environmental Policy',
    descriptionUa:
      'Визначає зобов’язання та принципи Організації у сфері охорони довкілля і сталого розвитку. Охоплює програму «Зелений офіс», відповідальне поводження з відходами, профілактику вибухонебезпеки на складі та вимоги екологічної прозорості до партнерів. Спрямована на мінімізацію негативного впливу діяльності Організації на довкілля та раціональне використання природних ресурсів.',
    descriptionEn:
      "Defines the Organisation's environmental protection and sustainable development commitments and principles. It covers the Green Office programme, responsible waste management, explosion-safety precautions in warehousing, and environmental transparency requirements for partners. Its aim is to minimise the environmental impact of the Organisation's activities and to use natural resources rationally.",
    version: 'v1',
    lastReviewDate: '2025-02-09',
    nextReviewDate: '2027-02-09',
    sortOrder: 2,
  },
  {
    code: 'CSD-POL-03',
    documentType: 'POLICY',
    accessMode: 'public_download',
    titleUa: 'Політика боротьби зі шахрайством та корупцією',
    titleEn: 'Anti-Fraud and Anti-Corruption Policy',
    descriptionUa:
      'Визначає підхід Організації до запобігання, виявлення та реагування на шахрайство і корупцію. Встановлює цінності й принципи доброчесності, відповідальність керівництва, порядок дій у разі підозри або виявлення шахрайства та антикорупційну процедуру для персоналу. Повідомлення про підозри є договірним обов’язком кожного співробітника; замовчування тягне дисциплінарну відповідальність.',
    descriptionEn:
      "Sets out the Organisation's approach to preventing, detecting and responding to fraud and corruption. It establishes integrity values and principles, management responsibilities, the course of action where fraud is suspected or detected, and an anti-corruption procedure for staff. Reporting suspicions is a contractual duty of every employee, and failure to report may lead to disciplinary action.",
    version: 'v1',
    lastReviewDate: '2025-02-09',
    nextReviewDate: '2027-02-09',
    sortOrder: 3,
  },
  {
    code: 'CSD-POL-04',
    documentType: 'POLICY',
    accessMode: 'view_only',
    titleUa: 'Політика внутрішнього контролю',
    titleEn: 'Internal Control Policy',
    descriptionUa:
      'Визначає принципи, процедури та методи внутрішнього фінансового контролю Організації. Охоплює розподіл обов’язків і санкціонування операцій, контроль виконання бюджетів та відхилень, контроль закупівель і взаємодії з контрагентами, фізичний контроль активів, збереження інформації та реагування на регуляторні вимоги. Мета — цільове використання донорських коштів, захист статусу неприбутковості та достовірність звітності.',
    descriptionEn:
      'Defines the principles, procedures and methods of internal financial control in the Organisation. It covers segregation of duties and authorisation of transactions, budget execution and variance monitoring, control of procurement and of dealings with counterparties, physical control of assets, information retention and response to regulatory requirements. Its purpose is the designated use of donor funds, protection of non-profit status and reliable reporting.',
    version: 'v1',
    lastReviewDate: '2026-05-25',
    nextReviewDate: '2028-05-25',
    sortOrder: 4,
  },
  {
    code: 'CSD-POL-05',
    documentType: 'POLICY',
    accessMode: 'view_only',
    titleUa: 'Політика відділу кадрів (HR)',
    titleEn: 'Human Resources Policy',
    descriptionUa:
      'Кадрова політика Організації — довідник з усіх етапів трудових відносин. Охоплює відбір і найм, працевлаштування, управління роботою та професійний розвиток, розв’язання конфліктів і скарг, дисциплінарну відповідальність, звільнення, норми поведінки, графік роботи, компенсації та інші виплати. Поширюється на працівників, волонтерів та осіб, які виконують роботи чи надають послуги для Організації.',
    descriptionEn:
      "The Organisation's human resources policy — a reference covering the full employment cycle. It addresses recruitment and selection, employment, performance management and professional development, conflict and grievance resolution, disciplinary liability, termination, standards of conduct, working hours, compensation and other benefits. It applies to employees, volunteers and persons performing work or providing services for the Organisation.",
    version: 'v2',
    lastReviewDate: '2025-02-13',
    nextReviewDate: '2027-02-13',
    sortOrder: 5,
  },
  {
    code: 'CSD-POL-06',
    documentType: 'POLICY',
    accessMode: 'view_only',
    titleUa: 'Політика керування документами',
    titleEn: 'Document Management Policy',
    descriptionUa:
      'Встановлює стандартизований порядок створення, обробки, зберігання, доступу та знищення документів Організації. Описує класифікацію документів, їх життєвий цикл, вимоги до фізичного й цифрового зберігання, контроль доступу та заходи безпеки, строки зберігання й архівування, порядок знищення, а також аудит відповідності та навчання персоналу.',
    descriptionEn:
      "Establishes a standardised procedure for creating, handling, storing, accessing and destroying the Organisation's records. It describes document classification, the document life cycle, physical and digital storage requirements, access control and security measures, retention periods and archiving, destruction procedures, as well as compliance audit and staff training.",
    version: 'v1',
    lastReviewDate: '2024-09-18',
    nextReviewDate: '2026-09-18',
    sortOrder: 6,
  },
  {
    code: 'CSD-POL-07',
    documentType: 'POLICY',
    accessMode: 'view_only',
    titleUa: 'Політика конфіденційності',
    titleEn: 'Confidentiality Policy',
    descriptionUa:
      'Встановлює вимоги до збору, обробки та захисту персональних даних бенефіціарів і працівників, а також до збереження інформації Організації, зокрема на публічних ресурсах. Визначає відповідальних осіб, бази персональних даних, права суб’єктів даних, режим обмеженого доступу та порядок оброблення даних. Ґрунтується на вимогах законодавства України та Загального регламенту про захист даних (GDPR).',
    descriptionEn:
      "Sets requirements for the collection, processing and protection of personal data of beneficiaries and staff, and for safeguarding the Organisation's information, including on public channels. It identifies the responsible persons, the personal data files held, the rights of data subjects, the restricted-access regime and the data processing procedure. It is based on Ukrainian legislation and the General Data Protection Regulation (GDPR).",
    version: 'v1',
    lastReviewDate: '2024-09-18',
    nextReviewDate: '2026-09-18',
    sortOrder: 7,
  },
  {
    code: 'CSD-POL-08',
    documentType: 'POLICY',
    accessMode: 'view_only',
    titleUa: 'Політика моніторингу та оцінки',
    titleEn: 'Monitoring and Evaluation Policy',
    descriptionUa:
      'Встановлює правила, принципи та операційні стандарти системи моніторингу й оцінки (MEAL) Організації. Описує ключові компоненти системи, принципи та мету моніторингу й оцінки, базові концепції та критерії оцінювання, а також типи оцінок за часом проведення, ініціатором і методологією. Забезпечує підзвітність, навчання на досвіді та обґрунтованість програмних рішень.',
    descriptionEn:
      "Establishes the rules, principles and operational standards of the Organisation's monitoring and evaluation (MEAL) system. It describes the key components of the system, the principles and purpose of monitoring and evaluation, the underlying concepts and evaluation criteria, and the types of evaluation by timing, initiator and methodology. It underpins accountability, learning from experience and evidence-based programme decisions.",
    version: 'v1',
    lastReviewDate: '2024-09-22',
    nextReviewDate: '2026-09-22',
    sortOrder: 8,
  },
  {
    code: 'CSD-POL-09',
    documentType: 'POLICY',
    accessMode: 'view_only',
    titleUa: 'Політика розподілу витрат між проєктами',
    titleEn: 'Cost Allocation Policy',
    descriptionUa:
      'Встановлює прозорий і справедливий порядок розподілу спільних витрат між проєктами та донорами. Визначає класифікацію витрат, принципи та бази розподілу, вимоги до документування й обґрунтування, процес затвердження, центри витрат, перерозподіл коштів і звітність перед донорами. Головна мета — уникнути подвійного стягнення коштів і забезпечити відповідність умовам донорських угод.',
    descriptionEn:
      'Establishes a transparent and fair procedure for allocating shared costs between projects and donors. It defines cost classification, allocation principles and bases, documentation and justification requirements, the approval process, cost centres, reallocation of funds and donor reporting. Its main purpose is to prevent double-charging and to ensure compliance with the terms of donor agreements.',
    version: 'v1',
    lastReviewDate: '2024-09-18',
    nextReviewDate: '2026-09-18',
    sortOrder: 9,
  },
  {
    code: 'CSD-POL-10',
    documentType: 'POLICY',
    accessMode: 'view_only',
    titleUa: 'Політика щодо кібербезпеки та захисту інформації',
    titleEn: 'Cybersecurity and Information Protection Policy',
    descriptionUa:
      'Визначає вимоги до захисту конфіденційності, цілісності та доступності інформації й інформаційних систем Організації. Охоплює управління ризиками кібербезпеки, захист даних, управління доступом, навчання та обізнаність персоналу, а також регулярний моніторинг і оцінку стану захищеності. Поширюється на всі пристрої, мережі, програмне забезпечення та дані Організації.',
    descriptionEn:
      "Defines requirements for protecting the confidentiality, integrity and availability of the Organisation's information and information systems. It covers cybersecurity risk management, data protection, access management, staff training and awareness, and regular monitoring and assessment of the security posture. It applies to all of the Organisation's devices, networks, software and data.",
    version: 'v1',
    lastReviewDate: '2025-01-10',
    nextReviewDate: '2027-01-10',
    sortOrder: 10,
  },
  {
    code: 'CSD-POL-11',
    documentType: 'POLICY',
    accessMode: 'view_only',
    titleUa: 'Політика щодо розробки проектів',
    titleEn: 'Project Development Policy',
    descriptionUa:
      'Визначає рамки розробки, реалізації та управління проєктами Організації у трьох ключових сферах: водопостачання, санітарія та гігієна (WASH); відновлення пошкоджених соціальних установ — шкіл, дитячих садків, медичних закладів; підготовка до зими та дрібний ремонт. Описує категорії проєктів, етапи їх розробки, управління ризиками та засади партнерства і співпраці.',
    descriptionEn:
      "Defines the framework for developing, implementing and managing the Organisation's projects in three core areas: water, sanitation and hygiene (WASH); rehabilitation of damaged social facilities such as schools, kindergartens and healthcare institutions; and winterisation and minor repairs. It describes project categories, the project development stages, risk management, and the principles of partnership and cooperation.",
    version: 'v1',
    lastReviewDate: '2024-09-22',
    nextReviewDate: '2026-09-22',
    sortOrder: 11,
  },
  {
    code: 'CSD-POL-12',
    documentType: 'POLICY',
    accessMode: 'public_download',
    titleUa: 'Політика захисту (гендер, сексуальна експлуатація та насильство)',
    titleEn:
      'Protection Policy (Gender-Based Violence, Sexual Exploitation and Abuse)',
    descriptionUa:
      'Закріплює зобов’язання Організації захищати осіб, яким надається допомога, від гендерного насильства, сексуальної експлуатації та наруги з боку працівників і пов’язаних осіб. Містить принципи захисту, зобов’язання Організації, Моральний кодекс і порядок подання скарг та розслідування. Узгоджена з шістьма ключовими принципами Міжвідомчого постійного комітету (IASC, 2002) і поширюється на всі програми Організації.',
    descriptionEn:
      "Sets out the Organisation's commitment to protecting people receiving assistance from gender-based violence and sexual exploitation and abuse by staff and associated personnel. It contains protection principles, the Organisation's commitments, a Code of Ethics, and the complaints and investigation procedure. It is aligned with the six core principles of the Inter-Agency Standing Committee (IASC, 2002) and applies to all of the Organisation's programmes.",
    version: 'v1',
    lastReviewDate: '2024-03-11',
    nextReviewDate: '2028-05-31',
    sortOrder: 12,
  },
  {
    code: 'CSD-POL-13',
    documentType: 'POLICY',
    accessMode: 'public_download',
    titleUa: 'Політика щодо захисту дітей',
    titleEn: 'Child Protection Policy',
    descriptionUa:
      'Визначає зобов’язання Організації щодо безпеки та захисту прав дітей у всіх програмах і проєктах. Охоплює ключові принципи захисту дітей, скринінг і навчання персоналу, порядок подання скарг та розслідування, а також правила використання зображень дітей. Поширюється на працівників, волонтерів, підрядників, консультантів і персонал партнерських організацій.',
    descriptionEn:
      "Defines the Organisation's commitments to the safety and protection of children's rights across all programmes and projects. It covers the core child protection principles, staff screening and training, the complaints and investigation procedure, and rules on the use of images of children. It applies to employees, volunteers, contractors, consultants and partner organisation personnel.",
    version: 'v1',
    lastReviewDate: '2024-03-05',
    nextReviewDate: '2029-03-05',
    sortOrder: 13,
  },
  {
    code: 'CSD-COD-01',
    documentType: 'CODE',
    accessMode: 'public_download',
    titleUa:
      'Кодекс поведінки при здійсненні допомоги людям, які постраждали від стихійних лих, воєнних дій та інших катастроф',
    titleEn:
      'Code of Conduct During Carrying out Assistance to People Affected by Natural Disasters, Military Actions and Other Disasters',
    descriptionUa:
      'Визначає основоположні принципи гуманітарної діяльності Організації при наданні допомоги людям, які постраждали від стихійних лих, воєнних дій та інших катастроф. Встановлює правила поведінки, обов’язкові для всього персоналу, волонтерів, стажерів, підрядників і представників Організації. Ознайомлення підтверджується підписанням форми з Додатка 1.',
    descriptionEn:
      "Defines the fundamental principles of the Organisation's humanitarian work when providing assistance to people affected by natural disasters, armed conflict and other catastrophes. It sets standards of conduct binding on all staff, volunteers, interns, contractors and representatives of the Organisation. Acknowledgement is confirmed by signing the form in Annex 1.",
    version: 'v1',
    lastReviewDate: '2019-09-10',
    nextReviewDate: '2028-05-31',
    sortOrder: 14,
  },
  {
    code: 'CSD-COD-02',
    documentType: 'CODE',
    accessMode: 'public_download',
    titleUa: 'Кодекс поведінки Постачальників',
    titleEn: 'Supplier Code of Conduct',
    descriptionUa:
      'Встановлює стандарти доброчесної поведінки для постачальників, агентів, посередників, консультантів і підрядників, залучених до діяльності, що фінансується Організацією. Охоплює добросовісну й прозору практику, дотримання законів, правила популяризації та реклами, розкриття інформації та конфлікт інтересів, принципи Глобального договору ООН, захист дитини і захист від сексуальної експлуатації, наруги та домагань.',
    descriptionEn:
      'Sets standards of integrity for suppliers, agents, intermediaries, consultants and contractors engaged in activities funded by the Organisation. It covers fair and transparent practice, compliance with the law, promotion and advertising rules, full disclosure and conflicts of interest, the UN Global Compact principles, child protection, and protection from sexual exploitation, abuse and harassment.',
    version: 'v1',
    lastReviewDate: '2024-09-18',
    nextReviewDate: '2026-09-18',
    sortOrder: 15,
  },
  {
    code: 'CSD-MEC-01',
    documentType: 'MECHANISM',
    accessMode: 'public_download',
    titleUa: "Механізм зворотного зв'язку та реагування на скарги",
    titleEn: 'Feedback Mechanism and Complaint Response',
    descriptionUa:
      'Описує процес отримання відгуків і скарг від зацікавлених сторін та реагування на них під час реалізації проєктів. Визначає канали подання, порядок розгляду й надання відповіді, категорії скарг і стандарти строків реагування. Забезпечує підзвітність Організації перед постраждалим населенням; містить зобов’язання щодо підзвітності (AAAP) і форму подання відгуку або скарги.',
    descriptionEn:
      "Describes the process for receiving and responding to feedback and complaints from stakeholders during project implementation. It defines the submission channels, the handling and response procedure, complaint categories and response-time standards. It underpins the Organisation's accountability to affected populations and includes the accountability commitments (AAAP) and a feedback or complaint submission form.",
    version: 'v1',
    lastReviewDate: '2024-03-05',
    nextReviewDate: '2028-05-31',
    sortOrder: 16,
  },
  {
    code: 'CSD-MEC-02',
    documentType: 'MECHANISM',
    accessMode: 'view_only',
    titleUa: 'Механізм розслідування злочинів',
    titleEn: 'Mechanism for Investigating Crimes',
    descriptionUa:
      'Встановлює принципи та процедури проведення розслідувань злочинів і порушень прав людини в гуманітарному та правозахисному контексті. Містить десять основних слідчих правил, керівництво з підготовки до розслідування та особливі вимоги до збору й зберігання інформації про сексуальне і гендерне насильство. Застосовується персоналом і партнерами, залученими до документування порушень та внутрішніх розслідувань.',
    descriptionEn:
      'Establishes the principles and procedures for investigating crimes and human rights violations in a humanitarian and human rights context. It contains ten core investigation rules, guidance on preparing for an investigation, and specific requirements for collecting and storing information on sexual and gender-based violence. It is applied by staff and partners involved in documenting violations and in internal investigations.',
    version: 'v1',
    lastReviewDate: '2024-03-07',
    nextReviewDate: '2028-05-31',
    sortOrder: 17,
  },
  {
    code: 'CSD-REG-01',
    documentType: 'REGULATION',
    accessMode: 'view_only',
    titleUa: 'Положення управління договорів',
    titleEn: 'Contract Management Regulation',
    descriptionUa:
      'Встановлює порядок роботи з договорами: створення проєктів договорів, додаткових угод і специфікацій, їх узгодження відповідальними співробітниками, підписання оригіналів, внесення змін і пролонгацію, а також ведення претензійної роботи з контрагентами. Поширюється на управлінський персонал і всіх співробітників, залучених до укладення, виконання, зміни чи розірвання договорів.',
    descriptionEn:
      'Establishes the procedure for handling contracts: drafting contracts, addenda and specifications, their approval by responsible staff, signing of originals, amendments and extensions, and claims handling with counterparties. It applies to management and to all staff involved in concluding, performing, amending or terminating contracts.',
    version: 'v1',
    lastReviewDate: '2024-09-18',
    nextReviewDate: '2026-09-18',
    sortOrder: 18,
  },
  {
    code: 'CSD-REG-02',
    documentType: 'REGULATION',
    accessMode: 'view_only',
    titleUa: 'Положення про відрядження працівників',
    titleEn: 'Regulations on Business Trips for Employees',
    descriptionUa:
      'Визначає порядок направлення працівників у службові відрядження для реалізації гуманітарних та інфраструктурних проєктів, а також правила відшкодування витрат і звітування. Охоплює польові поїздки, моніторингові візити, технічний нагляд, участь у координаційних зустрічах та оцінку потреб громад. Питання безпеки під час відряджень регулюються окремо — Положенням CSD-REG-05.',
    descriptionEn:
      'Defines the procedure for sending employees on business trips to implement humanitarian and infrastructure projects, together with the rules on expense reimbursement and reporting. It covers field trips, monitoring visits, technical supervision, participation in coordination meetings and community needs assessments. Travel security is governed separately by Regulation CSD-REG-05.',
    version: 'v1',
    lastReviewDate: '2026-02-13',
    nextReviewDate: '2028-02-13',
    sortOrder: 19,
  },
  {
    code: 'CSD-REG-03',
    documentType: 'REGULATION',
    accessMode: 'view_only',
    titleUa: 'Положення про конфлікт інтересів',
    titleEn: 'Regulations on Conflict of Interest',
    descriptionUa:
      'Інформує підписантів про види діяльності, які можуть спричинити фактичний або потенційний конфлікт інтересів, і закріплює обов’язок їх уникати та розкривати. Містить визначення конфлікту інтересів, приклади ризикових ситуацій та обов’язки підписантів. Застосовується до фізичних осіб і ФОП, що є сторонами договорів з Організацією; ознайомлення підтверджується заявою з Додатка 1.',
    descriptionEn:
      'Informs signatories of the activities that may give rise to an actual or potential conflict of interest and establishes the duty to avoid and disclose them. It contains the definition of a conflict of interest, examples of risk situations, and the obligations of signatories. It applies to individuals and sole traders who are parties to contracts with the Organisation; acknowledgement is confirmed by the declaration in Annex 1.',
    version: 'v1',
    lastReviewDate: '2024-03-11',
    nextReviewDate: '2028-05-31',
    sortOrder: 20,
  },
  {
    code: 'CSD-REG-04',
    documentType: 'REGULATION',
    accessMode: 'view_only',
    titleUa: 'Положення про оплату праці',
    titleEn: 'Remuneration Regulation',
    descriptionUa:
      'Визначає правові, економічні та організаційні засади оплати праці працівників Організації. Охоплює систему оплати праці та структуру заробітної плати, порядок встановлення посадових окладів і штатного розпису, нарахування та виплату заробітної плати, відпустки й компенсаційні виплати, а також обмеження, зумовлені статусом неприбутковості.',
    descriptionEn:
      "Defines the legal, economic and organisational framework for the remuneration of the Organisation's employees. It covers the pay system and salary structure, the procedure for setting salaries and the staffing schedule, payroll calculation and payment, leave and compensatory payments, and the restrictions arising from non-profit status.",
    version: 'v1',
    lastReviewDate: '2026-05-25',
    nextReviewDate: '2028-05-25',
    sortOrder: 21,
  },
  {
    code: 'CSD-REG-05',
    documentType: 'REGULATION',
    accessMode: 'view_only',
    titleUa: 'Положення про безпеку відряджень працівників',
    titleEn: 'Regulations on Staff Travel Security',
    descriptionUa:
      'Спрямоване на зниження ризику захворювань, травм і загибелі працівників під час відряджень у зони бойових дій, стихійних лих та політичної нестабільності. Визначає складові безпеки відряджень, загальну підготовку персоналу, класифікацію рівнів ризику, планування поїздок і розробку маршрутів. Містить перелік обов’язкових форм і документів.',
    descriptionEn:
      'Aims to reduce the risk of illness, injury and loss of life for employees travelling to areas affected by hostilities, natural disasters and political instability. It defines the components of travel security, general staff preparation, risk level classification, trip planning and route development. It includes the list of mandatory forms and documents.',
    version: 'v2',
    lastReviewDate: '2024-03-11',
    nextReviewDate: '2028-05-31',
    sortOrder: 22,
  },
  {
    code: 'CSD-REG-06',
    documentType: 'REGULATION',
    accessMode: 'view_only',
    titleUa: 'Положення про використання транспортних засобів',
    titleEn: 'Regulations on the Use of Vehicles',
    descriptionUa:
      'Визначає правила та порядок використання власних і орендованих транспортних засобів Організації. Охоплює вимоги до транспортних засобів, допуск уповноважених водіїв, правила перевезення пасажирів, порядок використання та ведення журналу реєстрації пробігу. Мета — збереження активів, їх ефективне використання та безпека персоналу.',
    descriptionEn:
      "Defines the rules and procedure for using the Organisation's owned and leased vehicles. It covers requirements for the vehicles, authorisation of drivers, rules for carrying passengers, the procedure for vehicle use, and mileage logging. Its purpose is to safeguard assets, ensure their efficient use and protect staff safety.",
    version: 'v2',
    lastReviewDate: '2024-03-11',
    nextReviewDate: '2028-05-31',
    sortOrder: 23,
  },
  {
    code: 'CSD-REG-07',
    documentType: 'REGULATION',
    accessMode: 'view_only',
    titleUa: 'Положення про користування Інтернетом',
    titleEn: 'Internet Use Regulation',
    descriptionUa:
      'Встановлює стандарти та обмеження використання комп’ютерної техніки, інтернет-мереж і систем електронної пошти Організації. Охоплює загальні правила користування, моніторинг мережі та інтернет-трафіку, систему фільтрації й заборонений контент, порядок надання винятків щодо заблокованих ресурсів і відповідальність за порушення. Поширюється на співробітників, стажерів, волонтерів та інших користувачів обладнання й мереж Організації.',
    descriptionEn:
      "Sets standards and limits for the use of the Organisation's computer equipment, internet networks and email systems. It covers general rules of use, network and internet traffic monitoring, the filtering system and prohibited content, the procedure for granting exceptions to blocked resources, and liability for breaches. It applies to employees, interns, volunteers and other users of the Organisation's equipment and networks.",
    version: 'v2',
    lastReviewDate: '2024-03-11',
    nextReviewDate: '2028-05-31',
    sortOrder: 24,
  },
  {
    code: 'CSD-MAN-01',
    documentType: 'MANUAL',
    accessMode: 'view_only',
    titleUa: 'Посібник з фінансів та бухгалтерського обліку',
    titleEn: 'Finance and Accounting Manual',
    descriptionUa:
      'Основний операційний посібник Організації, що встановлює систему контролю за управлінням операціями, персоналом, майном і коштами. Охоплює місію та організаційну структуру, управління персоналом, фінансовий менеджмент, готівкові кошти й банківські рахунки, закупівлі, бухгалтерський облік і процеси проводки, проєктний менеджмент, логістику та управління майном, транспортні засоби й обладнання. Поширюється на весь персонал, усі офіси та проєкти Організації.',
    descriptionEn:
      "The Organisation's core operational manual, establishing the control system for managing operations, staff, property and funds. It covers the mission and organisational structure, human resources management, financial management, cash and bank accounts, procurement, accounting and posting processes, project management, logistics and property management, vehicles and equipment. It applies to all staff, offices and projects of the Organisation.",
    version: 'v1',
    lastReviewDate: '2024-09-17',
    nextReviewDate: '2026-09-17',
    sortOrder: 25,
  },
  {
    code: 'CSD-RUL-01',
    documentType: 'RULES',
    accessMode: 'view_only',
    titleUa: 'Правила внутрішнього трудового розпорядку',
    titleEn: 'Internal Labor Regulations',
    descriptionUa:
      'Визначають трудові обов’язки працівників, режим роботи та засади регулювання трудових відносин в Організації. Охоплюють порядок прийняття та звільнення, основні права й обов’язки працівника і роботодавця, робочий час і час відпочинку, заохочення за успіхи в роботі та відповідальність за порушення трудової дисципліни. Обов’язкові для всіх працівників незалежно від посади та форми трудового договору.',
    descriptionEn:
      'Define the labour duties of employees, working arrangements and the basis for regulating employment relations in the Organisation. They cover hiring and dismissal, the core rights and obligations of the employee and the employer, working and rest time, incentives for good performance, and liability for breaches of labour discipline. They are binding on all employees regardless of position or form of employment contract.',
    version: 'v1',
    lastReviewDate: '2025-02-09',
    nextReviewDate: '2027-02-09',
    sortOrder: 26,
  },
  {
    code: 'CSD-PRO-01',
    documentType: 'PROCEDURE',
    accessMode: 'view_only',
    titleUa: 'Процедура узгодження оплат',
    titleEn: 'Payment Approval Procedure',
    descriptionUa:
      'Забезпечує чіткий, прозорий і контрольований процес погодження фінансових оплат у проєктній та адміністративній діяльності. Визначає склад платіжного пакета (запит на оплату, замовлення на закупівлю, рахунок, договір, акт), відповідальних осіб, послідовність і терміни погодження, особливі умови та порядок зберігання документів. Застосовується до всіх платежів незалежно від суми та джерела коштів.',
    descriptionEn:
      'Ensures a clear, transparent and controlled approval process for financial payments in project and administrative activities. It defines the composition of the payment package (payment request, purchase order, invoice, contract, act), the responsible persons, the sequence and deadlines for approval, special conditions and document retention. It applies to all payments regardless of amount or funding source.',
    version: 'v1',
    lastReviewDate: '2025-10-27',
    nextReviewDate: '2027-10-27',
    sortOrder: 27,
  },
  {
    code: 'CSD-POL-14',
    documentType: 'POLICY',
    accessMode: 'view_only',
    titleUa: 'Політика управління ризиками',
    titleEn: 'Risk Management Policy',
    descriptionUa:
      'Встановлює єдиний підхід до виявлення, оцінки, мітигації та моніторингу ризиків, що впливають на здатність Організації виконувати місію та зобов’язання перед бенефіціарами, донорами й партнерами. Описує методологію enterprise risk management, структуру реєстру ризиків і цикл його перегляду, ризик-апетит та топ-15 ризиків. Разом із документом застосовується операційний Реєстр ризиків CSD (52 ризики у 12 категоріях) як окремий додаток.',
    descriptionEn:
      "Establishes a single approach to identifying, assessing, mitigating and monitoring the risks affecting the Organisation's ability to deliver its mission and its commitments to beneficiaries, donors and partners. It describes the enterprise risk management methodology, the structure of the risk register and its review cycle, risk appetite and the top 15 risks. It is applied together with the operational CSD Risk Register (52 risks in 12 categories) as a separate annex.",
    version: 'v1',
    lastReviewDate: '2026-05-31',
    nextReviewDate: '2028-05-31',
    sortOrder: 28,
  },
  {
    code: 'CSD-ORD-01',
    documentType: 'DIRECTIVE',
    accessMode: 'view_only',
    titleUa: 'Наказ про 5-річний цикл перегляду POL-13',
    titleEn: 'Directive on POL-13 5-Year Review Cycle',
    descriptionUa:
      'Наказ Директора, що оформлює рішення про застосування 5-річного циклу перегляду до CSD-POL-13 «Політика щодо захисту дітей» замість стандартного 2-річного. Містить обґрунтування рішення, компенсуючий контрольний механізм і перелік тригерів позачергового перегляду. Створює документальний audit trail для перевірок донорів, внутрішнього аудиту та правової ревізії.',
    descriptionEn:
      "A Director's directive formalising the decision to apply a five-year review cycle to CSD-POL-13 “Child Protection Policy” instead of the standard two-year cycle. It sets out the rationale for the decision, the compensating control mechanism and the triggers for an out-of-cycle review. It creates a documented audit trail for donor compliance checks, internal audit and legal review.",
    version: 'v1',
    lastReviewDate: '2026-05-31',
    nextReviewDate: '2029-03-05',
    sortOrder: 29,
  },
  {
    code: 'CSD-FORM-01',
    documentType: 'TEMPLATE',
    accessMode: 'view_only',
    titleUa: 'Анкета річного перегляду документа',
    titleEn: 'Annual Document Review Questionnaire',
    descriptionUa:
      'Типова форма, за якою власник документа щорічно оцінює актуальність політики, процедури чи положення та потребу в її оновленні. Містить блок відомостей про документ, вісім контрольних питань і поле рекомендованої дії. Заповнена анкета додається до історії змін відповідного документа.',
    descriptionEn:
      'A standard form used by a document owner to assess annually whether a policy, procedure or regulation remains current and needs updating. It contains a document information block, eight review questions and a recommended action field. The completed questionnaire is attached to the revision history of the document concerned.',
    version: 'v1',
    lastReviewDate: '2026-05-31',
    nextReviewDate: '2028-05-31',
    sortOrder: 30,
  },
  {
    code: 'CSD-POL-15',
    documentType: 'POLICY',
    accessMode: 'view_only',
    titleUa:
      'Політика протидії відмиванню коштів та фінансуванню тероризму (AML/CTF)',
    titleEn:
      'Anti-Money Laundering and Counter-Terrorism Financing (AML/CTF) Policy',
    descriptionUa:
      'Захищає фінансові та операційні системи Організації від використання для відмивання коштів, фінансування тероризму чи фінансування розповсюдження зброї масового знищення. Охоплює оцінку ризиків ML/TF, ідентифікацію та верифікацію контрагентів (KYC/CDD), поглиблену перевірку (EDD), санкційний скринінг, моніторинг операцій і звітування про підозрілі операції, зберігання записів та навчання персоналу. Окремий розділ описує компенсуючі контролі при суміщенні ролей MLRO.',
    descriptionEn:
      "Protects the Organisation's financial and operational systems from being used for money laundering, terrorist financing or proliferation financing. It covers ML/TF risk assessment, counterparty identification and verification (KYC/CDD), enhanced due diligence (EDD), sanctions screening, transaction monitoring and suspicious transaction reporting, record retention and staff training. A dedicated section sets out the compensating controls applied where the MLRO role is combined with another function.",
    version: 'v1',
    lastReviewDate: '2026-07-01',
    nextReviewDate: '2028-07-01',
    sortOrder: 31,
  },
  {
    code: 'CSD-POL-16',
    documentType: 'POLICY',
    accessMode: 'view_only',
    titleUa: 'Політика щодо управління запасами та активами',
    titleEn: 'Inventory and Asset Management Policy',
    descriptionUa:
      'Встановлює єдині правила приймання, обліку, зберігання, видачі, інвентаризації, амортизації та списання товарно-матеріальних цінностей і основних засобів. Охоплює класифікацію активів, оприбуткування та складський облік із маркуванням, видачу бенефіціарам і внутрішнє переміщення, інвентаризацію та страхування, а також списання й долю активів після завершення проєкту. Містить вісім форм — від реєстру активів до договору про повну індивідуальну матеріальну відповідальність.',
    descriptionEn:
      'Establishes uniform rules for the receipt, recording, storage, issuance, physical counting, depreciation and write-off of inventory items and fixed assets. It covers asset classification, recognition and warehouse records with asset tagging, issuance to beneficiaries and internal transfers, physical counts and insurance, and write-off and the devolution of assets after project closure. Eight forms are annexed, from the asset register to the agreement on full individual material liability.',
    version: 'v1',
    lastReviewDate: '2025-10-15',
    nextReviewDate: '2028-10-15',
    sortOrder: 32,
  },
];

/**
 * Idempotent — safe to run on every boot (see run-seeds.ts).
 * Requires the UNIQUE index on `code` added by RestructureAboutDocuments1778000000000.
 */
export async function seedAboutDocuments(
  dataSource: DataSource,
): Promise<void> {
  for (const doc of ABOUT_DOCUMENTS) {
    await dataSource.query(
      `INSERT INTO about_documents
         (code, document_type, access_mode, title_ua, title_en,
          description_ua, description_en, version,
          last_review_date, next_review_date, sort_order, is_published)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, false)
       ON CONFLICT (code) DO UPDATE SET
         document_type    = EXCLUDED.document_type,
         title_ua         = EXCLUDED.title_ua,
         title_en         = EXCLUDED.title_en,
         description_ua   = EXCLUDED.description_ua,
         description_en   = EXCLUDED.description_en,
         version          = EXCLUDED.version,
         last_review_date = EXCLUDED.last_review_date,
         next_review_date = EXCLUDED.next_review_date,
         sort_order       = EXCLUDED.sort_order,
         updated_at       = now()`,
      [
        doc.code,
        doc.documentType,
        doc.accessMode,
        doc.titleUa,
        doc.titleEn,
        doc.descriptionUa,
        doc.descriptionEn,
        doc.version,
        doc.lastReviewDate,
        doc.nextReviewDate,
        doc.sortOrder,
      ],
    );
  }
  console.log(
    `[seed] about_documents: ${ABOUT_DOCUMENTS.length} register entries synced`,
  );
}
