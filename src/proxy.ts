const HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET',
  'Access-Control-Allow-Headers': '*',
};

const handle = async (request: Request): Promise<Response> => {
  const url = new URL(request.url).searchParams.get('url');

  if (!url) {
    return new Response('Missing url parameter', { status: 400 });
  }

  const remoteUrl = new URL(url);
  const remoteRequest = new Request(remoteUrl, request);
  remoteRequest.headers.set('Origin', remoteUrl.origin);

  const remoteResponse = await fetch(remoteRequest);
  const response = new Response(remoteResponse.body, remoteResponse);

  Object.entries(HEADERS).forEach(([key, value]) => {
    response.headers.set(key, value);
  });

  return response;
};

export default {
  fetch: handle,
};
