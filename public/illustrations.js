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

export function validIllustrationSource(src, storyId, version = 2) {
  if (!/^[a-z0-9-]+$/.test(storyId) || typeof src !== 'string') return false;
  const prefix = '/illustrations/' + storyId + '/';
  if (!src.startsWith(prefix)) return false;
  const path = src.slice(prefix.length);
  const asset = /^v([23])\/[a-z0-9-]+\.(?:webp|jpe?g|png)$/.exec(path);
  return Boolean(asset && (Number(asset[1]) === version || (version === 3 && asset[1] === '2')));
}

export function validateIllustrations(storyId, version, requireTwo = false) {
  const art = version.illustrations;
  if (![2,3].includes(version.number) || !art || !Array.isArray(art.characters) || !Array.isArray(art.scenes)) {
    throw new Error('Ver.2 또는 Ver.3의 등장인물·씬 삽화 목록이 필요합니다.');
  }
  const text = value => typeof value === 'string' && value.trim().length > 0;
  if (!['medium','palette','composition'].every(field => text(art.style?.[field]))) {
    throw new Error('매체, 팔레트, 구도 기록이 필요합니다.');
  }
  const {scenes} = splitScenes(version.body);
  if (!scenes.length || scenes.some(scene => !scene.body) ||
    art.scenes.some(item => !Number.isInteger(item?.scene) || item.scene < 1 || item.scene > scenes.length)) {
    throw new Error('모든 삽화는 본문이 있는 시간표시 씬에 연결되어야 합니다.');
  }
  const frameCounts = scenes.map(({number}) => art.scenes.filter(item => item.scene === number).length);
  if (version.number === 3) {
    if (frameCounts.some(count => count < 2 || count > 4)) {
      throw new Error('Ver.3의 각 씬에는 삽화가 두 장에서 네 장 필요합니다.');
    }
  } else {
    const framesPerScene = requireTwo ? 2 : frameCounts[0];
    if (![1,2].includes(framesPerScene) || frameCounts.some(count => count !== framesPerScene)) {
      throw new Error(requireTwo
        ? '본문의 시간표시 씬마다 대표 삽화가 정확히 두 장 필요합니다.'
        : '모든 씬에 대표 삽화가 동일한 수로 한 장 또는 두 장 필요합니다.');
    }
  }
  if (!art.characters.length || art.characters.some(item => !text(item?.name)) ||
    new Set(art.characters.map(item => item.name.trim())).size !== art.characters.length) {
    throw new Error('서로 다른 등장인물별 삽화가 필요합니다.');
  }
  const images = [...art.characters, ...art.scenes];
  if (images.some(item => !validIllustrationSource(item?.src, storyId, version.number) || !text(item?.alt)) ||
    new Set(images.map(item => item.src)).size !== images.length) {
    throw new Error('각 삽화의 별도 이미지 경로와 대체 텍스트가 필요합니다.');
  }
  return images;
}
