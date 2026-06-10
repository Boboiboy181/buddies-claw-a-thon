import { PrismaClient, $Enums } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { Pool } from 'pg';
import bcrypt from 'bcrypt';
import { v4 as uuidv4 } from 'uuid';

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function main() {
  console.log('Seeding database...');

  // HR User
  const hr = await prisma.hrUser.upsert({
    where: { email: 'hr@demo.com' },
    update: {},
    create: {
      email: 'hr@demo.com',
      password: await bcrypt.hash('demo1234', 10),
      name: 'Demo HR',
      role: 'hr',
    },
  });
  console.log('✓ HR user:', hr.email);

  // Job
  const job = await prisma.job.upsert({
    where: { id: 'seed-job-fe-001' },
    update: {},
    create: {
      id: 'seed-job-fe-001',
      title: 'Senior Frontend Engineer',
      department: 'Engineering',
      level: 'Senior',
      location: 'Ho Chi Minh City',
      employmentType: 'Full-time',
      jdRawText: `We are looking for a Senior Frontend Engineer to join our growing team.

Responsibilities:
- Build and maintain high-quality React applications
- Collaborate with design and backend teams
- Mentor junior developers
- Lead frontend architecture decisions

Requirements:
- 4+ years of React/TypeScript experience
- Strong knowledge of state management (Zustand, Redux)
- Experience with REST APIs and WebSocket
- Familiarity with CI/CD pipelines
- Strong problem-solving skills

Nice to have:
- Experience with Next.js or Vite
- Knowledge of performance optimization
- Open-source contributions`,
      requirements: ['React', 'TypeScript', 'State Management', 'REST APIs', 'WebSocket'],
      status: $Enums.JobStatus.ACTIVE,
      createdBy: hr.id,
    },
  });
  console.log('✓ Job:', job.title);

  // Question Set
  const qs = await prisma.questionSet.upsert({
    where: { id: 'seed-qs-fe-001' },
    update: {},
    create: {
      id: 'seed-qs-fe-001',
      jobId: job.id,
      name: 'Senior FE Interview Set v1',
      version: 1,
      status: $Enums.QuestionSetStatus.ACTIVE,
      createdBy: hr.id,
      questions: {
        create: [
          {
            order: 1,
            text: 'Bạn có thể giới thiệu ngắn gọn về bản thân và kinh nghiệm làm việc với React không?',
            category: $Enums.QuestionCategory.SCREENING,
            expectedSignals: ['React experience', 'Communication', 'Self-awareness'],
            evaluationCriteria: ['Clear communication', 'Relevant experience', 'Conciseness'],
            maxDurationSeconds: 120,
            isRequired: true,
          },
          {
            order: 2,
            text: 'Bạn đã từng xử lý vấn đề performance trong React chưa? Hãy mô tả cách bạn debug và tối ưu?',
            category: $Enums.QuestionCategory.TECHNICAL,
            expectedSignals: ['React.memo', 'useMemo', 'useCallback', 'profiler', 'lazy loading'],
            evaluationCriteria: ['Depth of knowledge', 'Real examples', 'Systematic thinking'],
            maxDurationSeconds: 180,
            isRequired: true,
          },
          {
            order: 3,
            text: 'Kể về một dự án frontend bạn tự hào nhất. Bạn đã giải quyết những thách thức gì?',
            category: $Enums.QuestionCategory.EXPERIENCE,
            expectedSignals: ['Project ownership', 'Problem solving', 'Technical depth', 'Impact'],
            evaluationCriteria: ['Specificity', 'Role clarity', 'Challenge complexity', 'Outcome'],
            maxDurationSeconds: 180,
            isRequired: true,
          },
          {
            order: 4,
            text: 'Khi có conflict về technical decision với team, bạn xử lý như thế nào?',
            category: $Enums.QuestionCategory.BEHAVIORAL,
            expectedSignals: ['Communication', 'Collaboration', 'Pragmatism', 'Leadership'],
            evaluationCriteria: ['Listening skills', 'Evidence-based reasoning', 'Constructive approach'],
            maxDurationSeconds: 150,
            isRequired: true,
          },
          {
            order: 5,
            text: 'Điều gì khiến bạn muốn ứng tuyển vào vị trí này tại công ty chúng tôi?',
            category: $Enums.QuestionCategory.MOTIVATION,
            expectedSignals: ['Research about company', 'Career alignment', 'Genuine interest'],
            evaluationCriteria: ['Specificity', 'Authenticity', 'Cultural fit signals'],
            maxDurationSeconds: 120,
            isRequired: true,
          },
        ],
      },
    },
  });
  console.log('✓ Question set:', qs.name);

  // Candidates
  const candidate1 = await prisma.candidate.upsert({
    where: { email: 'nguyen.van.a@email.com' },
    update: {},
    create: {
      email: 'nguyen.van.a@email.com',
      fullName: 'Nguyễn Văn A',
      phone: '0901234567',
      cvParsedText: `Nguyễn Văn A - Senior Frontend Engineer
Email: nguyen.van.a@email.com | Phone: 0901234567

EXPERIENCE:
- TechCorp Vietnam (2021-present): Senior Frontend Engineer
  React, TypeScript, Next.js, GraphQL, AWS
- StartupXYZ (2019-2021): Frontend Developer
  Vue.js, Nuxt.js, REST APIs

SKILLS:
React, TypeScript, Next.js, Vue.js, GraphQL, REST APIs, Git, Docker, AWS S3

EDUCATION:
Bachelor of Computer Science - HCMUT (2015-2019)`,
    },
  });

  const candidate2 = await prisma.candidate.upsert({
    where: { email: 'tran.thi.b@email.com' },
    update: {},
    create: {
      email: 'tran.thi.b@email.com',
      fullName: 'Trần Thị B',
      phone: '0912345678',
      cvParsedText: `Trần Thị B - Frontend Engineer
Email: tran.thi.b@email.com | Phone: 0912345678

EXPERIENCE:
- DigitalAgency (2020-present): Frontend Engineer
  React, TypeScript, Tailwind CSS, Redux
- Freelance (2018-2020): Web Developer
  HTML, CSS, JavaScript, WordPress

SKILLS:
React, TypeScript, Redux, Tailwind CSS, Figma, REST APIs

EDUCATION:
Bachelor of Information Technology - UIT (2014-2018)`,
    },
  });
  console.log('✓ Candidates:', candidate1.fullName, '+', candidate2.fullName);

  // Interview sessions
  const interview1 = await prisma.interview.upsert({
    where: { id: 'seed-interview-001' },
    update: {},
    create: {
      id: 'seed-interview-001',
      candidateId: candidate1.id,
      jobId: job.id,
      questionSetId: qs.id,
      questionSetSnapshotJson: [],
      status: $Enums.InterviewStatus.CREATED,
      state: $Enums.InterviewState.INIT,
      accessToken: uuidv4(),
      createdBy: hr.id,
    },
  });

  const interview2 = await prisma.interview.upsert({
    where: { id: 'seed-interview-002' },
    update: {},
    create: {
      id: 'seed-interview-002',
      candidateId: candidate2.id,
      jobId: job.id,
      questionSetId: qs.id,
      questionSetSnapshotJson: [],
      status: $Enums.InterviewStatus.CREATED,
      state: $Enums.InterviewState.INIT,
      accessToken: uuidv4(),
      createdBy: hr.id,
    },
  });
  console.log('✓ Interviews created:', interview1.id, '+', interview2.id);

  console.log('\n✅ Seed complete!');
  console.log('   HR login: hr@demo.com / demo1234');
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
