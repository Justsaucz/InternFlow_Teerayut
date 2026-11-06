import dotenv from 'dotenv';
dotenv.config();

import bcrypt from 'bcrypt';
import prisma from '../lib/prisma';

async function main() {
  console.log('🔄 Starting clean database reset for InternFlow...');

  // 1. Clean out existing data in reverse foreign key order
  console.log('🗑️  Deleting existing records...');
  await prisma.internshipEvaluation.deleteMany({});
  await prisma.dailyLog.deleteMany({});
  await prisma.weeklyLog.deleteMany({});
  await prisma.document.deleteMany({});
  await prisma.application.deleteMany({});
  await prisma.jobPost.deleteMany({});
  await prisma.studentProfile.deleteMany({});
  await prisma.companyProfile.deleteMany({});
  await prisma.user.deleteMany({});
  console.log('✨ All old tables cleared successfully.');

  // 2. Hash default password
  const hashedPassword = await bcrypt.hash('password123', 10);

  // 3. Create Demo Company 1 (TechCorp)
  console.log('🏢 Creating TechCorp HR Account...');
  const hrUser1 = await prisma.user.create({
    data: {
      email: 'hr@techcorp.com',
      password: hashedPassword,
      name: 'Sarah Jenkins (HR Lead)',
      role: 'COMPANY_HR',
      companyProfile: {
        create: {
          companyName: 'TechCorp Solutions (Thailand)',
          industry: 'Cloud Software & Enterprise Solutions',
          website: 'https://techcorp.example.com',
          description: 'Leading regional cloud architecture and enterprise software consultancy.',
          address: 'AIA Sathorn Tower, 18th Floor, South Sathorn Rd, Yannawa, Sathon, Bangkok 10120',
          contactEmail: 'careers@techcorp.example.com',
          contactPhone: '+66 2 123 4567'
        }
      }
    },
    include: { companyProfile: true }
  });

  // 4. Create Demo Company 2 (Innovate Labs)
  console.log('🏢 Creating Innovate Labs HR Account...');
  const hrUser2 = await prisma.user.create({
    data: {
      email: 'hr@innovate.co',
      password: hashedPassword,
      name: 'David Chen (Talent Acquisition)',
      role: 'COMPANY_HR',
      companyProfile: {
        create: {
          companyName: 'Innovate Labs Co., Ltd.',
          industry: 'AI & Data Platforms',
          website: 'https://innovatelabs.example.com',
          description: 'High-growth technology firm specializing in generative AI and cloud infrastructure.',
          address: 'True Digital Park, West Wing, Sukhumvit 101, Phra Khanong, Bangkok 10260',
          contactEmail: 'talent@innovatelabs.example.com',
          contactPhone: '+66 2 987 6543'
        }
      }
    },
    include: { companyProfile: true }
  });

  // 5. Create Job Postings
  console.log('💼 Creating Job Postings...');
  const job1 = await prisma.jobPost.create({
    data: {
      companyProfileId: hrUser1.companyProfile!.id,
      title: 'Full-Stack Developer Intern',
      description: 'Join our agile core engineering team building high-performance cloud platforms with React, Node.js, and AWS.',
      requirements: '- Strong fundamentals in TypeScript, React, and REST APIs\n- Familiarity with PostgreSQL and Docker\n- Passion for clean code and modern web architectures',
      location: 'Bangkok (Sathorn) / Hybrid',
      isRemote: false,
      positions: 3,
      allowance: '18,000 THB / month',
      workingHours: 'Mon - Fri, 09:00 - 18:00',
      contactEmail: 'careers@techcorp.example.com',
      contactPhone: '+66 2 123 4567',
      contactLine: '@techcorp_careers',
      isActive: true
    }
  });

  await prisma.jobPost.create({
    data: {
      companyProfileId: hrUser1.companyProfile!.id,
      title: 'Cloud & DevOps Engineering Intern',
      description: 'Gain hands-on experience designing and operating AWS cloud infrastructure with Terraform, Docker, and ECS Fargate.',
      requirements: '- Basic understanding of Linux, Docker, and CI/CD pipelines\n- Exposure to AWS primitives (VPC, ECS, S3, RDS)\n- Eagerness to learn site reliability engineering practices',
      location: 'Bangkok (Sathorn)',
      isRemote: false,
      positions: 2,
      allowance: '20,000 THB / month',
      workingHours: 'Mon - Fri, 09:30 - 18:30',
      contactEmail: 'careers@techcorp.example.com',
      contactPhone: '+66 2 123 4567',
      contactLine: '@techcorp_careers',
      isActive: true
    }
  });

  const job3 = await prisma.jobPost.create({
    data: {
      companyProfileId: hrUser2.companyProfile!.id,
      title: 'Frontend React Engineer Intern',
      description: 'Craft responsive, pixel-perfect user interfaces and dashboards using React 19, Tailwind CSS, and TypeScript.',
      requirements: '- Proficiency in modern JavaScript/TypeScript and React Hooks\n- Eye for design detail and CSS/Tailwind responsiveness\n- Knowledge of state management and REST API integration',
      location: 'Sukhumvit 101 / Remote',
      isRemote: true,
      positions: 2,
      allowance: '16,000 THB / month',
      workingHours: 'Mon - Fri, 10:00 - 19:00',
      contactEmail: 'talent@innovatelabs.example.com',
      contactPhone: '+66 2 987 6543',
      contactLine: '@innovate_talent',
      isActive: true
    }
  });

  // 6. Create Demo Student Account
  console.log('🎓 Creating Demo Student Account...');
  const studentUser = await prisma.user.create({
    data: {
      email: 'student@internflow.com',
      password: hashedPassword,
      name: 'Alex Rivers',
      role: 'STUDENT',
      studentProfile: {
        create: {
          studentId: '6409612345',
          university: 'Thammasat University (SIIT)',
          faculty: 'School of Information, Computer and Communication Technology',
          major: 'Computer Engineering',
          year: 3,
          gpa: 3.75,
          skills: ['React', 'TypeScript', 'Node.js', 'PostgreSQL', 'Docker', 'AWS', 'Tailwind CSS'],
          bio: 'Passionate 3rd-year Computer Engineering student with a strong interest in cloud infrastructure and scalable full-stack web applications.'
        }
      }
    },
    include: { studentProfile: true }
  });

  // 7. Create Active Committed Placement at TechCorp and Auto-Closed Application at Innovate
  console.log('📝 Creating active committed placement for Alex Rivers at TechCorp...');
  const appTechCorp = await prisma.application.create({
    data: {
      studentId: studentUser.studentProfile!.id,
      jobPostId: job1.id,
      status: 'COMMITTED',
      coverLetter: 'I am excited to apply for the Full-Stack Developer Intern position at TechCorp Solutions. With my strong background in React, TypeScript, and modern relational database architectures, I am eager to contribute to your engineering team while learning industry best practices.'
    }
  });

  await prisma.application.create({
    data: {
      studentId: studentUser.studentProfile!.id,
      jobPostId: job3.id,
      status: 'REJECTED',
      coverLetter: 'I am passionate about building responsive, high-performance web applications and design systems. I would love the opportunity to contribute to Innovate Labs.'
    }
  });

  // 8. Create Sample Daily Logs for Alex Rivers (Week 1: Monday - Friday, 8.0 hrs/day = 40.0 hrs)
  console.log('📖 Creating sample Daily Logs (Week 1)...');
  const week1Days = [
    {
      date: new Date('2026-08-03T09:00:00Z'),
      tasks: ['Onboarding session with HR Lead Sarah Jenkins', 'Workstation setup: Installed Node 20, Docker, and VSCode', 'Cloned repository and configured local PostgreSQL database'],
      problems: 'NPM package installation was slow due to network proxy. Solved by setting registry mirror.',
      learnings: 'Understood TechCorp team workflow, Git branching conventions, and Slack channels.',
      hours: 8.0,
      isBackdated: false
    },
    {
      date: new Date('2026-08-04T09:00:00Z'),
      tasks: ['Attended daily engineering standup', 'Explored Prisma 7 schema and migration scripts', 'Drafted architecture diagram for intern management service'],
      problems: 'Encountered duplicate UUID key collision in test mock. Fixed with uuidv4 generator.',
      learnings: 'Deep-dived into Prisma client query optimization and relations modeling.',
      hours: 8.0,
      isBackdated: false
    },
    {
      date: new Date('2026-08-05T09:00:00Z'),
      tasks: ['Built JWT authentication middleware', 'Added bcrypt password hashing with 10 salt rounds', 'Configured CORS headers for React frontend integration'],
      problems: null,
      learnings: 'Mastered Express 5 request-response pipeline and typed request interfaces.',
      hours: 8.0,
      isBackdated: false
    },
    {
      date: new Date('2026-08-06T09:00:00Z'),
      tasks: ['Pair programmed with Senior Dev on S3 upload service', 'Integrated Multer-S3 with automatic local disk fallback', 'Added file size limit validation (10 MB)'],
      problems: 'Local dev lacked AWS credentials. Implemented local disk storage condition check.',
      learnings: 'Learned AWS SDK v3 modular client architecture and S3 PutObject commands.',
      hours: 8.0,
      isBackdated: true // Sample backdated log
    },
    {
      date: new Date('2026-08-07T09:00:00Z'),
      tasks: ['Conducted sprint review demonstration with TechCorp mentors', 'Fixed UI responsiveness issues on tablet viewports', 'Documented week 1 deliverables and code PR'],
      problems: null,
      learnings: 'Gained confidence presenting technical implementations during sprint demos.',
      hours: 8.0,
      isBackdated: false
    }
  ];

  for (const day of week1Days) {
    await prisma.dailyLog.create({
      data: {
        studentId: studentUser.studentProfile!.id,
        applicationId: appTechCorp.id,
        logDate: day.date,
        weekNumber: 1,
        hoursWorked: day.hours,
        workModality: 'ON_SITE',
        supervisorName: 'Sarah Jenkins (HR Lead / Engineering Mentor)',
        tasksDone: JSON.stringify(day.tasks),
        problemsAndSolutions: day.problems,
        learnings: day.learnings,
        isBackdated: day.isBackdated,
        mentorApproved: false
      }
    });
  }

  console.log('✅ Database reset completed successfully with 5 daily logs!');
  console.log('----------------------------------------------------');
  console.log('🔑 Credentials Summary:');
  console.log('👨‍🎓 Student Account:');
  console.log('   Email:    student@internflow.com');
  console.log('   Password: password123');
  console.log('🏢 Company HR Account 1 (TechCorp):');
  console.log('   Email:    hr@techcorp.com');
  console.log('   Password: password123');
  console.log('🏢 Company HR Account 2 (Innovate Labs):');
  console.log('   Email:    hr@innovate.co');
  console.log('   Password: password123');
  console.log('----------------------------------------------------');
}

main()
  .catch((e) => {
    console.error('❌ Error resetting database:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
