import { PrismaClient, Role } from '@prisma/client';
import bcrypt from 'bcryptjs';
const db = new PrismaClient();
async function main(){
 const password=await bcrypt.hash('demo1234',12);
 await db.user.deleteMany();
 const patient=await db.user.create({data:{name:'Demo Patient',phone:'9999999999',passwordHash:password,role:Role.PATIENT}});
 await db.medicine.create({data:{userId:patient.id,name:'Paracetamol',dose:'500 mg',quantity:30,remaining:12,dosesPerDay:2,nextRefillDate:new Date(Date.now()+6*86400000)}});
 const pharmacyUser=await db.user.create({data:{name:'Demo Pharmacy',phone:'8888888888',passwordHash:password,role:Role.PHARMACY}});
 const pharmacy=await db.pharmacy.create({data:{userId:pharmacyUser.id,name:'MedBridge Pharmacy',address:'Srinagar, Jammu & Kashmir',lat:34.0837,lng:74.7973,verified:true}});
 await db.inventory.create({data:{pharmacyId:pharmacy.id,medicineName:'Paracetamol',quantity:100,unitPrice:12}});
 await db.user.create({data:{name:'Demo Admin',phone:'7777777777',passwordHash:password,role:Role.ADMIN}});
}
main().finally(()=>db.$disconnect());