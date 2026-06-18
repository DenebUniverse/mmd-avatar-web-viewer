export function normalizeAssetPath(path) {
  if (!path) return '';
  if (/^(https?:)?\/\//.test(path)) return path;
  let value = path.startsWith('/') || path.startsWith('./') ? path : `/${path}`;
  value = value.replace(/^\/models\//, '/assets/models/');
  value = value.replace(/^\/motions\//, '/assets/motions/');
  value = value.replace(/^\/poses\//, '/assets/poses/');
  return value;
}
