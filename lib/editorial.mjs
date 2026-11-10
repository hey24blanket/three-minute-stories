import {readdirSync, readFileSync} from 'node:fs';
import {apply} from './board.mjs';

const directory = new URL('../editorial/', import.meta.url);
const catalog = readdirSync(directory)
  .filter(name => name.endsWith('.json'))
  .map(name => JSON.parse(readFileSync(new URL(name, directory), 'utf8')))
  .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
const byId = new Map(catalog.map(story => [story.id, story]));

export function isEditorial(id) {
  return byId.has(id);
}

function openingWasEdited(story, oldOpening) {
  return story.title !== '상자 아래의 세계' || story.genre !== '판타지' ||
    story.versions[0].body !== oldOpening || story.versions.length > 1;
}

export function prepareWorkspace(board, oldOpening) {
  if (!isEditorial('opening')) return;
  const index = board.stories.findIndex(story => story.id === 'opening');
  if (index === -1) return;
  const story = board.stories[index];
  if (openingWasEdited(story, oldOpening)) {
    story.id = 'opening-personal';
    return;
  }
  if (story.versions[0].comments.length) {
    board.editorialFeedback ??= {};
    board.editorialFeedback.opening ??= {
      1: {comments: story.versions[0].comments, ratings: {}}
    };
  }
  board.stories.splice(index, 1);
}

function forVersion(board, id, version) {
  return board.editorialFeedback?.[id]?.[version] ?? {comments: [], ratings: {}};
}

export function editorialStories(board) {
  return catalog.map(story => ({
    ...story,
    editorial: true,
    versions: story.versions.map(version => {
      const {comments, ratings} = forVersion(board, story.id, version.number);
      return {
        ...version,
        comments: [
          ...version.comments.map(comment => ({...comment, stars: ratings[comment.id] ?? 0})),
          ...comments.map(comment => ({...comment, stars: ratings[comment.id] ?? comment.stars}))
        ]
      };
    })
  }));
}

export function applyEditorialFeedback(board, input) {
  if (!['comment', 'rate'].includes(input.action)) {
    throw Object.assign(new Error('편집부 원고는 댓글과 별점을 남길 수 있습니다.'), {status: 409});
  }
  const story = byId.get(input.storyId);
  const version = story.versions.find(item => item.number === input.version);
  if (!version) throw Object.assign(new Error('해당 버전이 아직 없습니다.'), {status: 404});

  const current = forVersion(board, story.id, version.number);
  const comments = [
    ...version.comments.map(comment => ({...comment, stars: current.ratings[comment.id] ?? 0})),
    ...current.comments.map(comment => ({...comment, stars: current.ratings[comment.id] ?? comment.stars}))
  ];
  const changed = apply({stories:[{id: story.id, versions:[{number:version.number, comments}]}]}, input);
  if (!changed) return false;
  board.editorialFeedback ??= {};
  board.editorialFeedback[story.id] ??= {};
  const ratings = {...current.ratings};
  if (input.action === 'rate') ratings[input.commentId] = input.stars;
  board.editorialFeedback[story.id][version.number] = {
    comments: comments.filter(comment => !comment.reader),
    ratings
  };
  return true;
}
