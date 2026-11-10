import {loadWorkspace} from '../lib/storage.mjs';

export default async function handler(req, res) {
  res.setHeader('Cache-Control', 'private, no-store');
  if (req.method !== 'GET' || process.env.VERCEL_ENV !== 'preview' ||
    process.env.VERCEL_GIT_COMMIT_REF !== 'editor-feedback') return res.status(404).json({error: 'Not found'});

  const id = process.env.EDITOR_WORKSPACE_ID;
  if (!/^[a-f0-9]{64}$/.test(id ?? '')) return res.status(200).json({connected: false, items: {}});

  try {
    const {board} = await loadWorkspace('boards/'+id+'.json');
    return res.status(200).json({connected: true, items: board.editorialFeedback ?? {}});
  } catch (error) {
    console.error('Editor workspace could not be read', error.name);
    return res.status(503).json({error: 'Workspace unavailable'});
  }
}
