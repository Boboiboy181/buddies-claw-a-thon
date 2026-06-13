import 'dotenv/config';
import { PrismaClient, $Enums } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { Pool } from 'pg';
import bcrypt from 'bcrypt';

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

  // Second job — gives the jobs list more to show and demonstrates filtering.
  const backendJob = await prisma.job.upsert({
    where: { id: 'seed-job-be-001' },
    update: {},
    create: {
      id: 'seed-job-be-001',
      title: 'Senior Backend Engineer',
      department: 'Engineering',
      level: 'Senior',
      location: 'Ho Chi Minh City',
      employmentType: 'Full-time',
      jdRawText: `We are hiring a Senior Backend Engineer to design and scale our core services.

Responsibilities:
- Design, build, and operate backend services (NestJS / Node.js)
- Own data modeling and database performance (PostgreSQL)
- Build reliable async pipelines with message queues
- Define API contracts and integration patterns

Requirements:
- 4+ years building production backend systems
- Strong TypeScript / Node.js and SQL fundamentals
- Experience with queues (BullMQ, Kafka, or similar)
- Solid grasp of observability, testing, and CI/CD

Nice to have:
- Experience with WebSockets / real-time systems
- Familiarity with cloud infra and Docker`,
      requirements: ['Node.js', 'TypeScript', 'PostgreSQL', 'Message Queues', 'API Design'],
      status: $Enums.JobStatus.ACTIVE,
      createdBy: hr.id,
    },
  });
  console.log('✓ Job:', backendJob.title);

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

  // ─── Completed interview (REPORT_READY) with a full report ───────────────────
  // This is the headline demo: HR opens it and sees transcripts + an AI report.
  const completed = await prisma.interview.upsert({
    where: { id: 'seed-interview-001' },
    update: {
      status: $Enums.InterviewStatus.REPORT_READY,
      state: $Enums.InterviewState.REPORT_READY,
    },
    create: {
      id: 'seed-interview-001',
      candidateId: candidate1.id,
      jobId: job.id,
      questionSetId: qs.id,
      questionSetSnapshotJson: [],
      status: $Enums.InterviewStatus.REPORT_READY,
      state: $Enums.InterviewState.REPORT_READY,
      accessToken: 'demo-completed-token',
      currentQuestionIndex: 5,
      consentAcceptedAt: new Date('2024-01-10T09:00:00Z'),
      startedAt: new Date('2024-01-10T09:01:00Z'),
      endedAt: new Date('2024-01-10T09:35:00Z'),
      createdBy: hr.id,
    },
  });

  // Snapshot the question set into per-interview questions with deterministic ids,
  // then attach a transcribed answer to each.
  const seedQuestions = [
    {
      id: 'seed-iq-001',
      order: 1,
      text: 'Bạn có thể giới thiệu ngắn gọn về bản thân và kinh nghiệm làm việc với React không?',
      category: 'SCREENING',
      transcript:
        'Mình là Nguyễn Văn A, có khoảng 5 năm kinh nghiệm frontend, trong đó 3 năm gần đây làm Senior với React và TypeScript tại TechCorp. Mình đã dẫn dắt việc migrate một ứng dụng lớn sang Next.js.',
      score: 8,
    },
    {
      id: 'seed-iq-002',
      order: 2,
      text: 'Bạn đã từng xử lý vấn đề performance trong React chưa? Hãy mô tả cách bạn debug và tối ưu?',
      category: 'TECHNICAL',
      transcript:
        'Có, mình dùng React Profiler để tìm component re-render thừa, sau đó áp dụng React.memo, useMemo và useCallback hợp lý. Với danh sách dài mình dùng virtualization. Mình cũng tách bundle bằng lazy loading để giảm thời gian tải ban đầu.',
      score: 9,
    },
    {
      id: 'seed-iq-003',
      order: 3,
      text: 'Kể về một dự án frontend bạn tự hào nhất. Bạn đã giải quyết những thách thức gì?',
      category: 'EXPERIENCE',
      transcript:
        'Dự án dashboard realtime cho khách hàng doanh nghiệp. Thách thức lớn nhất là đồng bộ dữ liệu qua WebSocket mà vẫn giữ UI mượt. Mình thiết kế lớp state tách biệt và debounce các update, kết quả giảm 60% số lần render.',
      score: 8,
    },
    {
      id: 'seed-iq-004',
      order: 4,
      text: 'Khi có conflict về technical decision với team, bạn xử lý như thế nào?',
      category: 'BEHAVIORAL',
      transcript:
        'Mình ưu tiên lắng nghe lý do của mọi người, đưa ra dữ liệu thay vì cảm tính, và nếu cần thì làm một spike nhỏ để so sánh. Cuối cùng team cùng quyết định dựa trên trade-off rõ ràng.',
      score: 7,
    },
    {
      id: 'seed-iq-005',
      order: 5,
      text: 'Điều gì khiến bạn muốn ứng tuyển vào vị trí này tại công ty chúng tôi?',
      category: 'MOTIVATION',
      transcript:
        'Mình thích bài toán sản phẩm AI tuyển dụng vì nó tác động trực tiếp đến trải nghiệm con người. Mình cũng đọc về văn hóa kỹ thuật của công ty và thấy phù hợp với cách mình muốn làm việc.',
      score: 8,
    },
  ];

  for (const q of seedQuestions) {
    await prisma.interviewQuestion.upsert({
      where: { id: q.id },
      update: {},
      create: {
        id: q.id,
        interviewId: completed.id,
        order: q.order,
        text: q.text,
        category: q.category,
        expectedSignals: [],
        evaluationCriteria: [],
        maxDurationSeconds: 180,
        isRequired: true,
      },
    });
    await prisma.interviewAnswer.upsert({
      where: { questionId: q.id },
      update: {},
      create: {
        id: `seed-ia-${q.order.toString().padStart(3, '0')}`,
        interviewId: completed.id,
        questionId: q.id,
        transcript: q.transcript,
        durationSeconds: 95 + q.order * 10,
      },
    });
  }

  await prisma.interviewReport.upsert({
    where: { interviewId: completed.id },
    update: {},
    create: {
      interviewId: completed.id,
      summary:
        'Strong senior frontend candidate. Demonstrates deep, evidence-backed knowledge of React performance optimization and real-time UI architecture. Communication is clear and concise; behavioral answers show pragmatic, data-driven collaboration. Recommend advancing to an onsite technical round.',
      qaAnalysisJson: seedQuestions.map((q) => ({
        questionId: q.id,
        question: q.text,
        answerTranscript: q.transcript,
        answerSummary:
          q.order === 2
            ? 'Lists concrete optimization techniques (Profiler, memoization, virtualization, code-splitting) with appropriate trade-offs.'
            : 'Relevant, specific answer backed by a real example.',
        strengths:
          q.order === 2
            ? ['Systematic debugging approach', 'Knows when (not just how) to memoize']
            : ['Specific and concise', 'Backed by real experience'],
        concerns: q.order === 4 ? ['Could give a more concrete conflict example'] : [],
        evidenceQuotes: [q.transcript.slice(0, 80) + '…'],
        score: q.score,
        scoreReason: 'Answer maps directly to the role rubric with verifiable detail.',
      })),
      cvMatchAnalysisJson: {
        matchedClaims: ['5 years React experience', 'Next.js migration leadership', 'TypeScript proficiency'],
        missingOrUnclearClaims: ['Specific team size led'],
        inconsistenciesToReview: [],
      },
      jdFitAnalysisJson: {
        matchingSkills: ['React', 'TypeScript', 'Performance optimization', 'WebSocket / real-time'],
        gaps: ['CI/CD depth not probed in this interview'],
        roleFitSummary: 'Strong fit for the Senior Frontend Engineer requirements.',
      },
      audioReviewSignalsJson: {
        speakingDurationSeconds: 540,
        longPauses: [],
        speakingPace: 'normal',
        notes: ['Clear articulation throughout.'],
      },
      videoReviewSignalsJson: {
        facePresenceRatio: null,
        cameraOffPeriods: [],
        reviewHighlights: [],
        notes: ['Based on available data only. These are observational signals, not psychological assessments.'],
      },
      rubricScoresJson: [
        { criterion: 'Technical depth', score: 9, reason: 'Detailed performance optimization knowledge.', evidence: ['Q2 answer'] },
        { criterion: 'Communication', score: 8, reason: 'Concise and well-structured.', evidence: ['Q1, Q3 answers'] },
        { criterion: 'Collaboration', score: 7, reason: 'Pragmatic, data-driven conflict resolution.', evidence: ['Q4 answer'] },
      ],
      recommendation: {
        decision: 'yes',
        reason: 'Meets or exceeds the bar on technical depth and communication; no significant concerns.',
        followUpQuestions: [
          'Walk through a recent CI/CD pipeline you owned.',
          'Describe a time a performance optimization backfired and what you learned.',
        ],
      },
      riskFlagsJson: [],
    },
  });
  console.log('✓ Completed interview + report:', completed.id);

  // ─── Pending interview (INVITED) with a STABLE token for demoing the candidate flow ──
  const pending = await prisma.interview.upsert({
    where: { id: 'seed-interview-002' },
    update: { accessToken: 'demo-candidate-token' },
    create: {
      id: 'seed-interview-002',
      candidateId: candidate2.id,
      jobId: job.id,
      questionSetId: qs.id,
      questionSetSnapshotJson: [],
      status: $Enums.InterviewStatus.INVITED,
      state: $Enums.InterviewState.INIT,
      accessToken: 'demo-candidate-token',
      createdBy: hr.id,
    },
  });
  console.log('✓ Pending interview:', pending.id, '(token: demo-candidate-token)');

  console.log('\n✅ Seed complete!');
  console.log('   HR login:        hr@demo.com / demo1234');
  console.log('   Candidate link:  /interview/demo-candidate-token');
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
