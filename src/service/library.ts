import { database } from "./db";
import { adminOnly } from "./admin";
import { assetFile } from "./assets";
import { ServiceError, text } from "./errors";
import { LIBRARY_FEATURES, type LibraryResult, type LibraryItem } from "@/projects/library";

export interface LibraryFilters { feature?: string; kind?: string; search?: string; user?: string; userId?: string; page?: string }
const PAGE_SIZE = 24;
export async function libraryList(actorId: string, filters: LibraryFilters = {}, admin = false): Promise<LibraryResult> {
  if (admin) await adminOnly(actorId);
  const feature = filters.feature || "", kind = filters.kind || "";
  if (feature && !Object.hasOwn(LIBRARY_FEATURES,feature)) throw new ServiceError(400,"기능 필터를 확인해 주세요.");
  if (kind && !["image","video","audio","file"].includes(kind)) throw new ServiceError(400,"파일 형식을 확인해 주세요.");
  const requestedPage = Number(filters.page || 1);
  if (!Number.isSafeInteger(requestedPage) || requestedPage < 1 || requestedPage > 100000) throw new ServiceError(400,"페이지를 확인해 주세요.");
  const search = text(filters.search || "","검색",100), user = admin ? text(filters.user || "","사용자",100) : "";
  const ownerId = admin ? text(filters.userId || "","사용자",100) : actorId;
  // Expand every output in a batch, including studio runs that have no project or copied asset.
  const cte = `WITH jobs AS (
    SELECT j.id,j.user_id,j.result,j.plane,j.project_id,j.created_at,p.document,p.deleted_at
    FROM generation_jobs j LEFT JOIN projects p ON p.id=j.project_id
    WHERE j.state='completed' AND ($1='' OR j.user_id=$1)
  ), generated AS (
    SELECT j.*,m.url,m.kind,m.ordinal FROM jobs j CROSS JOIN LATERAL (
      SELECT i.value->>'url' AS url,'image'::text AS kind,i.ordinality::text AS ordinal
      FROM jsonb_array_elements(CASE WHEN jsonb_typeof(j.result->'images')='array' THEN j.result->'images' ELSE '[]'::jsonb END) WITH ORDINALITY AS i(value,ordinality)
      UNION ALL SELECT j.result->'video'->>'url','video','video' WHERE j.result->'video'->>'url' IS NOT NULL
    ) m WHERE m.url LIKE 'https://%'
  ), media AS (
    SELECT 'job:'||id||':'||ordinal AS id,user_id AS owner_id,
      CASE WHEN document->>'format' IN ('card-news','reels','landing','product-detail') THEN document->>'format' ELSE 'studio-'||kind END AS feature,
      kind,COALESCE(document->>'title',CASE WHEN kind='video' THEN '스튜디오 영상' ELSE '스튜디오 이미지' END) AS name,
      COALESCE(plane->'prompt'->>'text','') AS prompt,COALESCE(plane->>'model','') AS model,url,project_id,deleted_at IS NOT NULL AS project_deleted,created_at
    FROM generated
    UNION ALL
    SELECT 'asset:'||a.id,a.owner_id,CASE WHEN p.document->>'format' IN ('card-news','reels','landing','product-detail') THEN p.document->>'format' ELSE 'files' END,
      CASE WHEN a.mime LIKE 'image/%' THEN 'image' WHEN a.mime LIKE 'video/%' THEN 'video' WHEN a.mime LIKE 'audio/%' THEN 'audio' ELSE 'file' END,
      a.name,'','',$2||a.id,a.project_id,p.deleted_at IS NOT NULL,a.created_at
      FROM assets a LEFT JOIN projects p ON p.id=a.project_id WHERE ($1='' OR a.owner_id=$1)
  ), filtered AS (
    SELECT m.*,u.name AS owner_name,u.username FROM media m JOIN users u ON u.id=m.owner_id
    WHERE ($3='' OR m.feature=$3) AND ($4='' OR m.kind=$4)
      AND ($5='' OR m.name ILIKE $5 OR m.prompt ILIKE $5 OR m.model ILIKE $5)
      AND ($6='' OR u.username ILIKE $6 OR u.name ILIKE $6 OR u.email ILIKE $6)
  )`;
  const params = [ownerId,admin ? "/api/workspace/admin/library-file/" : "/api/workspace/assets/",feature,kind,search ? `%${search}%` : "",user ? `%${user}%` : ""];
  return (await database()).transaction(async tx => {
    const [count] = await tx.query<{total:number}>(`${cte} SELECT COUNT(*)::INTEGER AS total FROM filtered`,params);
    const pages = Math.max(1,Math.ceil(count.total/PAGE_SIZE)), page = Math.min(requestedPage,pages);
    const rows = await tx.query<Record<string,unknown>>(`${cte} SELECT * FROM filtered ORDER BY created_at DESC,id DESC LIMIT 24 OFFSET $7`,[...params,(page-1)*PAGE_SIZE]);
    const items = rows.map(r=>({id:r.id,ownerId:r.owner_id,ownerName:r.owner_name,username:r.username,feature:r.feature,kind:r.kind,name:r.name,prompt:r.prompt,model:r.model,url:r.url,projectId:r.project_id,projectDeleted:r.project_deleted,createdAt:Number(r.created_at)} as LibraryItem));
    return {items,total:count.total,page,pages};
  });
}
export async function adminLibraryFile(actorId:string,id:string) {
  await adminOnly(actorId);
  const [row]=await(await database()).query<{owner_id:string}>("SELECT owner_id FROM assets WHERE id=$1",[id]);
  if (!row) throw new ServiceError(404,"파일을 찾을 수 없습니다.");
  return assetFile(row.owner_id,id);
}
