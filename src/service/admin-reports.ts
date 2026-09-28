import { database } from "./db";
import { adminOnly } from "./admin";
import { allowedAdminIps } from "./admin-access";
import { ServiceError, text } from "./errors";
import { MODELS } from "../generation/catalog";
import { JOB_STATES, type AdminRows, type AdminList, type AdminDashboard, type AdminJobRow } from "../projects/admin-types";

export type AdminFilters = { search?: string; user?: string; userId?: string; filter?: string; feature?: string; page?: string };
const videoModels = MODELS.filter(m => m.surface === "video").map(m => m.id);
// Only explicitly selected, public job fields cross the service boundary.
const jobsCte = `WITH rows AS (SELECT j.id,j.user_id,u.username,u.name AS owner_name,u.email,j.state,j.request_id,j.project_id,p.document->>'title' AS project_title,j.cost,j.created_at,j.plane->>'model' AS model,COALESCE(j.plane->'prompt'->>'text','') AS prompt,
  CASE WHEN p.document->>'format' IN ('card-news','reels','landing','product-detail') THEN p.document->>'format' WHEN j.plane->>'model'=ANY($1::text[]) THEN 'studio-video' ELSE 'studio-image' END AS feature
  FROM generation_jobs j JOIN users u ON u.id=j.user_id LEFT JOIN projects p ON p.id=j.project_id)`;
const jobFields = "id,user_id,username,owner_name,state,request_id,project_id,project_title,cost,created_at,model,prompt,feature";
function choice(value: string, options: string[]) {
  if (value && !options.includes(value)) throw new ServiceError(400,"필터를 확인해 주세요.");
  return value;
}
export async function adminList<K extends keyof AdminRows>(actorId: string, section: K, filters: AdminFilters = {}): Promise<AdminList<AdminRows[K]>> {
  await adminOnly(actorId);
  if (!["users","projects","activity"].includes(section)) throw new ServiceError(404,"관리 메뉴를 찾을 수 없습니다.");
  const page = Number(filters.page || 1);
  if (!Number.isSafeInteger(page) || page < 1 || page > 100000) throw new ServiceError(400,"페이지를 확인해 주세요.");
  const search=text(filters.search || "","검색",100), user=text(filters.user || "","사용자",100), userId=text(filters.userId || "","사용자",100);
  const filter=choice(filters.filter || "",section==="users"?["admin","member"]:section==="projects"?["active","archived"]:["processing",...Object.keys(JOB_STATES)]);
  const feature=choice(filters.feature || "",section==="projects"?["card-news","reels","landing","product-detail"]:section==="activity"?["card-news","reels","landing","product-detail","studio-image","studio-video"]:[]);
  let cte="", fields="*", where="", order="", params: unknown[]=[];
  if(section==="users") {
    cte=`WITH rows AS (SELECT u.id,u.username,u.name,u.email,u.credits,u.is_admin,u.created_at,
      (SELECT COUNT(*)::INTEGER FROM projects p WHERE p.owner_id=u.id AND p.deleted_at IS NULL) AS projects,
      (SELECT COUNT(*)::INTEGER FROM generation_jobs j WHERE j.user_id=u.id) AS jobs,
      (SELECT COUNT(*)::INTEGER FROM assets a WHERE a.owner_id=u.id) AS files FROM users u)`;
    where="($1='' OR username ILIKE $1 OR name ILIKE $1 OR email ILIKE $1) AND ($2='' OR id=$2) AND ($3='' OR is_admin=($3='admin'))";
    params=[search?`%${search}%`:"",userId,filter]; order="is_admin DESC,created_at DESC,id DESC";
  } else if(section==="projects") {
    cte=`WITH rows AS (SELECT p.id,p.owner_id,u.username,u.name AS owner_name,u.email,p.document,p.document->>'title' AS title,p.document->>'format' AS format,jsonb_array_length(p.document->'slots') AS slots,p.version,p.updated_at,p.deleted_at FROM projects p JOIN users u ON u.id=p.owner_id)`;
    fields="id,owner_id,username,owner_name,document,title,format,slots,version,updated_at,deleted_at";
    where="($1='' OR title ILIKE $1) AND ($2='' OR username ILIKE $2 OR owner_name ILIKE $2 OR email ILIKE $2) AND ($3='' OR owner_id=$3) AND ($4='' OR ($4='active' AND deleted_at IS NULL) OR ($4='archived' AND deleted_at IS NOT NULL)) AND ($5='' OR format=$5)";
    params=[search?`%${search}%`:"",user?`%${user}%`:"",userId,filter,feature]; order="updated_at DESC,id DESC";
  } else {
    cte=jobsCte; fields=jobFields;
    where="($2='' OR prompt ILIKE $2 OR model ILIKE $2 OR request_id ILIKE $2 OR id ILIKE $2 OR project_title ILIKE $2) AND ($3='' OR username ILIKE $3 OR owner_name ILIKE $3 OR email ILIKE $3) AND ($4='' OR user_id=$4) AND ($5='' OR state=$5 OR ($5='processing' AND state IN ('pending','submitting'))) AND ($6='' OR feature=$6)";
    params=[videoModels,search?`%${search}%`:"",user?`%${user}%`:"",userId,filter,feature]; order="created_at DESC,id DESC";
  }
  return (await database()).transaction(async tx=>{
    const [count]=await tx.query<{total:number}>(`${cte} SELECT COUNT(*)::INTEGER AS total FROM rows WHERE ${where}`,params);
    const pages=Math.max(1,Math.ceil(count.total/25)),current=Math.min(page,pages);
    const items=await tx.query<AdminRows[K]>(`${cte} SELECT ${fields} FROM rows WHERE ${where} ORDER BY ${order} LIMIT 25 OFFSET $${params.length+1}`,[...params,(current-1)*25]);
    return {items,total:count.total,page:current,pages};
  });
}
export async function adminDashboard(actorId: string): Promise<AdminDashboard> {
  await adminOnly(actorId);
  return (await database()).transaction(async tx=>{
    const [summary]=await tx.query<Omit<AdminDashboard,"recent"|"allowedIps">>(`SELECT
      (SELECT COUNT(*)::INTEGER FROM users) AS users,
      (SELECT COALESCE(SUM(credits),0)::BIGINT FROM users) AS balance,
      (SELECT COUNT(*)::INTEGER FROM projects WHERE deleted_at IS NULL) AS projects,
      (SELECT COUNT(*)::INTEGER FROM assets) AS files,
      (SELECT COALESCE(SUM(byte_size),0)::BIGINT FROM assets) AS storage,
      (SELECT COALESCE(SUM(amount),0)::BIGINT FROM credit_ledger WHERE kind IN ('grant','demo')) AS granted,
      (SELECT COALESCE(-SUM(amount),0)::BIGINT FROM credit_ledger WHERE kind='hold') AS held,
      (SELECT COALESCE(SUM(amount),0)::BIGINT FROM credit_ledger WHERE kind='refund') AS refunded,
      COUNT(*)::INTEGER AS jobs,
      COUNT(*) FILTER (WHERE state='completed')::INTEGER AS completed,
      COUNT(*) FILTER (WHERE state IN ('pending','submitting'))::INTEGER AS pending,
      COUNT(*) FILTER (WHERE state='failed')::INTEGER AS failed,
      COUNT(*) FILTER (WHERE state='unknown')::INTEGER AS unknown FROM generation_jobs`);
    const recent=await tx.query<AdminJobRow>(`${jobsCte} SELECT ${jobFields} FROM rows ORDER BY created_at DESC,id DESC LIMIT 6`,[videoModels]);
    return {...summary,recent,allowedIps:allowedAdminIps()};
  });
}
