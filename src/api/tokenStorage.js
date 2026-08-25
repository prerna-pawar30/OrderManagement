const TOKEN_KEY = "digident_token";

// The backend rejects requests with AUTH_HEADER_MISSING unless an
// `Authorization: Bearer <token>` header is present, so the access token
// returned by /employee/login (and refreshed by /employee/refresh-token)
// has to be captured and re-attached on every request — cookies alone
// aren't enough here.
export const tokenStorage = {
  get: () => sessionStorage.getItem(TOKEN_KEY),
  set: (token) => {
    if (token) sessionStorage.setItem(TOKEN_KEY, token);
  },
  clear: () => sessionStorage.removeItem(TOKEN_KEY),
};

// Login/refresh responses may name the field differently depending on the
// exact controller implementation — check whichever of these actually comes
// back and trim this list once you know the real key.
export function extractToken(responseData) {
  const d = responseData?.data || responseData || {};
  return (
    d.token ||
    d.accessToken ||
    d.access_token ||
    d.jwt ||
    d.authToken ||
    d.employee?.token ||
    null
  );
}
