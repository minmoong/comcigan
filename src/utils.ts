import fetch from 'node-fetch';

async function fetchAndCheck(url: string) {
  const res = await fetch(url);

  if (!res.ok) {
    throw new Error(`${res.url}: fetch HTTP 요청에 실패하였습니다. status: ${res.status}`);
  }

  return res;
}

export { fetchAndCheck };