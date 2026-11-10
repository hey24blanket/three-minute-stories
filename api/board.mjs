import {createHash} from 'node:crypto';
import {get, put, BlobPreconditionFailedError} from '@vercel/blob';
import {apply, readers, reviewQueue, starter} from '../lib/board.mjs';

const initial = () => starter(process.env.OPENING_DRAFT);
const reply = board => ({stories:board.stories.map(reviewQueue),readers});

async function load(path) {
  const result = await get(path,{access:'private',useCache:false});
  if (!result) return {board:initial(),etag:null};
  if (result.statusCode!==200 || !result.blob.etag) throw new Error('Invalid storage response');
  return {board:await new Response(result.stream).json(),etag:result.blob.etag};
}

async function save(path, board, etag) {
  await put(path,JSON.stringify(board),{access:'private',addRandomSuffix:false,contentType:'application/json',
    ...(etag?{allowOverwrite:true,ifMatch:etag}:{allowOverwrite:false})});
}

export default async function handler(req,res) {
  res.setHeader('Cache-Control','private, no-store');
  if (!['GET','POST'].includes(req.method)) {
    res.setHeader('Allow','GET, POST');
    return res.status(405).json({error:'지원하지 않는 요청 방식입니다.'});
  }
  const key=/^Bearer ([a-f0-9]{64})$/.exec(req.headers.authorization||'')?.[1];
  if (!key) {
    if (req.method==='GET' && !req.headers.authorization) return res.status(200).json(reply(initial()));
    return res.status(401).json({error:'작업실 연결 키가 필요합니다.'});
  }
  const path='boards/'+createHash('sha256').update(key).digest('hex')+'.json';
  try {
    if (req.method==='GET') return res.status(200).json(reply((await load(path)).board));
    if (!String(req.headers['content-type']).startsWith('application/json')) return res.status(415).json({error:'JSON 요청만 허용됩니다.'});
    const input=typeof req.body==='string'?JSON.parse(req.body):req.body;
    if (JSON.stringify(input??null).length>40000) return res.status(413).json({error:'요청이 너무 큽니다.'});
    for (let attempt=0;attempt<4;attempt++) {
      const {board,etag}=await load(path);
      if (!apply(board,input)) return res.status(200).json(reply(board));
      try {
        await save(path,board,etag);
        return res.status(200).json(reply(board));
      } catch (error) {
        if (error instanceof BlobPreconditionFailedError) continue;
        if (etag || !(await load(path)).etag) throw error;
      }
    }
    return res.status(409).json({error:'동시에 변경된 내용이 있습니다. 다시 시도해 주세요.'});
  } catch (error) {
    const status=error.status ?? (error instanceof SyntaxError?400:503);
    if (status===503) console.error('Board storage unavailable',error.name);
    return res.status(status).json({error:status===503?'작업실에 연결할 수 없습니다. 잠시 후 다시 시도해 주세요.':error.message});
  }
}
