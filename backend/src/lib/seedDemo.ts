import bcrypt from 'bcrypt';
import prisma from './prisma';

// Synthetic trial data only. Never invokes the original destructive seed script.
export async function seedDemo() {
  if (process.env.DEMO_MODE !== 'true') return;
  const password = await bcrypt.hash('InternFlowDemo2026!', 10);
  const hr = await prisma.user.upsert({where:{email:'hr@internflow.example.test'},update:{},create:{
    email:'hr@internflow.example.test',password,name:'Demo HR',role:'COMPANY_HR',emailVerifiedAt:new Date(),
    companyProfile:{create:{companyName:'InternFlow Demo Company',industry:'Software & Technology',description:'A fictional company for trying the internship workflow.'}}
  },include:{companyProfile:true}});
  await prisma.user.upsert({where:{email:'student@internflow.example.test'},update:{},create:{
    email:'student@internflow.example.test',password,name:'Demo Student',role:'STUDENT',emailVerifiedAt:new Date(),
    studentProfile:{create:{studentId:'DEMO001',major:'Software Engineering',faculty:'Engineering',year:3,skills:['React','TypeScript']}}
  }});
  const intern = await prisma.user.upsert({where:{email:'intern@internflow.example.test'},update:{},create:{
    email:'intern@internflow.example.test',password,name:'Demo Intern',role:'STUDENT',emailVerifiedAt:new Date(),
    studentProfile:{create:{studentId:'DEMO002',major:'Computer Science',faculty:'Engineering',year:4,skills:['Node.js','PostgreSQL']}}
  },include:{studentProfile:true}});
  if (!hr.companyProfile || !intern.studentProfile) return;
  for (const [id,title,requirements] of [
    ['demo-web-intern','Frontend Developer Intern','React, TypeScript, HTML and CSS'],
    ['demo-api-intern','Backend Developer Intern','Node.js, PostgreSQL and REST APIs'],
    ['demo-design-intern','UX/UI Design Intern','Figma, prototyping and user research']
  ]) {
    await prisma.jobPost.upsert({where:{id},update:{},create:{id,companyProfileId:hr.companyProfile.id,title,
      description:'Try applying, reviewing applications and recording internship work in this fictional placement.',requirements,
      location:'Bangkok / Hybrid',positions:5,allowance:'Demo position',workingHours:'Monday–Friday, 09:00–17:00'}});
  }
  await prisma.application.upsert({where:{studentId_jobPostId:{studentId:intern.studentProfile.id,jobPostId:'demo-api-intern'}},update:{},
    create:{studentId:intern.studentProfile.id,jobPostId:'demo-api-intern',status:'COMMITTED',coverLetter:'Synthetic placement for trying logbooks and evaluations.'}});
}
