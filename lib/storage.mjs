import {get, put} from '@vercel/blob';

export async function loadWorkspace(path) {
  const result = await get(path, {access: 'private', useCache: false});
  if (!result) return {board: {stories: []}, etag: null};
  if (result.statusCode !== 200 || !result.blob.etag) throw new Error('Invalid storage response');
  return {board: await new Response(result.stream).json(), etag: result.blob.etag};
}

export async function saveWorkspace(path, board, etag) {
  await put(path, JSON.stringify(board), {
    access: 'private',
    addRandomSuffix: false,
    contentType: 'application/json',
    ...(etag ? {allowOverwrite: true, ifMatch: etag} : {allowOverwrite: false})
  });
}
