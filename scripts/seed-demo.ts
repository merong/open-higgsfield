import { seedDemo } from "../src/service/demo";
if (process.env.NODE_ENV === "production") throw new Error("데모 계정 초기화는 로컬 개발 환경에서만 실행하세요.");
console.log(await seedDemo());
process.exit(0);
