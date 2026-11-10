const sceneHeading = /^\[(\d{2}:\d{2})\s*[–—-]\s*(\d{2}:\d{2})\s*·\s*([^\]\r\n]+)\][ \t]*$/gm;

export function splitScenes(body) {
  const headings = [...body.matchAll(sceneHeading)];
  return {
    intro: body.slice(0, headings[0]?.index ?? body.length).trim(),
    scenes: headings.map((heading, index) => ({
      number: index + 1,
      time: heading[1] + '–' + heading[2],
      title: heading[3].trim(),
      body: body.slice(heading.index + heading[0].length, headings[index + 1]?.index ?? body.length).trim()
    }))
  };
}

export function validIllustrationSource(src, storyId) {
  if (!/^[a-z0-9-]+$/.test(storyId)) return false;
  const prefix = '/illustrations/' + storyId + '/v2/';
  return typeof src === 'string' && src.startsWith(prefix) &&
    /^[a-z0-9-]+\.(?:webp|jpe?g|png)$/.test(src.slice(prefix.length));
}

export function validateIllustrations(storyId, version) {
  const art = version.illustrations;
  if (version.number !== 2 || !art || !Array.isArray(art.characters) || !Array.isArray(art.scenes)) {
    throw new Error('Ver.2의 등장인물·씬 삽화 목록이 필요합니다.');
  }
  const text = value => typeof value === 'string' && value.trim().length > 0;
  if (!['medium','palette','composition'].every(field => text(art.style?.[field]))) {
    throw new Error('매체, 팔레트, 구도 기록이 필요합니다.');
  }
  const {scenes} = splitScenes(version.body);
  if (!scenes.length || art.scenes.length !== scenes.length ||
    scenes.some(({number, body}) => !body || art.scenes.filter(item => item?.scene === number).length !== 1)) {
    throw new Error('본문의 시간표시 씬마다 대표 삽화가 정확히 한 장 필요합니다.');
  }
  if (!art.characters.length || art.characters.some(item => !text(item?.name)) ||
    new Set(art.characters.map(item => item.name.trim())).size !== art.characters.length) {
    throw new Error('서로 다른 등장인물별 삽화가 필요합니다.');
  }
  const images = [...art.characters, ...art.scenes];
  if (images.some(item => !validIllustrationSource(item?.src, storyId) || !text(item?.alt)) ||
    new Set(images.map(item => item.src)).size !== images.length) {
    throw new Error('각 삽화의 별도 이미지 경로와 대체 텍스트가 필요합니다.');
  }
  return images;
}
