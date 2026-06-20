// CloudFront Function: preview-spa-rewrite
// Attach to the preview CloudFront distribution as a "Viewer Request" function.
//
// Handles SPA routing for preview deployments under /pr-{number}/ prefixes.
// - /pr-42/                    → /pr-42/index.html
// - /pr-42/dashboard           → /pr-42/index.html
// - /pr-42/settings/profile    → /pr-42/index.html
// - /pr-42/assets/main.js      → /pr-42/assets/main.js  (passthrough, has extension)

function handler(event) {
  var request = event.request;
  var uri = request.uri;

  // Match /pr-{number}/ prefix
  var match = uri.match(/^(\/pr-\d+)\//);

  if (match) {
    var prefix = match[1];

    // If URI has no file extension, it's a client-side route → serve index.html
    var hasExtension = uri.split('/').pop().includes('.');
    if (!hasExtension) {
      request.uri = prefix + '/index.html';
    }
  } else if (uri === '/' || uri === '') {
    // Root request — optionally serve a landing/listing page
    request.uri = '/index.html';
  }

  return request;
}
